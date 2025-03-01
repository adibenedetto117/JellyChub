"""
Album Card Widget - Displays an album with artwork and metadata
"""
from kivy.uix.behaviors import ButtonBehavior
from kivy.properties import DictProperty, StringProperty, ObjectProperty, BooleanProperty
from kivy.clock import Clock
from kivymd.uix.card import MDCard

class AlbumCard(ButtonBehavior, MDCard):
    """
    Card widget displaying an album with artwork
    """
    album = DictProperty({})
    album_art = StringProperty("")
    album_title = StringProperty("")
    album_artist = StringProperty("")
    loading_image = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(AlbumCard, self).__init__(**kwargs)
        self.size_hint_y = None
        self.height = self.width * 1.4  # Aspect ratio for the card
        self.radius = [4,]
        self.ripple_behavior = True
        self.elevation = 1
        
        # Process album data after initialization
        Clock.schedule_once(self.process_album_data, 0)
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def process_album_data(self, dt):
        """Process album data and load images"""
        album = self.album
        if not album:
            return
            
        # Set basic info
        self.album_title = album.get('Name', 'Unknown Album')
        
        # Get artist info
        if 'AlbumArtist' in album:
            self.album_artist = album['AlbumArtist']
        elif 'Artists' in album and album['Artists']:
            self.album_artist = album['Artists'][0]
        else:
            self.album_artist = 'Unknown Artist'
        
        # Load album art
        self.load_album_art()
    
    def load_album_art(self):
        """Load album artwork"""
        app = self.get_app()
        album_id = self.album.get('Id')
        
        if not album_id:
            return
            
        # Create image URL
        image_url = app.api.get_image_url(album_id, "Primary", 300, 300)
        
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
    
    def on_release(self):
        """Handle card being clicked/tapped"""
        # Open album detail screen
        app = self.get_app()
        home_screen = app.root
        
        albums_screen = home_screen.screen_manager.get_screen("albums")
        albums_screen.show_album_detail(self.album)