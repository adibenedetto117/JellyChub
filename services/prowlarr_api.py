#!/usr/bin/env python3
"""
Prowlarr API service for JellyTorrent
Handles interaction with Prowlarr for searching torrents
"""

import logging
import requests
import json
import time
from typing import Dict, List, Any, Optional
import threading

logger = logging.getLogger('jellytorrent.prowlarr')

class ProwlarrService:
    """Service to interact with Prowlarr API"""
    
    def __init__(self, config):
        """Initialize the Prowlarr service"""
        self.config = config
        self.enabled = config.get('prowlarr', 'enabled')
        self.base_url = config.get('prowlarr', 'url')
        self.api_key = config.get('prowlarr', 'api_key')
        self.indexers = []
        self.running = False
        self._update_thread = None
        
        if not self.api_key and self.enabled:
            logger.warning("Prowlarr API key not set in config. Please set it to enable Prowlarr integration.")
    
    def start(self):
        """Start the Prowlarr service"""
        if not self.enabled:
            logger.info("Prowlarr service is disabled in config")
            return False
            
        if not self.api_key:
            logger.error("Cannot start Prowlarr service: API key not set")
            return False
        
        logger.info("Starting Prowlarr service...")
        
        # Check connection to Prowlarr
        if not self._check_connection():
            logger.error("Failed to connect to Prowlarr server")
            return False
        
        # Get available indexers
        self._get_indexers()
        
        # Start update thread
        self.running = True
        self._update_thread = threading.Thread(target=self._update_loop)
        self._update_thread.daemon = True
        self._update_thread.start()
        
        logger.info("Prowlarr service started")
        return True
    
    def stop(self):
        """Stop the Prowlarr service"""
        logger.info("Stopping Prowlarr service...")
        self.running = False
        if self._update_thread and self._update_thread.is_alive():
            self._update_thread.join(timeout=5)
        logger.info("Prowlarr service stopped")
    
    def _check_connection(self) -> bool:
        """Check connection to Prowlarr server"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/system/status",
                headers=self._get_headers(),
                timeout=10
            )
            if response.status_code == 200:
                status = response.json()
                logger.info(f"Connected to Prowlarr server: v{status.get('version', 'unknown')}")
                return True
            else:
                logger.error(f"Failed to connect to Prowlarr server: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to Prowlarr server: {e}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Prowlarr API requests"""
        return {
            'X-Api-Key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def _get_indexers(self) -> bool:
        """Get available indexers from Prowlarr"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/indexer",
                headers=self._get_headers(),
                timeout=10
            )
            if response.status_code == 200:
                self.indexers = response.json()
                logger.info(f"Found {len(self.indexers)} indexers in Prowlarr")
                
                # Save indexers to config
                indexer_list = []
                for indexer in self.indexers:
                    indexer_list.append({
                        'id': indexer.get('id'),
                        'name': indexer.get('name'),
                        'protocol': indexer.get('protocol'),
                        'privacy': indexer.get('privacy', {}).get('privacy', 'unknown')
                    })
                self.config.set('prowlarr', 'indexers', indexer_list)
                
                return True
            else:
                logger.error(f"Failed to get indexers: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error getting indexers: {e}")
            return False
    
    def _update_loop(self):
        """Background thread for periodic updates"""
        while self.running:
            try:
                # Refresh indexers periodically
                self._get_indexers()
                
                # Sleep for some time
                time.sleep(3600)  # Once per hour
            except Exception as e:
                logger.error(f"Error in update loop: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def search_movie(self, query: str, imdb_id: Optional[str] = None, 
                    limit: int = 20) -> List[Dict[str, Any]]:
        """Search for a movie across all indexers"""
        if not self.enabled or not self.api_key:
            logger.warning("Prowlarr service is not available")
            return []
        
        logger.info(f"Searching for movie: {query}")
        
        search_params = {
            'query': query,
            'type': 'movie',
            'limit': limit
        }
        
        if imdb_id:
            search_params['imdbId'] = imdb_id
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/search",
                headers=self._get_headers(),
                params=search_params,
                timeout=30
            )
            
            if response.status_code == 200:
                results = response.json()
                logger.info(f"Found {len(results)} search results for movie: {query}")
                return self._process_search_results(results)
            else:
                logger.error(f"Failed to search: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error searching for movie: {e}")
            return []
    
    def search_tvshow(self, query: str, tvdb_id: Optional[str] = None, 
                     season: Optional[int] = None, episode: Optional[int] = None, 
                     limit: int = 20) -> List[Dict[str, Any]]:
        """Search for a TV show across all indexers"""
        if not self.enabled or not self.api_key:
            logger.warning("Prowlarr service is not available")
            return []
        
        logger.info(f"Searching for TV show: {query}")
        
        search_params = {
            'query': query,
            'type': 'tvsearch',
            'limit': limit
        }
        
        if tvdb_id:
            search_params['tvdbId'] = tvdb_id
        
        if season is not None:
            search_params['season'] = season
            
        if episode is not None:
            search_params['episode'] = episode
        
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/search",
                headers=self._get_headers(),
                params=search_params,
                timeout=30
            )
            
            if response.status_code == 200:
                results = response.json()
                logger.info(f"Found {len(results)} search results for TV show: {query}")
                return self._process_search_results(results)
            else:
                logger.error(f"Failed to search: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error searching for TV show: {e}")
            return []
    
    def _process_search_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and clean up search results"""
        processed_results = []
        
        for result in results:
            # Extract relevant information
            processed_result = {
                'title': result.get('title'),
                'indexer': result.get('indexer'),
                'indexer_id': result.get('indexerId'),
                'size': result.get('size'),
                'publish_date': result.get('publishDate'),
                'download_url': result.get('downloadUrl'),
                'magnet_url': result.get('magnetUrl'),
                'info_url': result.get('infoUrl'),
                'seeders': result.get('seeders'),
                'leechers': result.get('leechers'),
                'protocol': result.get('protocol'),
                'quality': result.get('quality'),
                'info_hash': self._extract_info_hash(result.get('magnetUrl'))
            }
            
            processed_results.append(processed_result)
        
        return processed_results
    
    def _extract_info_hash(self, magnet_url: Optional[str]) -> Optional[str]:
        """Extract info hash from magnet URL"""
        if not magnet_url:
            return None
            
        try:
            # Parse magnet URL to extract info hash
            import re
            match = re.search(r'xt=urn:btih:([0-9a-fA-F]{40})', magnet_url)
            if match:
                return match.group(1).lower()
                
            # Try hex format
            match = re.search(r'xt=urn:btih:([0-9a-zA-Z]{32})', magnet_url)
            if match:
                return match.group(1).lower()
                
            return None
            
        except Exception as e:
            logger.error(f"Error extracting info hash: {e}")
            return None