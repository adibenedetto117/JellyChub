"""
Playlist Screen for Jellyfin Client
Displays playlists and playlist details
"""
from kivy.uix.screenmanager import Screen
from kivy.properties import (
    ListProperty, BooleanProperty, NumericProperty, 
    StringProperty, ObjectProperty, DictProperty
)
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivymd.uix.list import OneLineAvatarIconListItem, IconLeftWidget
from kivy.clock import Clock

class PlaylistScreen(Screen):
    """
    Screen for browsing playlists and viewing playlist details
    """
    playlists = ListProperty([])
    loading = BooleanProperty(False)
    limit = NumericProperty(20)  # Number of playlists per page
    offset = NumericProperty(0)  # Starting index for pagination
    total_playlists = NumericProperty(0)  # Total number of playlists
    
    # Detail view properties
    detail_view = BooleanProperty(False)
    current_playlist = DictProperty({})
    playlist_items = ListProperty([])
    loading_items = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(PlaylistScreen, self).__init__(**kwargs)
        self.dialog = None
    
    def on_enter(self):
        """Called when screen is entered"""
        # Load playlists if empty
        if not self.playlists and not self.loading:
            self.load_playlists()
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def load_playlists(self):
        """Load playlists from API"""
        self.loading = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"playlists_{self.offset}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_playlists_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_playlists(
            limit=self.limit,
            offset=self.offset,
            success_callback=lambda response: self.on_playlists_loaded(response, cache_key),
            error_callback=self.on_load_error
        )
    
    def on_playlists_loaded(self, response, cache_key=None):
        """Handle loaded playlists"""
        self.loading = False
        
        if response and 'Items' in response:
            # If this is a fresh load (offset=0), clear existing data
            if self.offset == 0:
                self.playlists = []
                
            # Append new playlists
            self.playlists.extend(response['Items'])
            self.total_playlists = response.get('TotalRecordCount', len(self.playlists))
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
            
            # Update the UI
            Clock.schedule_once(self.update_playlists_list, 0)
    
    def update_playlists_list(self, dt):
        """Update playlists in the list"""
        if self.detail_view:
            return
            
        playlists_list = self.ids.playlists_list
        playlists_list.clear_widgets()
        
        for playlist in self.playlists:
            item = OneLineAvatarIconListItem(
                text=playlist.get('Name', 'Unknown Playlist'),
                on_release=lambda x, p=playlist: self.show_playlist_detail(p)
            )
            icon = IconLeftWidget(icon="playlist-music")
            item.add_widget(icon)
            playlists_list.add_widget(item)
    
    def on_load_error(self, error_message):
        """Handle error loading data"""
        self.loading = False
        self.show_error(f"Error loading playlists: {error_message}")
    
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
        """Load more playlists (pagination)"""
        if self.loading or self.playlists and len(self.playlists) >= self.total_playlists:
            return
            
        self.offset += self.limit
        self.load_playlists()
    
    def refresh(self):
        """Refresh data"""
        self.offset = 0
        self.load_playlists()
    
    # Playlist Detail View Methods
    
    def show_playlist_detail(self, playlist):
        """Show playlist detail view"""
        self.current_playlist = playlist
        self.detail_view = True
        self.load_playlist_items()
    
    def close_detail_view(self):
        """Close detail view and return to list"""
        self.detail_view = False
        
        # Update playlists list when returning
        Clock.schedule_once(self.update_playlists_list, 0)
    
    def load_playlist_items(self):
        """Load items for the current playlist"""
        if not self.current_playlist or not self.current_playlist.get('Id'):
            return
            
        self.loading_items = True
        app = self.get_app()
        
        # Build cache key
        cache_key = f"playlist_items_{self.current_playlist['Id']}"
        
        # Try to get from cache
        cached_data = app.cache_manager.get_metadata(cache_key)
        if cached_data:
            self.on_items_loaded(cached_data)
            return
        
        # Load from API
        app.api.get_songs(
            parent_id=self.current_playlist['Id'],
            success_callback=lambda response: self.on_items_loaded(response, cache_key),
            error_callback=self.on_items_error
        )
    
    def on_items_loaded(self, response, cache_key=None):
        """Handle loaded playlist items"""
        self.loading_items = False
        
        if response and 'Items' in response:
            self.playlist_items = response['Items']
            
            # Cache this data if needed
            if cache_key:
                app = self.get_app()
                app.cache_manager.cache_metadata(cache_key, response)
            
            # Update the songs list
            self.update_items_list()
    
    def update_items_list(self):
        """Update the playlist items list"""
        items_list = self.ids.items_list
        items_list.clear_widgets()
        
        for item in self.playlist_items:
            from ui.widgets.track_list_item import TrackListItem
            track_item = TrackListItem(track=item)
            items_list.add_widget(track_item)
    
    def on_items_error(self, error_message):
        """Handle error loading playlist items"""
        self.loading_items = False
        self.show_error(f"Error loading playlist items: {error_message}")
    
    def play_playlist(self):
        """Play all songs in the playlist"""
        if not self.playlist_items:
            return
            
        app = self.get_app()
        app.player.set_playlist(self.playlist_items, start_index=0)
        
        # Navigate to player screen
        home_screen = app.root
        home_screen.navigate_to("player")
    
    def play_item(self, item_index):
        """Play a specific item from the playlist"""
        if not self.playlist_items or item_index >= len(self.playlist_items):
            return
            
        app = self.get_app()
        app.player.set_playlist(self.playlist_items, start_index=item_index)
        
        # Navigate to player screen
        home_screen = app.root
        home_screen.navigate_to("player")