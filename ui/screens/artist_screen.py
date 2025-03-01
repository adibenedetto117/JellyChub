"""
Artist Screen for Jellyfin Client
Displays artists and artist details
"""
from kivy.uix.screenmanager import Screen
from kivy.properties import (
    ListProperty, BooleanProperty, NumericProperty, 
    StringProperty, ObjectProperty, DictProperty
)
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivy.clock import Clock

class ArtistScreen(Screen):
    """
    Screen for browsing artists and viewing artist details
    """
    artists = ListProperty([])
    loading = BooleanProperty(False)
    limit = NumericProperty(20)  # Number of artists per page
    offset = NumericProperty(0)  # Starting index for pagination
    total_artists = NumericProperty(0)  # Total number of artists
    parent_id = StringProperty("")  # Library/folder ID
    
    # Detail view properties
    detail_view = BooleanProperty(False)
    current_artist = DictProperty({})
    artist_albums = ListProperty([])
    loading_albums = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(ArtistScreen, self).__init__(**kwargs)
        self.dialog = None
    
    def on_enter(self):
        """Called when screen is entered"""
        # Load artists if empty
        if (not self.artists or self.parent_id) and not self.loading:
            self.load_artists()
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def set_parent_id(self, parent_id):
        """Set parent library/folder ID and reload"""
        if self.parent_id != parent_id:
            self.parent_id = parent_id
            self.offset = 0
            self.artists = []
            self.load_artists()
    
    def load_artists(self):
        """Load artists from API"""
        self.loading = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"artists_{self.parent_id}_{self.offset}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_artists_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_artists(
            parent_id=self.parent_id if self.parent_id else None,
            limit=self.limit,
            offset=self.offset,
            success_callback=lambda response: self.on_artists_loaded(response, cache_key),
            error_callback=self.on_load_error
        )
    
    def on_artists_loaded(self, response, cache_key=None):
        """Handle loaded artists"""
        self.loading = False
        
        if response and 'Items' in response:
            # If this is a fresh load (offset=0), clear existing data
            if self.offset == 0:
                self.artists = []
                
            # Append new artists
            self.artists.extend(response['Items'])
            self.total_artists = response.get('TotalRecordCount', len(self.artists))
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
            
            # Update the UI
            Clock.schedule_once(self.update_artists_list, 0)
    
    def update_artists_list(self, dt):
        """Update artists in the list"""
        if self.detail_view:
            return
            
        artists_list = self.ids.artists_list
        artists_list.clear_widgets()
        
        for artist in self.artists:
            from ui.widgets.artist_card import ArtistCard
            card = ArtistCard(artist=artist)
            artists_list.add_widget(card)
    
    def on_load_error(self, error_message):
        """Handle error loading data"""
        self.loading = False
        self.show_error(f"Error loading artists: {error_message}")
    
    def show_error(self, message):
        """Show error dialog"""
        if self.dialog:
            self.dialog.dismiss()
            
        self.dialog = MDDialog(
            title="Error",
            text=message,
            buttons=[
                MDFlatButton(
                    text="OK",
                    on_release=lambda x: self.dialog.dismiss()
                )
            ]
        )
        self.dialog.open()
    
    def load_more(self):
        """Load more artists (pagination)"""
        if self.loading or self.artists and len(self.artists) >= self.total_artists:
            return
            
        self.offset += self.limit
        self.load_artists()
    
    def refresh(self):
        """Refresh data"""
        self.offset = 0
        self.load_artists()
    
    # Artist Detail View Methods
    
    def show_artist_detail(self, artist):
        """Show artist detail view"""
        self.current_artist = artist
        self.detail_view = True
        self.load_artist_albums()
    
    def close_detail_view(self):
        """Close detail view and return to list"""
        self.detail_view = False
        
        # Update artists list when returning
        Clock.schedule_once(self.update_artists_list, 0)
    
    def load_artist_albums(self):
        """Load albums for the current artist"""
        if not self.current_artist or not self.current_artist.get('Id'):
            return
            
        self.loading_albums = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"artist_albums_{self.current_artist['Id']}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_albums_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_albums(
            artist_id=self.current_artist['Id'],
            success_callback=lambda response: self.on_albums_loaded(response, cache_key),
            error_callback=self.on_albums_error
        )
    
    def on_albums_loaded(self, response, cache_key=None):
        """Handle loaded albums"""
        self.loading_albums = False
        
        if response and 'Items' in response:
            self.artist_albums = response['Items']
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
            
            # Update the albums grid
            self.update_albums_grid()
    
    def update_albums_grid(self):
        """Update the albums grid with album cards"""
        albums_grid = self.ids.albums_grid
        albums_grid.clear_widgets()
        
        for album in self.artist_albums:
            from ui.widgets.album_card import AlbumCard
            card = AlbumCard(album=album)
            albums_grid.add_widget(card)
    
    def on_albums_error(self, error_message):
        """Handle error loading albums"""
        self.loading_albums = False
        self.show_error(f"Error loading albums: {error_message}")