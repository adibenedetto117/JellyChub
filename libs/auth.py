import json
import base64
import hashlib
import uuid
from pathlib import Path

class AuthManager:
    """Handles authentication with Jellyfin server"""
    
    def __init__(self, app):
        self.app = app
        self.settings = app.settings
        self.api = None  # Will be set after API is initialized
        
        # Generate a device ID if one doesn't exist
        if 'device_id' not in self.settings:
            device_id = str(uuid.uuid4())
            self.settings['device_id'] = {'value': device_id}
            print(f"Generated new device ID: {device_id}")
        else:
            print(f"Using existing device ID: {self.settings['device_id'].get('value')}")
        
        # Client info
        self.client_info = {
            'app_name': 'Jellyfin Music',
            'app_version': '1.0.0',
            'device_name': 'Python Kivy Client',
            'device_id': self.settings['device_id'].get('value')
        }
    
    def set_api(self, api):
        """Set the API reference after it's initialized"""
        self.api = api
    
    def has_saved_credentials(self):
        """Check if there are saved credentials"""
        print(f"Checking for saved credentials...")
        
        try:
            has_creds = ('auth_data' in self.settings and 
                        self.settings['auth_data'].get('server_url') and 
                        self.settings['auth_data'].get('user_id') and 
                        self.settings['auth_data'].get('access_token'))
            
            if has_creds:
                print("Found saved credentials")
            else:
                print("No saved credentials found")
                if 'auth_data' in self.settings:
                    print(f"Auth data exists but is incomplete: {self.settings['auth_data']}")
                
            return has_creds
        except Exception as e:
            print(f"Error checking credentials: {str(e)}")
            return False
    
    def save_credentials(self, server_url, user_id, access_token, user_data):
        """Save authentication credentials"""
        auth_data = {
            'server_url': server_url,
            'user_id': user_id,
            'access_token': access_token,
            'user_data': user_data
        }
        print(f"Saving credentials to settings: {server_url}, {user_id}, token: {access_token[:10]}...")
        
        # The JsonStore put() method takes a key and then keyword arguments
        # Format: settings.put(key, **values)
        self.settings['auth_data'] = auth_data
        
        # Verify the save worked
        if 'auth_data' in self.settings:
            saved = self.settings['auth_data']
            print(f"Verified saved credentials - User ID: {saved.get('user_id')}, Access token: {saved.get('access_token')[:10] if saved.get('access_token') else None}")
        else:
            print("ERROR: Failed to save credentials")
    
    def get_credentials(self):
        """Get saved credentials"""
        if self.has_saved_credentials():
            return self.settings['auth_data']
        return None
    
    def auto_login(self):
        """Attempt to log in using saved credentials"""
        print("Attempting auto-login with saved credentials")
        if self.has_saved_credentials():
            auth_data = self.get_credentials()
            print(f"Using saved credentials: Server: {auth_data['server_url']}, User ID: {auth_data['user_id']}")
            
            self.app.api.base_url = auth_data['server_url']
            self.app.api.user_id = auth_data['user_id']
            self.app.api.access_token = auth_data['access_token']
            self.app.current_user = auth_data['user_data']
            self.app.auth_token = auth_data['access_token']
            
            # Switch to home screen
            from ui.screens.home_screen import HomeScreen
            print("Creating and switching to home screen")
            self.app.root.clear_widgets()
            self.app.root.add_widget(HomeScreen())
            return True
        return False
    
    def login(self, server_url, username, password, success_callback, error_callback):
        """Log in to Jellyfin server"""
        # Set API base URL
        self.app.api.base_url = server_url
        
        # Perform login request with plain password
        # Jellyfin API expects plain password in the 'Pw' field, not hashed
        self.app.api.login(
            username=username,
            password=password,
            success_callback=lambda response: self._handle_login_success(response, success_callback, error_callback),
            error_callback=error_callback
        )
    
    def _handle_login_success(self, response, success_callback, error_callback=None):
        """Handle successful login response"""
        print(f"Login successful, processing response: {json.dumps(response, indent=2)}")
        user_data = response
        user_id = user_data.get('User', {}).get('Id')
        access_token = user_data.get('AccessToken')
        
        if user_id and access_token:
            print(f"Saving credentials - User ID: {user_id}, Token: {access_token[:10]}...")
            # Save authentication data
            self.save_credentials(
                server_url=self.app.api.base_url,
                user_id=user_id,
                access_token=access_token,
                user_data=user_data
            )
            
            # Update app state
            self.app.api.user_id = user_id
            self.app.api.access_token = access_token
            self.app.current_user = user_data
            self.app.auth_token = access_token
            
            # Call success callback
            success_callback(user_data)
        else:
            # If we got a response but without proper auth data
            print(f"Login response missing user_id or access_token")
            if error_callback:
                error_callback("Invalid server response")
    
    def logout(self):
        """Log out from Jellyfin server"""
        # Clear authentication data
        if self.settings.exists('auth_data'):
            self.settings.delete('auth_data')
        
        # Reset app state
        self.app.api.user_id = None
        self.app.api.access_token = None
        self.app.current_user = None
        self.app.auth_token = ""
        
        # Clear temporary cache (but keep persistent cache)
        cache_path = Path("cache/temp")
        if cache_path.exists():
            for file in cache_path.glob("*"):
                file.unlink()