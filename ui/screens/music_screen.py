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
        # Load recent albums when screen is shown
        if not self.recent_albums and not self.loading:
            self.load_recent_music()
            
        print("Entered music screen")
        app = self.get_app()
        print(f"Current user: {app.current_user}")
        print(f"Auth token: {app.auth_token}")
        print(f"Libraries: {self.libraries}")
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def set_libraries(self, libraries):
        """Set available music libraries"""
        print(f"Setting music libraries: {len(libraries)} libraries")
        for lib in libraries:
            print(f"Library: {lib.get('Name')} (ID: {lib.get('Id')})")
        
        self.libraries = libraries
        self.update_libraries_list()
    
    def update_libraries_list(self):
        """Update the libraries list widget"""
        print("Updating libraries list in UI")
        libraries_list = self.ids.libraries_list
        
        try:
            libraries_list.clear_widgets()
            
            if not self.libraries:
                print("No libraries to display")
                return
                
            print(f"Adding {len(self.libraries)} libraries to UI")
            
            for library in self.libraries:
                item = OneLineAvatarIconListItem(
                    text=library.get('Name', 'Unknown Library'),
                    on_release=lambda x, lib=library: self.open_library(lib)
                )
                icon = IconLeftWidget(icon="music-box-multiple")
                item.add_widget(icon)
                libraries_list.add_widget(item)
                print(f"Added library: {library.get('Name')}")
        except Exception as e:
            print(f"ERROR updating libraries list: {str(e)}")
    
    def open_library(self, library):
        """Open a specific library"""
        # Get parent screens
        app = self.get_app()
        home_screen = app.root
        
        # Navigate to albums screen with this library
        albums_screen = home_screen.screen_manager.get_screen("albums")
        albums_screen.set_parent_id(library.get('Id'))
        home_screen.navigate_to("albums")
    
    def load_recent_music(self):
        """Load recently added music"""
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
        
        print(f"Recent albums response: {json.dumps(response, indent=2)}")
        
        if response and 'Items' in response:
            self.recent_albums = response['Items']
            # Cache this data
            app = self.get_app()
            app.cache_manager.cache_metadata('recent_albums', response)
            
            # Update the UI
            self.update_recent_albums()
    
    def update_recent_albums(self):
        """Update recent albums in the UI"""
        recent_grid = self.ids.recent_albums_grid
        recent_grid.clear_widgets()
        
        for album in self.recent_albums:
            from ui.widgets.album_card import AlbumCard
            card = AlbumCard(album=album)
            recent_grid.add_widget(card)
    
    def on_load_error(self, error_message):
        """Handle error loading data"""
        self.loading = False
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
        self.load_recent_music()