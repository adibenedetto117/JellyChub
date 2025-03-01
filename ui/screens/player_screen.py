"""
Player Screen for Jellyfin Client
Full-screen music player with controls
"""
from kivy.uix.screenmanager import Screen
from kivy.properties import (
    StringProperty, NumericProperty, BooleanProperty, 
    ObjectProperty, ListProperty
)
from kivy.clock import Clock

from libs.utils import format_time

class PlayerScreen(Screen):
    """
    Full-screen music player with album art and controls
    """
    # Track information
    track_title = StringProperty("")
    track_artist = StringProperty("")
    track_album = StringProperty("")
    album_art = StringProperty("")
    
    # Playback state
    playing = BooleanProperty(False)
    position = NumericProperty(0)
    duration = NumericProperty(0)
    position_text = StringProperty("00:00")
    duration_text = StringProperty("00:00")
    
    # Player controls
    repeat_mode = StringProperty("off")
    shuffle = BooleanProperty(False)
    volume = NumericProperty(1.0)
    
    # Playlist
    current_playlist = ListProperty([])
    loading_image = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(PlayerScreen, self).__init__(**kwargs)
        self.name = "player"
        self._position_event = None
        
    def on_enter(self):
        """Called when screen is entered"""
        app = self.get_app()
        
        # Bind to player events
        app.player.bind(
            current_track=self.on_track_change,
            playing=self.on_playback_state_change,
            position=self.on_position_change,
            duration=self.on_duration_change,
            repeat_mode=self.on_repeat_mode_change,
            shuffle=self.on_shuffle_change,
            playlist=self.on_playlist_change
        )
        
        # Initialize with current player state
        self.update_from_player()
    
    def on_leave(self):
        """Called when leaving screen"""
        app = self.get_app()
        
        # Unbind from player events
        app.player.unbind(
            current_track=self.on_track_change,
            playing=self.on_playback_state_change,
            position=self.on_position_change,
            duration=self.on_duration_change,
            repeat_mode=self.on_repeat_mode_change,
            shuffle=self.on_shuffle_change,
            playlist=self.on_playlist_change
        )
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def update_from_player(self):
        """Update UI from current player state"""
        app = self.get_app()
        
        # Update track info
        self.on_track_change(app.player, app.player.current_track)
        
        # Update playback state
        self.playing = app.player.playing
        self.position = app.player.position
        self.duration = app.player.duration
        self.position_text = format_time(self.position)
        self.duration_text = format_time(self.duration)
        
        # Update controls
        self.repeat_mode = app.player.repeat_mode
        self.shuffle = app.player.shuffle
        self.volume = app.player.volume
        
        # Update playlist
        self.current_playlist = app.player.playlist
    
    def on_track_change(self, player, track):
        """Handle track change event"""
        if not track:
            return
            
        # Update track info
        self.track_title = track.get('Name', 'Unknown Track')
        
        # Set track artist
        if 'Artists' in track and track['Artists']:
            self.track_artist = track['Artists'][0]
        elif 'AlbumArtist' in track:
            self.track_artist = track['AlbumArtist']
        else:
            self.track_artist = 'Unknown Artist'
        
        # Set album name
        self.track_album = track.get('Album', 'Unknown Album')
        
        # Load album art
        self.load_album_art(track)
    
    def load_album_art(self, track):
        """Load album artwork"""
        app = self.get_app()
        track_id = track.get('Id')
        
        if not track_id:
            return
            
        # Try album ID first
        image_id = track.get('AlbumId', track_id)
            
        # Create image URL
        image_url = app.api.get_image_url(image_id, "Primary", 500, 500)
        
        if not image_url:
            return
            
        # Try to load from cache
        self.loading_image = True
        app.cache_manager.get_image(
            image_url,
            callback=self.on_image_loaded
        )
    
    def on_image_loaded(self, local_path):
        """Handle loaded image"""
        self.loading_image = False
        if local_path:
            self.album_art = local_path
    
    def on_playback_state_change(self, player, playing):
        """Handle playback state change"""
        self.playing = playing
    
    def on_position_change(self, player, position):
        """Handle position change"""
        self.position = position
        self.position_text = format_time(position)
        
        # Update slider if not being dragged
        slider = self.ids.position_slider
        if not slider.dragging:
            if self.duration > 0:
                slider.value = position / self.duration
            else:
                slider.value = 0
    
    def on_duration_change(self, player, duration):
        """Handle duration change"""
        self.duration = duration
        self.duration_text = format_time(duration)
    
    def on_repeat_mode_change(self, player, mode):
        """Handle repeat mode change"""
        self.repeat_mode = mode
    
    def on_shuffle_change(self, player, shuffle):
        """Handle shuffle change"""
        self.shuffle = shuffle
    
    def on_playlist_change(self, player, playlist):
        """Handle playlist change"""
        self.current_playlist = playlist
    
    def play_pause(self):
        """Toggle play/pause"""
        app = self.get_app()
        if app.player.playing:
            app.player.pause()
        else:
            app.player.play()
    
    def previous_track(self):
        """Play previous track"""
        app = self.get_app()
        app.player.previous()
    
    def next_track(self):
        """Play next track"""
        app = self.get_app()
        app.player.next()
    
    def seek(self, value):
        """Seek to position"""
        app = self.get_app()
        position = value * app.player.duration
        app.player.seek(position)
    
    def toggle_repeat(self):
        """Toggle repeat mode"""
        app = self.get_app()
        app.player.toggle_repeat()
    
    def toggle_shuffle(self):
        """Toggle shuffle mode"""
        app = self.get_app()
        app.player.toggle_shuffle()
    
    def set_volume(self, value):
        """Set volume"""
        app = self.get_app()
        app.player.set_volume(value)
    
    def back_to_album(self):
        """Go back to album view if available"""
        app = self.get_app()
        current_track = app.player.current_track
        
        if current_track and current_track.get('AlbumId'):
            home_screen = app.root
            albums_screen = home_screen.screen_manager.get_screen("albums")
            
            # Get album data
            app.api.get_albums(
                album_id=current_track['AlbumId'],
                limit=1,
                success_callback=lambda response: self._show_album(response, albums_screen),
                error_callback=lambda error: self._go_back()
            )
        else:
            self._go_back()
    
    def _show_album(self, response, albums_screen):
        """Show album details"""
        if response and 'Items' in response and response['Items']:
            album = response['Items'][0]
            albums_screen.show_album_detail(album)
            
            # Navigate to albums screen
            home_screen = self.get_app().root
            home_screen.navigate_to("albums")
        else:
            self._go_back()
    
    def _go_back(self):
        """Go back to home screen"""
        home_screen = self.get_app().root
        home_screen.navigate_to("music")