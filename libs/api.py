import uuid
import json
import requests
from urllib.parse import urljoin
import threading
from functools import partial

class JellyfinAPI:
    """Handles all API interactions with Jellyfin server"""
    
    def __init__(self, app):
        self.app = app
        self.base_url = ""
        self.user_id = None
        self.access_token = None
        self.device_id = app.settings.get('device_id')['value'] if app.settings.exists('device_id') else str(uuid.uuid4())
        self.client_name = "Jellyfin Music"
        self.client_version = "1.0.0"
        self.device_name = "Python Kivy Client"
        
        # Set auth_manager.api reference
        app.auth_manager.set_api(self)
    
    def _get_headers(self):
        """Get required headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': f'MediaBrowser Client="{self.client_name}", '
                                    f'Device="{self.device_name}", '
                                    f'DeviceId="{self.device_id}", '
                                    f'Version="{self.client_version}"'
        }
        
        # Add authentication token if available
        if self.access_token:
            headers['X-Emby-Token'] = self.access_token
            
        return headers
    
    def _make_request(self, method, endpoint, params=None, data=None, success_callback=None, error_callback=None):
        """Make an API request in a background thread"""
        url = urljoin(self.base_url, endpoint)
        headers = self._get_headers()
        
        # Define the request function to run in a thread
        def request_thread():
            try:
                if method == 'GET':
                    response = requests.get(url, headers=headers, params=params)
                elif method == 'POST':
                    response = requests.post(url, headers=headers, params=params, json=data)
                elif method == 'DELETE':
                    response = requests.delete(url, headers=headers, params=params)
                else:
                    if error_callback:
                        self._execute_on_main_thread(error_callback, f"Unsupported method: {method}")
                    return
                
                if response.status_code >= 200 and response.status_code < 300:
                    content_type = response.headers.get('Content-Type', '')
                    if 'application/json' in content_type:
                        result = response.json()
                    else:
                        result = response.content
                        
                    if success_callback:
                        self._execute_on_main_thread(success_callback, result)
                else:
                    if error_callback:
                        error_msg = f"Error {response.status_code}: {response.text}"
                        self._execute_on_main_thread(error_callback, error_msg)
            except Exception as e:
                if error_callback:
                    self._execute_on_main_thread(error_callback, str(e))
        
        # Start the request in a background thread
        threading.Thread(target=request_thread).start()
    
    def _execute_on_main_thread(self, callback, data):
        """Execute a callback on the main thread using Kivy's Clock"""
        from kivy.clock import Clock
        Clock.schedule_once(lambda dt: callback(data), 0)
    
    def login(self, username, password, success_callback=None, error_callback=None):
        """Authenticate with Jellyfin server"""
        endpoint = "Users/AuthenticateByName"
        data = {
            "Username": username,
            "Pw": password  # Jellyfin expects plaintext password in 'Pw' field
        }
        # Print request details for debugging (remove in production)
        print(f"Login request to: {urljoin(self.base_url, endpoint)}")
        print(f"Headers: {self._get_headers()}")
        print(f"Data: {data}")
        
        self._make_request('POST', endpoint, data=data, success_callback=success_callback, error_callback=error_callback)
    
    def get_music_libraries(self, success_callback=None, error_callback=None):
        """Get all music libraries"""
        if not self.user_id:
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Users/{self.user_id}/Views"
        
        print(f"Getting music libraries for user: {self.user_id}")
        print(f"Request URL: {urljoin(self.base_url, endpoint)}")
        
        def filter_music_libraries(response):
            # Log full response for debugging
            print(f"Views response: {json.dumps(response, indent=2)}")
            
            # Filter libraries to only include music
            music_libraries = [lib for lib in response['Items'] 
                              if lib.get('CollectionType') == 'music']
            
            print(f"Found {len(music_libraries)} music libraries")
            
            if success_callback:
                success_callback(music_libraries)
        
        self._make_request('GET', endpoint, success_callback=filter_music_libraries, error_callback=error_callback)
    
    def get_artists(self, parent_id=None, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get music artists"""
        if not self.user_id:
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Artists"
        params = {
            'userId': self.user_id,
            'limit': limit,
            'startIndex': offset,
            'sortBy': 'SortName',
            'sortOrder': 'Ascending',
            'recursive': 'true',
            'fields': 'PrimaryImageAspectRatio,SortName,BasicSyncInfo'
        }
        
        if parent_id:
            params['parentId'] = parent_id
            
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_albums(self, artist_id=None, parent_id=None, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get music albums"""
        if not self.user_id:
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Items"
        params = {
            'userId': self.user_id,
            'includeItemTypes': 'MusicAlbum',
            'limit': limit,
            'startIndex': offset,
            'sortBy': 'SortName',
            'sortOrder': 'Ascending',
            'recursive': 'true',
            'fields': 'PrimaryImageAspectRatio,SortName,BasicSyncInfo'
        }
        
        if artist_id:
            params['artistIds'] = artist_id
        
        if parent_id:
            params['parentId'] = parent_id
            
        print(f"Getting albums with params: {params}")
        print(f"API URL: {urljoin(self.base_url, endpoint)}")
            
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_songs(self, album_id=None, artist_id=None, parent_id=None, limit=100, offset=0, 
                 success_callback=None, error_callback=None):
        """Get songs"""
        if not self.user_id:
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Items"
        params = {
            'userId': self.user_id,
            'includeItemTypes': 'Audio',
            'limit': limit,
            'startIndex': offset,
            'sortBy': 'SortName',
            'sortOrder': 'Ascending',
            'recursive': 'true',
            'fields': 'PrimaryImageAspectRatio,SortName,MediaSources'
        }
        
        if album_id:
            params['albumIds'] = album_id
            
        if artist_id:
            params['artistIds'] = artist_id
        
        if parent_id:
            params['parentId'] = parent_id
            
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_playlists(self, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get playlists"""
        if not self.user_id:
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Items"
        params = {
            'userId': self.user_id,
            'includeItemTypes': 'Playlist',
            'limit': limit,
            'startIndex': offset,
            'sortBy': 'SortName',
            'sortOrder': 'Ascending',
            'fields': 'PrimaryImageAspectRatio,SortName,CanDelete,BasicSyncInfo'
        }
            
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_image_url(self, item_id, image_type="Primary", max_height=None, max_width=None):
        """Get URL for an item's image"""
        if not self.base_url or not item_id:
            return None
            
        url = f"{self.base_url}/Items/{item_id}/Images/{image_type}"
        params = []
        
        if max_height:
            params.append(f"maxHeight={max_height}")
        if max_width:
            params.append(f"maxWidth={max_width}")
            
        if params:
            url = f"{url}?{'&'.join(params)}"
            
        return url
    
    def get_stream_url(self, item_id):
        """Get direct stream URL for audio"""
        if not self.base_url or not item_id or not self.access_token:
            return None
            
        # Construct direct stream URL with authentication
        url = f"{self.base_url}/Audio/{item_id}/stream.mp3?static=true&api_key={self.access_token}"
        return url