"""
Artist Card Widget - Displays an artist with artwork
"""
from kivy.uix.behaviors import ButtonBehavior
from kivy.properties import DictProperty, StringProperty, ObjectProperty, BooleanProperty
from kivy.clock import Clock
from kivymd.uix.card import MDCard

class ArtistCard(ButtonBehavior, MDCard):
    """
    Card widget displaying an artist with artwork
    """
    artist = DictProperty({})
    artist_image = StringProperty("")
    artist_name = StringProperty("")
    loading_image = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(ArtistCard, self).__init__(**kwargs)
        self.size_hint_y = None
        self.height = self.width * 1.0  # Square aspect ratio for artist cards
        self.radius = [4,]
        self.ripple_behavior = True
        self.elevation = 1
        
        # Process artist data after initialization
        Clock.schedule_once(self.process_artist_data, 0)
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def process_artist_data(self, dt):
        """Process artist data and load images"""
        artist = self.artist
        if not artist:
            return
            
        # Set basic info
        self.artist_name = artist.get('Name', 'Unknown Artist')
        
        # Load artist image
        self.load_artist_image()
    
    def load_artist_image(self):
        """Load artist artwork"""
        app = self.get_app()
        artist_id = self.artist.get('Id')
        
        if not artist_id:
            return
            
        # Create image URL
        image_url = app.api.get_image_url(artist_id, "Primary", 300, 300)
        
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
            self.artist_image = local_path
    
    def on_release(self):
        """Handle card being clicked/tapped"""
        # Open artist detail screen
        app = self.get_app()
        home_screen = app.root
        
        artists_screen = home_screen.screen_manager.get_screen("artists")
        artists_screen.show_artist_detail(self.artist)