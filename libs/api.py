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
            print("Cannot get libraries: Not authenticated")
            if error_callback:
                error_callback("Not authenticated")
            return
            
        endpoint = f"Users/{self.user_id}/Views"
        
        print(f"DEBUG: Getting music libraries")
        print(f"DEBUG: Base URL: {self.base_url}")
        print(f"DEBUG: User ID: {self.user_id}")
        print(f"DEBUG: Full Endpoint URL: {urljoin(self.base_url, endpoint)}")
        print(f"DEBUG: Headers: {self._get_headers()}")
        
        def filter_music_libraries(response):
            print("DEBUG: Full Libraries Response:")
            print(json.dumps(response, indent=2))
            
            # Extract all items
            all_items = response.get('Items', [])
            print(f"DEBUG: Total items found: {len(all_items)}")
            
            # Detailed item logging
            for item in all_items:
                print("DEBUG: Library Item Details:")
                print(f"  Name: {item.get('Name')}")
                print(f"  ID: {item.get('Id')}")
                print(f"  Collection Type: {item.get('CollectionType')}")
                print(f"  All Item Keys: {list(item.keys())}")
            
            # Explicitly filter music libraries
            music_libraries = [
                lib for lib in all_items 
                if lib.get('CollectionType') == 'music'
            ]
            
            print(f"DEBUG: Filtered Music Libraries: {len(music_libraries)}")
            
            if success_callback:
                success_callback(music_libraries or all_items)
        
        def handle_error(error):
            print(f"DEBUG: Libraries Request Error: {error}")
            if error_callback:
                error_callback(error)
        
        self._make_request('GET', endpoint, 
                           success_callback=filter_music_libraries, 
                           error_callback=handle_error)
    
    def get_albums(self, artist_id=None, parent_id=None, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get music albums with extensive debugging"""
        if not self.user_id:
            print("DEBUG: Cannot get albums: Not authenticated")
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
        
        # If no parent_id is provided, use the music library ID from Views
        if not parent_id:
            # Try to get the music library ID
            try:
                libraries = self.get_saved_music_libraries()
                if libraries:
                    parent_id = libraries[0]['Id']
                    print(f"DEBUG: Using Music Library ID: {parent_id}")
            except Exception as e:
                print(f"DEBUG: Error getting music libraries: {e}")
        
        if artist_id:
            params['artistIds'] = artist_id
        
        if parent_id:
            params['parentId'] = parent_id
            
        print("DEBUG: Fetching Albums")
        print(f"DEBUG: Base URL: {self.base_url}")
        print(f"DEBUG: Full Endpoint URL: {urljoin(self.base_url, endpoint)}")
        print(f"DEBUG: Request Params: {json.dumps(params, indent=2)}")
        
        def process_albums(response):
            print("DEBUG: Full Albums Response:")
            print(json.dumps(response, indent=2))
            
            # Extract album items
            albums = response.get('Items', [])
            print(f"DEBUG: Total Albums Found: {len(albums)}")
            
            # Detailed album logging
            for album in albums:
                print("DEBUG: Album Details:")
                print(f"  Name: {album.get('Name')}")
                print(f"  ID: {album.get('Id')}")
                print(f"  Artist: {album.get('AlbumArtist', 'Unknown')}")
            
            if success_callback:
                success_callback(response)
        
        def handle_error(error):
            print(f"DEBUG: Albums Request Error: {error}")
            if error_callback:
                error_callback(error)
        
        self._make_request('GET', endpoint, 
                          params=params, 
                          success_callback=process_albums, 
                          error_callback=handle_error)
    
    def get_saved_music_libraries(self):
        """
        Retrieve saved music libraries from the app settings
        
        Returns:
            List of music libraries
        """
        try:
            # Use app settings to get library views
            ordered_views = self.app.current_user.get('User', {}).get('Configuration', {}).get('OrderedViews', [])
            
            print(f"DEBUG: Ordered Views: {ordered_views}")
            
            # Retrieve full library details
            libraries = []
            for view_id in ordered_views:
                try:
                    library_details = self._get_library_details(view_id)
                    if library_details and library_details.get('CollectionType') == 'music':
                        libraries.append(library_details)
                except Exception as e:
                    print(f"DEBUG: Error checking library {view_id}: {e}")
            
            print(f"DEBUG: Found Music Libraries: {libraries}")
            return libraries
        
        except Exception as e:
            print(f"DEBUG: Error reading music libraries: {e}")
            return []
    
    def _get_library_details(self, library_id):
        """
        Get detailed information about a specific library
        
        Args:
            library_id (str): Library ID to check
        
        Returns:
            dict: Library details or None
        """
        try:
            endpoint = f"Libraries/{library_id}"
            url = urljoin(self.base_url, endpoint)
            
            response = requests.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                return response.json()
            
            print(f"DEBUG: Failed to get library details for {library_id}: {response.status_code}")
            return None
        
        except Exception as e:
            print(f"DEBUG: Error getting library details: {e}")
            return None
    
    def get_artists(self, parent_id=None, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get music artists"""
        if not self.user_id:
            print("DEBUG: Cannot get artists: Not authenticated")
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
            
        print("DEBUG: Fetching Artists")
        print(f"DEBUG: Base URL: {self.base_url}")
        print(f"DEBUG: Full Endpoint URL: {urljoin(self.base_url, endpoint)}")
        print(f"DEBUG: Request Params: {json.dumps(params, indent=2)}")
        
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_songs(self, album_id=None, artist_id=None, parent_id=None, limit=100, offset=0, 
                 success_callback=None, error_callback=None):
        """Get songs"""
        if not self.user_id:
            print("DEBUG: Cannot get songs: Not authenticated")
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
            
        print("DEBUG: Fetching Songs")
        print(f"DEBUG: Base URL: {self.base_url}")
        print(f"DEBUG: Full Endpoint URL: {urljoin(self.base_url, endpoint)}")
        print(f"DEBUG: Request Params: {json.dumps(params, indent=2)}")
        
        self._make_request('GET', endpoint, params=params, success_callback=success_callback, error_callback=error_callback)
    
    def get_playlists(self, limit=50, offset=0, success_callback=None, error_callback=None):
        """Get playlists"""
        if not self.user_id:
            print("DEBUG: Cannot get playlists: Not authenticated")
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
            
        print("DEBUG: Fetching Playlists")
        print(f"DEBUG: Base URL: {self.base_url}")
        print(f"DEBUG: Full Endpoint URL: {urljoin(self.base_url, endpoint)}")
        print(f"DEBUG: Request Params: {json.dumps(params, indent=2)}")
        
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