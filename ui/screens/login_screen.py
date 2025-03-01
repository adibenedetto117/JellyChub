"""
Login Screen for Jellyfin Music Client
"""
from kivy.uix.screenmanager import Screen
from kivy.properties import StringProperty, BooleanProperty
from kivymd.uix.button import MDFlatButton, MDRaisedButton
from kivymd.uix.dialog import MDDialog
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.textfield import MDTextField

class LoginScreen(Screen):
    """Login screen for Jellyfin authentication"""
    
    server_url = StringProperty("")
    username = StringProperty("")
    password = StringProperty("")
    loading = BooleanProperty(False)
    
    def __init__(self, **kwargs):
        super(LoginScreen, self).__init__(**kwargs)
        self.name = "login"
        self.error_dialog = None
        
    def on_enter(self):
        """Called when screen is entered"""
        app = self.get_app()
        # Load last server URL if available
        if app.settings.exists('last_server'):
            self.server_url = app.settings.get('last_server')['url']
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def validate_form(self):
        """Validate login form fields"""
        if not self.server_url:
            self.show_error("Please enter a server URL")
            return False
            
        if not self.username:
            self.show_error("Please enter a username")
            return False
            
        if not self.password:
            self.show_error("Please enter a password")
            return False
            
        # Normalize server URL
        if not self.server_url.startswith(('http://', 'https://')):
            self.server_url = f"https://{self.server_url}"
            
        # Remove trailing slash if present
        if self.server_url.endswith('/'):
            self.server_url = self.server_url[:-1]
            
        return True
    
    def login(self):
        """Handle login button press"""
        if not self.validate_form():
            return
            
        # Show loading indicator
        self.loading = True
        
        # Save server URL for next time
        app = self.get_app()
        app.settings.put('last_server', value={'url': self.server_url})
        
        # Attempt login
        app.auth_manager.login(
            server_url=self.server_url,
            username=self.username,
            password=self.password,
            success_callback=self.on_login_success,
            error_callback=self.on_login_error
        )
    
    def on_login_success(self, user_data):
        """Handle successful login"""
        self.loading = False
        
        # Switch to home screen
        app = self.get_app()
        from ui.screens.home_screen import HomeScreen
        app.root.clear_widgets()
        app.root.add_widget(HomeScreen())
    
    def on_login_error(self, error_message):
        """Handle login error"""
        self.loading = False
        self.show_error(f"Login failed: {error_message}")
    
    def show_error(self, message):
        """Show error dialog"""
        if self.error_dialog:
            self.error_dialog.dismiss()
            
        self.error_dialog = MDDialog(
            title="Error",
            text=message,
            buttons=[
                MDFlatButton(
                    text="OK",
                    on_release=lambda x: self.error_dialog.dismiss()
                )
            ]
        )
        self.error_dialog.open()