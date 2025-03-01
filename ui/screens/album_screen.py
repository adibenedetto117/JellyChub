"""
Album Screen for Jellyfin Client
Displays albums and album details
"""
from kivy.uix.screenmanager import Screen, ScreenManager
from kivy.properties import (
    ListProperty, BooleanProperty, NumericProperty, 
    StringProperty, ObjectProperty, DictProperty
)
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivy.clock import Clock

class AlbumScreen(Screen):
    """
    Screen for browsing albums and viewing album details
    """
    albums = ListProperty([])
    loading = BooleanProperty(False)
    limit = NumericProperty(20)  # Number of albums per page
    offset = NumericProperty(0)  # Starting index for pagination
    total_albums = NumericProperty(0)  # Total number of albums
    parent_id = StringProperty("")  # Library/folder ID
    artist_id = StringProperty("")  # Artist ID for filtering
    
    # Detail view properties
    detail_view = BooleanProperty(False)
    current_album = DictProperty({})
    album_songs = ListProperty([])
    loading_songs = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(AlbumScreen, self).__init__(**kwargs)
        self.dialog = None
    
    def on_enter(self):
        """Called when screen is entered"""
        # Load albums if empty
        if (not self.albums or self.parent_id or self.artist_id) and not self.loading:
            self.load_albums()
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def set_parent_id(self, parent_id):
        """Set parent library/folder ID and reload"""
        if self.parent_id != parent_id:
            self.parent_id = parent_id
            self.artist_id = ""
            self.offset = 0
            self.albums = []
            self.load_albums()
    
    def set_artist_id(self, artist_id):
        """Set artist ID for filtering and reload"""
        if self.artist_id != artist_id:
            self.artist_id = artist_id
            self.parent_id = ""
            self.offset = 0
            self.albums = []
            self.load_albums()
    
    def load_albums(self):
        """Load albums from API"""
        self.loading = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"albums_{self.parent_id}_{self.artist_id}_{self.offset}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_albums_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_albums(
            parent_id=self.parent_id if self.parent_id else None,
            artist_id=self.artist_id if self.artist_id else None,
            limit=self.limit,
            offset=self.offset,
            success_callback=lambda response: self.on_albums_loaded(response, cache_key),
            error_callback=self.on_load_error
        )
    
    def on_albums_loaded(self, response, cache_key=None):
        """Handle loaded albums"""
        self.loading = False
        
        if response and 'Items' in response:
            # If this is a fresh load (offset=0), clear existing data
            if self.offset == 0:
                self.albums = []
                
            # Append new albums
            self.albums.extend(response['Items'])
            self.total_albums = response.get('TotalRecordCount', len(self.albums))
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
            
            # Update the UI
            Clock.schedule_once(self.update_albums_grid, 0)
    
    def update_albums_grid(self, dt):
        """Update albums in the grid"""
        if self.detail_view:
            return
            
        albums_grid = self.ids.albums_grid
        albums_grid.clear_widgets()
        
        for album in self.albums:
            from ui.widgets.album_card import AlbumCard
            card = AlbumCard(album=album)
            albums_grid.add_widget(card)
    
    def on_load_error(self, error_message):
        """Handle error loading data"""
        self.loading = False
        self.show_error(f"Error loading albums: {error_message}")
    
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
        """Load more albums (pagination)"""
        if self.loading or self.albums and len(self.albums) >= self.total_albums:
            return
            
        self.offset += self.limit
        self.load_albums()
    
    def refresh(self):
        """Refresh data"""
        self.offset = 0
        self.load_albums()
    
    # Album Detail View Methods
    
    def show_album_detail(self, album):
        """Show album detail view"""
        self.current_album = album
        self.detail_view = True
        self.load_album_songs()
    
    def close_detail_view(self):
        """Close detail view and return to grid"""
        self.detail_view = False
        
        # Update albums grid when returning
        Clock.schedule_once(self.update_albums_grid, 0)
    
    def load_album_songs(self):
        """Load songs for the current album"""
        if not self.current_album or not self.current_album.get('Id'):
            return
            
        self.loading_songs = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"album_songs_{self.current_album['Id']}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_songs_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_songs(
            album_id=self.current_album['Id'],
            success_callback=lambda response: self.on_songs_loaded(response, cache_key),
            error_callback=self.on_songs_error
        )
    
    def on_songs_loaded(self, response, cache_key=None):
        """Handle loaded songs"""
        self.loading_songs = False
        
        if response and 'Items' in response:
            self.album_songs = response['Items']
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
                
            # Update the songs list
            self.update_songs_list()
    
    def on_songs_error(self, error_message):
        """Handle error loading songs"""
        self.loading_songs = False
        self.show_error(f"Error loading songs: {error_message}")
    
    def play_album(self):
        """Play all songs in the album"""
        if not self.album_songs:
            return
            
        app = self.get_app()
        app.player.set_playlist(self.album_songs, start_index=0)
        
        # Navigate to player screen
        home_screen = app.root
        home_screen.navigate_to("player")
    
    def play_song(self, song_index):
        """Play a specific song from the album"""
        if not self.album_songs or song_index >= len(self.album_songs):
            return
            
        app = self.get_app()
        app.player.set_playlist(self.album_songs, start_index=song_index)
        
        # Navigate to player screen
        home_screen = app.root
        home_screen.navigate_to("player")
        
    def update_songs_list(self):
        """Update the songs list with track items"""
        songs_list = self.ids.songs_list
        songs_list.clear_widgets()
        
        for song in self.album_songs:
            from ui.widgets.track_list_item import TrackListItem
            item = TrackListItem(track=song)
            songs_list.add_widget(item)