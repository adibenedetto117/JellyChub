#!/usr/bin/env python3
"""
Jellyfin API service for JellyTorrent
Handles interaction with Jellyfin server and creates virtual libraries
"""

import logging
import requests
import json
import time
import threading
from typing import Dict, List, Any, Optional

logger = logging.getLogger('jellytorrent.jellyfin')

class JellyfinService:
    """Service to interact with Jellyfin API"""
    
    def __init__(self, config):
        """Initialize the Jellyfin service"""
        self.config = config
        self.base_url = config.get('jellyfin', 'url')
        self.api_key = config.get('jellyfin', 'api_key')
        self.user_id = config.get('jellyfin', 'user_id')
        self.libraries = config.get('jellyfin', 'libraries')
        self.running = False
        self.virtual_items = {}  # Cache of virtual media items
        self._update_thread = None
        
        if not self.api_key:
            logger.warning("Jellyfin API key not set in config. Please set it to enable Jellyfin integration.")
        
        if not self.user_id:
            logger.warning("Jellyfin user ID not set in config. Please set it to enable user-specific features.")
    
    def start(self):
        """Start the Jellyfin service"""
        if not self.api_key:
            logger.error("Cannot start Jellyfin service: API key not set")
            return False
        
        logger.info("Starting Jellyfin service...")
        
        # Check connection to Jellyfin
        if not self._check_connection():
            logger.error("Failed to connect to Jellyfin server")
            return False
        
        # Create virtual libraries if they don't exist
        self._setup_virtual_libraries()
        
        # Start update thread
        self.running = True
        self._update_thread = threading.Thread(target=self._update_loop)
        self._update_thread.daemon = True
        self._update_thread.start()
        
        logger.info("Jellyfin service started")
        return True
    
    def stop(self):
        """Stop the Jellyfin service"""
        logger.info("Stopping Jellyfin service...")
        self.running = False
        if self._update_thread and self._update_thread.is_alive():
            self._update_thread.join(timeout=5)
        logger.info("Jellyfin service stopped")
    
    def _check_connection(self) -> bool:
        """Check connection to Jellyfin server"""
        try:
            response = requests.get(
                f"{self.base_url}/System/Info",
                headers=self._get_headers(),
                timeout=10
            )
            if response.status_code == 200:
                server_info = response.json()
                logger.info(f"Connected to Jellyfin server: {server_info.get('ServerName')} (v{server_info.get('Version')})")
                return True
            else:
                logger.error(f"Failed to connect to Jellyfin server: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to Jellyfin server: {e}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Jellyfin API requests"""
        return {
            'X-Emby-Token': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def _setup_virtual_libraries(self):
        """Set up virtual libraries in Jellyfin"""
        for lib_id, lib_config in self.libraries.items():
            if not lib_config.get('enabled', True):
                continue
                
            lib_name = lib_config.get('name')
            lib_type = lib_config.get('type')
            
            logger.info(f"Setting up virtual library: {lib_name} ({lib_type})")
            
            # Check if library exists
            if not self._check_library_exists(lib_name):
                # Create virtual library
                self._create_virtual_library(lib_id, lib_name, lib_type)
    
    def _check_library_exists(self, library_name: str) -> bool:
        """Check if a library exists in Jellyfin"""
        try:
            response = requests.get(
                f"{self.base_url}/Library/VirtualFolders",
                headers=self._get_headers(),
                timeout=10
            )
            if response.status_code == 200:
                libraries = response.json()
                for library in libraries:
                    if library.get('Name') == library_name:
                        logger.info(f"Library '{library_name}' already exists")
                        return True
                return False
            else:
                logger.error(f"Failed to get libraries: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error checking library existence: {e}")
            return False
    
    def _create_virtual_library(self, lib_id: str, lib_name: str, lib_type: str) -> bool:
        """Create a virtual library in Jellyfin"""
        # Create a virtual folder for the library
        virtual_path = f"/jellytorrent/{lib_id}"
        
        # Define collection type based on library type
        collection_type = "movies" if lib_type == "movies" else "tvshows"
        
        try:
            # Create virtual folder request
            data = {
                "Name": lib_name,
                "CollectionType": collection_type,
                "Paths": [virtual_path],
                "RefreshLibrary": True
            }
            
            response = requests.post(
                f"{self.base_url}/Library/VirtualFolders",
                headers=self._get_headers(),
                json=data,
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"Successfully created virtual library: {lib_name}")
                return True
            else:
                logger.error(f"Failed to create virtual library: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating virtual library: {e}")
            return False
    
    def _update_loop(self):
        """Background thread to update virtual items"""
        while self.running:
            try:
                # Update virtual items if needed
                self._update_virtual_items()
                
                # Sleep for some time before next update
                time.sleep(300)  # 5 minutes
            except Exception as e:
                logger.error(f"Error in update loop: {e}")
                time.sleep(60)  # Wait a bit before retrying
    
    def _update_virtual_items(self):
        """Update virtual items in the libraries"""
        # This would be implemented to keep the virtual libraries updated
        # with content from the torrent indexers
        logger.debug("Updating virtual library items...")
        
        # Implement logic to sync with torrent search results
        # and update the virtual items in Jellyfin libraries
    
    def add_virtual_movie(self, movie_data: Dict[str, Any]) -> bool:
        """Add a virtual movie to the movies library"""
        lib_id = "movies"
        if lib_id not in self.libraries or not self.libraries[lib_id].get('enabled', False):
            logger.warning(f"Library {lib_id} not enabled or doesn't exist")
            return False
        
        try:
            # Create a virtual item for the movie
            # This is a simplified example, actual implementation would be more complex
            virtual_item = {
                "Name": movie_data.get('title'),
                "OriginalTitle": movie_data.get('original_title', movie_data.get('title')),
                "Path": f"/jellytorrent/{lib_id}/{movie_data.get('id')}",
                "ProductionYear": movie_data.get('year'),
                "Overview": movie_data.get('overview'),
                "TMDB_Id": movie_data.get('tmdb_id'),
                "IMDB_Id": movie_data.get('imdb_id'),
                "IndexerId": movie_data.get('indexer_id'),
                "TorrentInfoHash": movie_data.get('info_hash')
            }
            
            # Store virtual item in cache
            item_id = f"{lib_id}_{movie_data.get('id')}"
            self.virtual_items[item_id] = virtual_item
            
            # In a real implementation, we would create this in the Jellyfin database
            # or use a plugin architecture to inject virtual items
            
            return True
        
        except Exception as e:
            logger.error(f"Error adding virtual movie: {e}")
            return False
    
    def add_virtual_tvshow(self, show_data: Dict[str, Any]) -> bool:
        """Add a virtual TV show to the TV library"""
        lib_id = "shows"
        if lib_id not in self.libraries or not self.libraries[lib_id].get('enabled', False):
            logger.warning(f"Library {lib_id} not enabled or doesn't exist")
            return False
        
        try:
            # Similar to add_virtual_movie but for TV shows
            # Would handle seasons and episodes as well
            virtual_item = {
                "Name": show_data.get('title'),
                "OriginalTitle": show_data.get('original_title', show_data.get('title')),
                "Path": f"/jellytorrent/{lib_id}/{show_data.get('id')}",
                "ProductionYear": show_data.get('year'),
                "Overview": show_data.get('overview'),
                "TMDB_Id": show_data.get('tmdb_id'),
                "IMDB_Id": show_data.get('imdb_id'),
                "Seasons": show_data.get('seasons', []),
                "IndexerId": show_data.get('indexer_id')
            }
            
            # Store virtual item in cache
            item_id = f"{lib_id}_{show_data.get('id')}"
            self.virtual_items[item_id] = virtual_item
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding virtual TV show: {e}")
            return False
    
    def get_virtual_item(self, lib_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a virtual item from the cache"""
        cache_id = f"{lib_id}_{item_id}"
        return self.virtual_items.get(cache_id)
    
    def remove_virtual_item(self, lib_id: str, item_id: str) -> bool:
        """Remove a virtual item from the cache"""
        cache_id = f"{lib_id}_{item_id}"
        if cache_id in self.virtual_items:
            del self.virtual_items[cache_id]
            return True
        return False