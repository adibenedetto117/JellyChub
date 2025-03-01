"""
Settings Screen for Jellyfin Client
Handles app settings and cache management
"""
from kivy.uix.screenmanager import Screen
from kivy.properties import (
    StringProperty, BooleanProperty, NumericProperty, 
    ObjectProperty, OptionProperty
)
from kivymd.uix.list import OneLineIconListItem, IconLeftWidget
from kivymd.uix.dialog import MDDialog
from kivymd.uix.button import MDFlatButton, MDRaisedButton
from kivy.clock import Clock

from libs.utils import format_file_size

class SettingsScreen(Screen):
    """
    Settings screen with app preferences and cache management
    """
    theme = OptionProperty("dark", options=["light", "dark"])
    cache_size = StringProperty("0 B")
    current_user_name = StringProperty("")
    current_server = StringProperty("")
    
    def __init__(self, **kwargs):
        super(SettingsScreen, self).__init__(**kwargs)
        self.name = "settings"
        self.dialog = None
    
    def on_enter(self):
        """Called when screen is entered"""
        # Update user info
        app = self.get_app()
        if app.current_user and app.current_user.get('User', {}).get('Name'):
            self.current_user_name = app.current_user['User']['Name']
        
        if app.settings.exists('auth_data') and app.settings.get('auth_data').get('server_url'):
            self.current_server = app.settings.get('auth_data')['server_url']
        
        # Update cache size
        self.update_cache_size()
        
        # Set theme based on app setting
        self.theme = app.theme_cls.theme_style.lower()
    
    def get_app(self):
        """Get app instance"""
        from kivy.app import App
        return App.get_running_app()
    
    def update_cache_size(self):
        """Update cache size display"""
        app = self.get_app()
        cache_size = app.cache_manager.get_cache_size()
        self.cache_size = format_file_size(cache_size)
    
    def toggle_theme(self):
        """Toggle between light and dark theme"""
        app = self.get_app()
        
        # Toggle theme
        if app.theme_cls.theme_style == "Dark":
            app.theme_cls.theme_style = "Light"
            self.theme = "light"
        else:
            app.theme_cls.theme_style = "Dark"
            self.theme = "dark"
        
        # Save preference
        app.settings.put('theme', {'mode': self.theme})
    
    def clear_cache(self):
        """Show confirmation dialog to clear cache"""
        if self.dialog:
            self.dialog.dismiss()
            
        self.dialog = MDDialog(
            title="Clear Cache",
            text="Are you sure you want to clear all cached data? This will remove all downloaded images and audio files.",
            buttons=[
                MDFlatButton(
                    text="CANCEL",
                    on_release=lambda x: self.dialog.dismiss()
                ),
                MDRaisedButton(
                    text="CLEAR",
                    on_release=self.confirm_clear_cache
                )
            ]
        )
        self.dialog.open()
    
    def confirm_clear_cache(self, *args):
        """Clear the cache after confirmation"""
        self.dialog.dismiss()
        
        app = self.get_app()
        app.cache_manager.clear_cache()
        
        # Update cache size display
        self.update_cache_size()
        
        # Show success message
        self.show_message("Cache cleared successfully")
    
    def logout(self):
        """Show confirmation dialog to log out"""
        if self.dialog:
            self.dialog.dismiss()
            
        self.dialog = MDDialog(
            title="Log Out",
            text="Are you sure you want to log out?",
            buttons=[
                MDFlatButton(
                    text="CANCEL",
                    on_release=lambda x: self.dialog.dismiss()
                ),
                MDRaisedButton(
                    text="LOG OUT",
                    on_release=self.confirm_logout
                )
            ]
        )
        self.dialog.open()
    
    def confirm_logout(self, *args):
        """Log out after confirmation"""
        self.dialog.dismiss()
        
        app = self.get_app()
        app.logout()
    
    def show_message(self, message):
        """Show a simple message dialog"""
        if self.dialog:
            self.dialog.dismiss()
            
        self.dialog = MDDialog(
            title="Message",
            text=message,
            buttons=[
                MDFlatButton(
                    text="OK",
                    on_release=lambda x: self.dialog.dismiss()
                )
            ]
        )
        self.dialog.open()
    
    def show_about(self):
        """Show about dialog with app info"""
        if self.dialog:
            self.dialog.dismiss()
            
        self.dialog = MDDialog(
            title="About Jellyfin Music",
            text="Jellyfin Music\nVersion 1.0.0\n\nA Python KivyMD client for Jellyfin media server focused on music playback.\n\nFeatures:\n- Music streaming\n- Offline playback\n- Library browsing\n- Album and artist views",
            buttons=[
                MDFlatButton(
                    text="OK",
                    on_release=lambda x: self.dialog.dismiss()
                )
            ]
        )
        self.dialog.open()