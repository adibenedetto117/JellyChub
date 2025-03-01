"""
Music Screen for Jellyfin Client
Displays music libraries and recent albums
"""
import json
from kivy.uix.screenmanager import Screen
from kivy.properties import ListProperty, BooleanProperty, NumericProperty
from kivymd.uix.list import MDList, OneLineAvatarIconListItem, IconLeftWidget
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton
from kivy.clock import Clock

class MusicScreen(Screen):
    """
    Main music screen for browsing libraries, 
    recent albums, and featured content
    """
    libraries = ListProperty([])
    loading = BooleanProperty(False)
    recent_albums = ListProperty([])
    recent_limit = NumericProperty(10)
    
    def __init__(self, **kwargs):
        super(MusicScreen, self).__init__(**kwargs)
        self.dialog = None
    
    def on_enter(self):
        """Called when screen is entered"""
        print("MusicScreen: Entering screen")
        
        # Verify app and current user
        app = self.get_app()
        print(f"MusicScreen: Current user data: {app.current_user}")
        print(f"MusicScreen: Current user name: {app.current_user.get('User', {}).get('Name')}")
        print(f"MusicScreen: Auth token: {app.auth_token}")
        
        # Load recent albums when screen is shown
        if not self.recent_albums and not self.loading:
            print("MusicScreen: Loading recent music")
            self.load_recent_music()
        else:
            print("MusicScreen: Skipping music load - albums exist or loading")
            
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def set_libraries(self, libraries):
        """Set available music libraries"""
        print(f"MusicScreen: Setting libraries - Total: {len(libraries)} libraries")
        
        # Detailed library logging
        for lib in libraries:
            print(f"Library Details:")
            for key, value in lib.items():
                print(f"  {key}: {value}")
        
        # Filter only music libraries
        music_libraries = [lib for lib in libraries if lib.get('CollectionType') == 'music']
        
        print(f"MusicScreen: Found {len(music_libraries)} music libraries")
        
        # Fallback to all libraries if no music libraries found
        if not music_libraries:
            print("MusicScreen: No specific music libraries found. Using all libraries.")
            music_libraries = libraries
        
        self.libraries = music_libraries
        
        # Update UI on main thread
        Clock.schedule_once(self.update_libraries_list, 0)
        
        # Try to load recent music or all albums if no libraries found
        if music_libraries:
            print("MusicScreen: Loading recent music from libraries")
            self.load_recent_music()
        else:
            print("MusicScreen: No libraries found - attempting to load all albums")
            self.load_all_albums()

    def load_all_albums(self):
        """Load albums when no libraries are found"""
        print("MusicScreen: Attempting to load ALL albums")
        app = self.get_app()
        
        app.api.get_albums(
            limit=50,  # Adjust as needed
            offset=0,
            success_callback=self.on_recent_albums_loaded,
            error_callback=self.on_load_error
        )
    
    def update_libraries_list(self, dt=None):
        """Update the libraries list widget"""
        print(f"MusicScreen: Updating libraries list - {len(self.libraries)} libraries")
        
        try:
            libraries_list = self.ids.libraries_list
            libraries_list.clear_widgets()
            
            if not self.libraries:
                print("MusicScreen: No libraries to display")
                return
                
            print(f"MusicScreen: Adding {len(self.libraries)} libraries to UI")
            
            for library in self.libraries:
                lib_name = library.get('Name', 'Unknown Library')
                lib_id = library.get('Id', 'No ID')
                print(f"MusicScreen: Adding library - Name: {lib_name}, ID: {lib_id}")
                
                item = OneLineAvatarIconListItem(
                    text=lib_name,
                    on_release=lambda x, lib=library: self.open_library(lib)
                )
                icon = IconLeftWidget(icon="music-box-multiple")
                item.add_widget(icon)
                libraries_list.add_widget(item)
        except Exception as e:
            print(f"MusicScreen: ERROR updating libraries list: {str(e)}")
    
    def open_library(self, library):
        """Open a specific library"""
        print(f"MusicScreen: Opening library - {library.get('Name', 'Unknown')}")
        
        # Get parent screens
        app = self.get_app()
        home_screen = app.root
        
        # Navigate to albums screen with this library
        albums_screen = home_screen.screen_manager.get_screen("albums")
        albums_screen.set_parent_id(library.get('Id'))
        home_screen.navigate_to("albums")
    
    def load_recent_music(self):
        """Load recently added music"""
        print("MusicScreen: Loading recent music")
        self.loading = True
        app = self.get_app()
        
        # Get recent albums
        app.api.get_albums(
            limit=self.recent_limit,
            offset=0,
            success_callback=self.on_recent_albums_loaded,
            error_callback=self.on_load_error
        )
    
    def on_recent_albums_loaded(self, response):
        """Handle loaded recent albums"""
        self.loading = False
        
        print(f"MusicScreen: Recent albums response: {json.dumps(response, indent=2)}")
        
        if response and 'Items' in response:
            self.recent_albums = response['Items']
            # Cache this data
            app = self.get_app()
            app.cache_manager.cache_metadata('recent_albums', response)
            
            # Update the UI on main thread
            Clock.schedule_once(self.update_recent_albums, 0)
        else:
            print("MusicScreen: No recent albums found or invalid response")
    
    def update_recent_albums(self, dt=None):
        """Update recent albums in the UI"""
        print(f"MusicScreen: Updating recent albums - {len(self.recent_albums)} albums")
        
        recent_grid = self.ids.recent_albums_grid
        recent_grid.clear_widgets()
        
        for album in self.recent_albums:
            from ui.widgets.album_card import AlbumCard
            card = AlbumCard(album=album)
            recent_grid.add_widget(card)
    
    def on_load_error(self, error_message):
        """Handle error loading data"""
        self.loading = False
        print(f"MusicScreen: Error loading music: {error_message}")
        self.show_error(f"Error loading music: {error_message}")
    
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
    
    def refresh(self):
        """Refresh data"""
        print("MusicScreen: Refreshing data")
        self.load_recent_music()