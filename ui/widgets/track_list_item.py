"""
Track List Item Widget - Displays song information in a list
"""
from kivy.uix.behaviors import ButtonBehavior
from kivy.properties import (
    DictProperty, StringProperty, NumericProperty, 
    BooleanProperty, ObjectProperty
)
from kivymd.uix.list import TwoLineAvatarIconListItem, IconLeftWidget
from kivymd.uix.button import MDIconButton

from libs.utils import format_time

class TrackNumberIcon(IconLeftWidget):
    """Custom left widget to display track number"""
    track_number = NumericProperty(0)

class PlayButton(MDIconButton):
    """Play button for the track list item"""
    pass

class TrackListItem(TwoLineAvatarIconListItem):
    """
    List item displaying track information with 
    track number, title, artist, and duration
    """
    track = DictProperty({})
    track_number = NumericProperty(0)
    track_title = StringProperty("")
    track_artist = StringProperty("")
    track_duration = StringProperty("")
    is_playing = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(TrackListItem, self).__init__(**kwargs)
        
        # Process track data after initialization
        self._process_track_data()
        
        # Create track number icon
        self.track_icon = TrackNumberIcon(icon="music-note")
        self.track_icon.track_number = self.track_number
        self.add_widget(self.track_icon)
        
        # Create play button
        self.play_button = PlayButton(
            icon="play",
            on_release=self.play_track
        )
        self.add_widget(self.play_button)
        
        # Register for updates from player
        app = self.get_app()
        app.player.bind(
            current_track=self.update_playing_state,
            playing=self.update_playing_state
        )
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def _process_track_data(self):
        """Process track data"""
        track = self.track
        if not track:
            return
            
        # Set track title
        self.track_title = track.get('Name', 'Unknown Track')
        
        # Set track artist
        if 'Artists' in track and track['Artists']:
            self.track_artist = track['Artists'][0]
        elif 'AlbumArtist' in track:
            self.track_artist = track['AlbumArtist']
        else:
            self.track_artist = 'Unknown Artist'
        
        # Set track number
        if 'IndexNumber' in track:
            self.track_number = track['IndexNumber']
        
        # Set track duration
        if 'RunTimeTicks' in track:
            # Convert ticks to seconds (1 tick = 100 nanoseconds)
            seconds = track['RunTimeTicks'] / 10000000
            self.track_duration = format_time(seconds)
        else:
            self.track_duration = "00:00"
            
        # Update secondary text
        self.secondary_text = f"{self.track_artist} • {self.track_duration}"
    
    def update_playing_state(self, *args):
        """Update playing state based on current player state"""
        app = self.get_app()
        
        # Check if this track is the current track
        current_track = app.player.current_track
        if current_track and current_track.get('Id') == self.track.get('Id'):
            self.is_playing = app.player.playing
            self.play_button.icon = "pause" if self.is_playing else "play"
        else:
            self.is_playing = False
            self.play_button.icon = "play"
    
    def play_track(self, *args):
        """Play this track"""
        app = self.get_app()
        
        # Check if this track is already playing
        current_track = app.player.current_track
        if current_track and current_track.get('Id') == self.track.get('Id'):
            # Toggle play/pause
            if app.player.playing:
                app.player.pause()
            else:
                app.player.play()
        else:
            # Find parent screen to access full track list
            screen = self.get_screen()
            if hasattr(screen, 'play_song'):
                # Find the index of this track in the album songs
                for i, track in enumerate(screen.album_songs):
                    if track.get('Id') == self.track.get('Id'):
                        screen.play_song(i)
                        break
    
    def get_screen(self):
        """Get the parent screen"""
        # Traverse widget tree to find Screen
        parent = self.parent
        while parent:
            if hasattr(parent, 'name') and hasattr(parent, 'manager'):
                return parent
            parent = parent.parent
        return None