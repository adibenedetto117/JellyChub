"""
Music Player Module
Handles audio playback using Kivy's built-in audio providers
"""
from kivy.core.audio import SoundLoader
from kivy.clock import Clock
from kivy.event import EventDispatcher
from kivy.properties import (
    StringProperty, NumericProperty, BooleanProperty, 
    ObjectProperty, ListProperty, DictProperty
)

class MusicPlayer(EventDispatcher):
    """Handles music playback"""
    
    # Playback state properties
    current_track = DictProperty(None)
    playlist = ListProperty([])
    current_index = NumericProperty(-1)
    playing = BooleanProperty(False)
    position = NumericProperty(0)
    duration = NumericProperty(0)
    volume = NumericProperty(1.0)
    repeat_mode = StringProperty('off')  # off, one, all
    shuffle = BooleanProperty(False)
    
    # Audio source
    sound = ObjectProperty(None, allownone=True)
    
    def __init__(self, app):
        super(MusicPlayer, self).__init__()
        self.app = app
        self.cache_manager = app.cache_manager
        self.api = app.api
        
        # Schedule position updates
        self._update_event = None
        
        # Original playlist for un-shuffle
        self._original_playlist = []
        
        # Register events
        self.register_event_type('on_track_change')
        self.register_event_type('on_playback_state_change')
        self.register_event_type('on_position_change')
    
    def on_track_change(self, *args):
        """Event when track changes"""
        pass
    
    def on_playback_state_change(self, *args):
        """Event when playback state changes"""
        pass
    
    def on_position_change(self, *args):
        """Event when position changes"""
        pass
    
    def _load_track(self, track_data):
        """Load a track"""
        if not track_data or 'Id' not in track_data:
            return False
            
        # Get stream URL from API
        stream_url = self.api.get_stream_url(track_data['Id'])
        
        if not stream_url:
            return False
            
        # Check in cache first
        def on_audio_ready(audio_path):
            # Stop previous audio if playing
            if self.sound:
                self.sound.stop()
                self.sound.unload()
                self.sound = None
                
            # Load the new audio
            if audio_path:
                self.sound = SoundLoader.load(audio_path)
            else:
                # Fall back to streaming URL if not cached
                self.sound = SoundLoader.load(stream_url)
                
            if self.sound:
                self.sound.volume = self.volume
                self.duration = self.sound.length if self.sound.length else 0
                self.current_track = track_data
                self.dispatch('on_track_change')
                return True
            
            return False
        
        # Try to get from cache, will download if not present
        self.cache_manager.get_audio(stream_url, track_data['Id'], on_audio_ready)
        return True
    
    def _update_position(self, dt):
        """Update current playback position"""
        if self.sound and self.playing:
            new_pos = self.sound.get_pos()
            if new_pos != self.position:
                self.position = new_pos
                self.dispatch('on_position_change')
                
            # Check if track has ended
            if self.duration > 0 and self.position >= self.duration - 0.1:
                self._on_track_finished()
    
    def _on_track_finished(self):
        """Handle track completion"""
        if self.repeat_mode == 'one':
            # Repeat the current track
            self.seek(0)
            self.play()
        else:
            # Move to next track
            self.next()
    
    def set_playlist(self, tracks, start_index=0, replace=True):
        """Set the current playlist and start playback"""
        if not tracks:
            return False
            
        if replace:
            self.stop()
            self.playlist = tracks
            self._original_playlist = list(tracks)
            self.current_index = -1
            
            # Apply shuffle if enabled
            if self.shuffle:
                import random
                random.shuffle(self.playlist)
        else:
            # Append to existing playlist
            current_track = self.current_track
            self.playlist.extend(tracks)
            self._original_playlist.extend(tracks)
            
            # Maintain current track
            if current_track:
                for i, track in enumerate(self.playlist):
                    if track.get('Id') == current_track.get('Id'):
                        self.current_index = i
                        break
        
        # Start playback at specified index
        if start_index >= 0 and start_index < len(self.playlist):
            self.play_index(start_index)
            return True
            
        return False
    
    def play_index(self, index):
        """Play track at specified index"""
        if 0 <= index < len(self.playlist):
            self.stop()
            self.current_index = index
            track_data = self.playlist[index]
            
            if self._load_track(track_data):
                self.play()
                return True
                
        return False
    
    def play(self):
        """Play current track"""
        if self.sound:
            self.sound.play()
            self.playing = True
            
            # Start position updates
            if self._update_event is None:
                self._update_event = Clock.schedule_interval(self._update_position, 0.1)
                
            self.dispatch('on_playback_state_change')
            return True
            
        elif self.current_index == -1 and self.playlist:
            # No current track but playlist exists, play first
            return self.play_index(0)
            
        return False
    
    def pause(self):
        """Pause playback"""
        if self.sound and self.playing:
            self.sound.stop()
            self.playing = False
            self.dispatch('on_playback_state_change')
            return True
        return False
    
    def stop(self):
        """Stop playback"""
        if self.sound:
            self.sound.stop()
            self.sound.unload()
            self.sound = None
            self.playing = False
            self.position = 0
            
            # Stop position updates
            if self._update_event:
                self._update_event.cancel()
                self._update_event = None
                
            self.dispatch('on_playback_state_change')
            return True
        return False
    
    def next(self):
        """Play next track"""
        if not self.playlist:
            return False
            
        next_index = self.current_index + 1
        if next_index >= len(self.playlist):
            if self.repeat_mode == 'all':
                # Wrap around to beginning
                next_index = 0
            else:
                # End of playlist
                self.stop()
                return False
                
        return self.play_index(next_index)
    
    def previous(self):
        """Play previous track"""
        if not self.playlist:
            return False
            
        # If position is greater than 3 seconds, restart current song
        if self.position > 3:
            self.seek(0)
            return True
            
        prev_index = self.current_index - 1
        if prev_index < 0:
            if self.repeat_mode == 'all':
                # Wrap around to end
                prev_index = len(self.playlist) - 1
            else:
                # Beginning of playlist
                return False
                
        return self.play_index(prev_index)
    
    def seek(self, position):
        """Seek to specified position in seconds"""
        if self.sound:
            self.sound.seek(position)
            self.position = position
            self.dispatch('on_position_change')
            return True
        return False
    
    def set_volume(self, volume):
        """Set playback volume (0.0 to 1.0)"""
        volume = max(0, min(1, volume))
        self.volume = volume
        if self.sound:
            self.sound.volume = volume
            return True
        return False
    
    def toggle_shuffle(self):
        """Toggle shuffle mode"""
        self.shuffle = not self.shuffle
        
        if self.shuffle:
            # Save current track
            current_track = self.current_track
            
            # Shuffle playlist
            import random
            random.shuffle(self.playlist)
            
            # Find current track in shuffled playlist
            if current_track:
                for i, track in enumerate(self.playlist):
                    if track.get('Id') == current_track.get('Id'):
                        self.current_index = i
                        break
        else:
            # Save current track
            current_track = self.current_track
            
            # Restore original playlist
            self.playlist = list(self._original_playlist)
            
            # Find current track in original playlist
            if current_track:
                for i, track in enumerate(self.playlist):
                    if track.get('Id') == current_track.get('Id'):
                        self.current_index = i
                        break
        
        return self.shuffle
    
    def toggle_repeat(self):
        """Toggle repeat mode (off > all > one > off)"""
        if self.repeat_mode == 'off':
            self.repeat_mode = 'all'
        elif self.repeat_mode == 'all':
            self.repeat_mode = 'one'
        else:
            self.repeat_mode = 'off'
            
        return self.repeat_mode