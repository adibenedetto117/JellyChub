import json
from kivy.uix.screenmanager import Screen, ScreenManager
from kivy.properties import ObjectProperty, StringProperty, BooleanProperty
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivy.clock import Clock

from ui.screens.music_screen import MusicScreen
from ui.screens.artist_screen import ArtistScreen
from ui.screens.album_screen import AlbumScreen
from ui.screens.playlist_screen import PlaylistScreen
from ui.screens.player_screen import PlayerScreen
from ui.screens.settings_screen import SettingsScreen

class HomeScreen(Screen):
    """Main navigation screen for the app"""
    
    screen_manager = ObjectProperty(None)
    current_user_name = StringProperty("")
    loading = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(HomeScreen, self).__init__(**kwargs)
        self.name = "home"
        self.dialog = None
        
    def on_enter(self):
        """Called when screen is entered"""
        app = self.get_app()
        
        # Set current user name
        if app.current_user and app.current_user.get('User', {}).get('Name'):
            self.current_user_name = app.current_user['User']['Name']
        
        # Set up screen manager if not already done
        if not self.screen_manager:
            self.setup_screen_manager()
            
        # Wait for widget to be added to the tree before loading data
        Clock.schedule_once(self.load_initial_data, 0.5)
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def setup_screen_manager(self):
        """Set up the nested screen manager for content"""
        print("Setting up screen manager")
        # Add all content screens
        self.screen_manager = ScreenManager()
        self.screen_manager.add_widget(MusicScreen(name="music"))
        self.screen_manager.add_widget(ArtistScreen(name="artists"))
        self.screen_manager.add_widget(AlbumScreen(name="albums"))
        self.screen_manager.add_widget(PlaylistScreen(name="playlists"))
        self.screen_manager.add_widget(PlayerScreen(name="player"))
        self.screen_manager.add_widget(SettingsScreen(name="settings"))
        
        # Set initial screen
        self.screen_manager.current = "music"
        
        try:
            # Add screen manager to the content area
            content_area = self.ids.content_area
            content_area.clear_widgets()
            content_area.add_widget(self.screen_manager)
            print("Screen manager setup complete")
        except Exception as e:
            print(f"ERROR setting up screen manager: {str(e)}")
    
    def load_initial_data(self, dt):
        """Load initial data for the app"""
        # Load music libraries
        self.loading = True
        app = self.get_app()
        
        print(f"Loading initial data for user: {app.current_user}")
        print(f"Auth token: {app.auth_token}")
        
        app.api.get_music_libraries(
            success_callback=self.on_libraries_loaded,
            error_callback=self.on_libraries_error
        )
    
    def on_libraries_loaded(self, libraries):
        """Handle loaded music libraries"""
        self.loading = False
        
        print(f"Libraries loaded: {json.dumps(libraries, indent=2)}")
        
        # Notify music screen of loaded libraries
        music_screen = self.screen_manager.get_screen("music")
        music_screen.set_libraries(libraries)
    
    def on_libraries_error(self, error_message):
        """Handle error loading libraries"""
        self.loading = False
        print(f"Error loading libraries: {error_message}")
        self.show_error(f"Error loading libraries: {error_message}")
    
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
    
    def navigate_to(self, screen_name):
        """Navigate to a specific screen"""
        if self.screen_manager:
            self.screen_manager.current = screen_name
    
    def show_now_playing(self):
        """Show the now playing screen"""
        app = self.get_app()
        if app.player.current_track:
            self.navigate_to("player")
    
    def logout(self):
        """Log out from the app"""
        app = self.get_app()
        app.logout()