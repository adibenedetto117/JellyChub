"""
Jellyfin Music App - Main Application Configuration
"""
import os
import logging
from kivymd.app import MDApp
from kivy.lang import Builder
from kivy.core.window import Window
from kivy.properties import StringProperty, ObjectProperty
from kivy.storage.jsonstore import JsonStore

from libs.api import JellyfinAPI
from libs.auth import AuthManager
from libs.cache_manager import CacheManager
from libs.player import MusicPlayer

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set window size for development
Window.size = (400, 700)

class JellyfinApp(MDApp):
    """Main Jellyfin Music Client Application"""
    
    auth_token = StringProperty("")
    current_user = ObjectProperty(defaultvalue={})
    api = ObjectProperty(None)
    cache_manager = ObjectProperty(None)
    player = ObjectProperty(None)
    
    # Create directories first to ensure they exist
    os.makedirs("cache", exist_ok=True)
    os.makedirs("cache/images", exist_ok=True)
    os.makedirs("cache/audio", exist_ok=True)
    os.makedirs("cache/metadata", exist_ok=True)
    os.makedirs("cache/temp", exist_ok=True)
    
    def build(self):
        """Build the application UI"""
        print("CRITICAL: Building application")
        logging.info("Building Jellyfin Music App")
        
        self.title = "Jellyfin Music"
        self.theme_cls.primary_palette = "Crimson"
        self.theme_cls.theme_style = "Dark"
        
        # Initialize components
        print("CRITICAL: Initializing components")
        logging.info("Initializing app components")
        
        self.settings = JsonStore('settings.json')
        
        print(f"CRITICAL: Settings loaded: {dict(self.settings)}")
        logging.info(f"Settings loaded: {dict(self.settings)}")
        
        self.auth_manager = AuthManager(self)
        self.api = JellyfinAPI(self)
        self.cache_manager = CacheManager()
        self.player = MusicPlayer(self)
        
        # Load all kv files
        print("CRITICAL: Loading KV files")
        logging.info("Loading KV files")
        self.load_kv_files()
        
        # Set initial screen
        print("CRITICAL: Creating login screen")
        logging.info("Creating login screen")
        from ui.screens.login_screen import LoginScreen
        return LoginScreen()
    
    def load_kv_files(self):
        """Load all KV design files"""
        print("CRITICAL: Loading KV files method called")
        logging.info("Loading KV files")
        kv_directory = os.path.join(os.path.dirname(__file__), 'kv')
        
        # Create kv directory if it doesn't exist
        os.makedirs(kv_directory, exist_ok=True)
        
        # Load base.kv first
        base_kv_path = os.path.join(kv_directory, 'base.kv')
        if not os.path.exists(base_kv_path):
            with open(base_kv_path, 'w') as f:
                f.write('#:kivy 2.0.0\n# Base KV file\n')
        Builder.load_file(base_kv_path)
        
        # Load all other KV files
        for kv_file in os.listdir(kv_directory):
            if kv_file.endswith('.kv') and kv_file != 'base.kv':
                print(f"CRITICAL: Loading KV file: {kv_file}")
                Builder.load_file(os.path.join(kv_directory, kv_file))
    
    def on_start(self):
        """Called when the application starts"""
        print("CRITICAL: App starting - checking for saved credentials")
        logging.info("App starting - checking for saved credentials")
        
        # Check for saved credentials
        if self.auth_manager.has_saved_credentials():
            print("CRITICAL: Found saved credentials - attempting auto login")
            logging.info("Found saved credentials - attempting auto login")
            result = self.auth_manager.auto_login()
            print(f"CRITICAL: Auto login result: {result}")
            logging.info(f"Auto login result: {result}")
        else:
            print("CRITICAL: No saved credentials found - showing login screen")
            logging.info("No saved credentials found - showing login screen")
    
    def on_stop(self):
        """Called when the application is closing"""
        # Save any pending cache
        self.cache_manager.write_pending_data()
        # Stop music playback
        self.player.stop()
        
        print("CRITICAL: Application stopping")
        logging.info("Application stopping")
    
    def switch_screen(self, screen_name, **kwargs):
        """Switch to the specified screen"""
        print(f"CRITICAL: Switching to screen: {screen_name}")
        logging.info(f"Switching to screen: {screen_name}")
        self.root.current = screen_name
        
    def logout(self):
        """Log the current user out"""
        print("CRITICAL: Logging out")
        logging.info("Logging out")
        self.auth_manager.logout()
        self.switch_screen('login')