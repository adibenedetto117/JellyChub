"""
Cache Manager for Jellyfin Client
Handles caching of images, audio, and metadata
"""
import os
import json
import hashlib
import time
import shutil
from pathlib import Path
from urllib.parse import urlparse
import threading
import requests
from functools import partial

class CacheManager:
    """Manages caching for the Jellyfin client"""
    
    def __init__(self):
        # Create cache directories if they don't exist
        self.cache_dir = Path("cache")
        self.image_cache_dir = self.cache_dir / "images"
        self.audio_cache_dir = self.cache_dir / "audio"
        self.metadata_cache_dir = self.cache_dir / "metadata"
        self.temp_cache_dir = self.cache_dir / "temp"
        
        # Create all cache directories
        self.image_cache_dir.mkdir(parents=True, exist_ok=True)
        self.audio_cache_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_cache_dir.mkdir(parents=True, exist_ok=True)
        self.temp_cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache expiration times (in seconds)
        self.image_cache_expiry = 7 * 24 * 60 * 60  # 7 days
        self.metadata_cache_expiry = 24 * 60 * 60  # 1 day
        self.audio_cache_expiry = 30 * 24 * 60 * 60  # 30 days
        
        # In-memory cache for frequently accessed data
        self.memory_cache = {}
        self.memory_cache_expiry = {}
        self.memory_cache_max_size = 100  # Max items in memory cache
        
        # Cache update queue for writing pending data
        self.pending_writes = {}
        self.lock = threading.Lock()
        
        # Loaded metadata cache
        self.metadata_cache = {}
        
        # Load existing metadata cache
        self._load_metadata_cache()
    
    def _load_metadata_cache(self):
        """Load metadata cache from files"""
        for cache_file in self.metadata_cache_dir.glob("*.json"):
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                    # Only load if not expired
                    if cache_data.get('timestamp', 0) + self.metadata_cache_expiry > time.time():
                        cache_key = cache_file.stem
                        self.metadata_cache[cache_key] = cache_data
            except Exception:
                # Skip corrupted cache files
                pass
    
    def _hash_url(self, url):
        """Create a hash for a URL to use as filename"""
        return hashlib.md5(url.encode('utf-8')).hexdigest()
    
    def _get_extension_from_url(self, url):
        """Get file extension from URL"""
        path = urlparse(url).path
        ext = os.path.splitext(path)[1]
        if not ext:
            # Default extensions based on context
            if '/Images/' in url:
                return '.jpg'
            elif '/Audio/' in url:
                return '.mp3'
        return ext
    
    def _clean_expired_cache(self, cache_dir, expiry_time):
        """Clean expired files from a cache directory"""
        current_time = time.time()
        for cache_file in cache_dir.glob("*"):
            if cache_file.is_file():
                file_mod_time = cache_file.stat().st_mtime
                if current_time - file_mod_time > expiry_time:
                    try:
                        cache_file.unlink()
                    except Exception:
                        pass
    
    def _clean_all_expired(self):
        """Clean all expired cache items"""
        self._clean_expired_cache(self.image_cache_dir, self.image_cache_expiry)
        self._clean_expired_cache(self.audio_cache_dir, self.audio_cache_expiry)
        self._clean_expired_cache(self.metadata_cache_dir, self.metadata_cache_expiry)
        
        # Clean memory cache
        current_time = time.time()
        keys_to_remove = []
        for key, expiry in self.memory_cache_expiry.items():
            if current_time > expiry:
                keys_to_remove.append(key)
                
        for key in keys_to_remove:
            if key in self.memory_cache:
                del self.memory_cache[key]
            del self.memory_cache_expiry[key]
    
    def get_image(self, url, callback=None):
        """
        Get an image from cache or download it
        
        Args:
            url: The image URL
            callback: Function to call with local file path when ready
        """
        if not url:
            if callback:
                callback(None)
            return
            
        # Create hash of URL for filename
        file_hash = self._hash_url(url)
        ext = self._get_extension_from_url(url)
        cached_file = self.image_cache_dir / f"{file_hash}{ext}"
        
        # Check if file exists in cache and is not expired
        if cached_file.exists():
            file_mod_time = cached_file.stat().st_mtime
            if time.time() - file_mod_time <= self.image_cache_expiry:
                if callback:
                    callback(str(cached_file))
                return
        
        # Download the image in a background thread
        def download_thread():
            try:
                response = requests.get(url, stream=True)
                if response.status_code == 200:
                    with open(cached_file, 'wb') as f:
                        response.raw.decode_content = True
                        shutil.copyfileobj(response.raw, f)
                    
                    if callback:
                        callback(str(cached_file))
                else:
                    if callback:
                        callback(None)
            except Exception:
                if callback:
                    callback(None)
        
        threading.Thread(target=download_thread).start()
    
    def get_audio(self, url, item_id, callback=None):
        """
        Get audio file from cache or download it
        
        Args:
            url: The audio stream URL
            item_id: The Jellyfin item ID
            callback: Function to call with local file path when ready
        """
        if not url or not item_id:
            if callback:
                callback(None)
            return
            
        # Use item_id as the filename
        cached_file = self.audio_cache_dir / f"{item_id}.mp3"
        
        # Check if file exists in cache and is not expired
        if cached_file.exists():
            file_mod_time = cached_file.stat().st_mtime
            if time.time() - file_mod_time <= self.audio_cache_expiry:
                if callback:
                    callback(str(cached_file))
                return
        
        # Download the audio in a background thread
        def download_thread():
            try:
                response = requests.get(url, stream=True)
                if response.status_code == 200:
                    with open(cached_file, 'wb') as f:
                        response.raw.decode_content = True
                        shutil.copyfileobj(response.raw, f)
                    
                    if callback:
                        callback(str(cached_file))
                else:
                    if callback:
                        callback(None)
            except Exception:
                if callback:
                    callback(None)
        
        threading.Thread(target=download_thread).start()
    
    def cache_metadata(self, key, data, persistent=True):
        """
        Cache metadata
        
        Args:
            key: Cache key
            data: Data to cache
            persistent: Whether to write to disk or keep in memory only
        """
        # Add timestamp to track expiration
        cache_data = {
            'data': data,
            'timestamp': time.time()
        }
        
        # In-memory cache for quick access
        self.memory_cache[key] = data
        self.memory_cache_expiry[key] = time.time() + self.metadata_cache_expiry
        
        # Trim memory cache if too large
        if len(self.memory_cache) > self.memory_cache_max_size:
            # Remove oldest item
            oldest_key = min(self.memory_cache_expiry.items(), key=lambda x: x[1])[0]
            if oldest_key in self.memory_cache:
                del self.memory_cache[oldest_key]
            del self.memory_cache_expiry[oldest_key]
        
        if persistent:
            # Queue disk write to prevent I/O blocking
            with self.lock:
                self.pending_writes[key] = cache_data
                self.metadata_cache[key] = cache_data
    
    def get_metadata(self, key):
        """
        Get metadata from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached data or None if not in cache or expired
        """
        # First check memory cache
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        # Then check metadata cache
        if key in self.metadata_cache:
            cache_data = self.metadata_cache[key]
            if cache_data.get('timestamp', 0) + self.metadata_cache_expiry > time.time():
                # Refresh in memory cache
                self.memory_cache[key] = cache_data['data']
                self.memory_cache_expiry[key] = time.time() + self.metadata_cache_expiry
                return cache_data['data']
                
        # Check file system as last resort
        cache_file = self.metadata_cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                    if cache_data.get('timestamp', 0) + self.metadata_cache_expiry > time.time():
                        # Add to memory cache
                        self.memory_cache[key] = cache_data['data']
                        self.memory_cache_expiry[key] = time.time() + self.metadata_cache_expiry
                        return cache_data['data']
            except Exception:
                pass
                
        return None
    
    def write_pending_data(self):
        """Write all pending data to disk"""
        with self.lock:
            for key, cache_data in self.pending_writes.items():
                cache_file = self.metadata_cache_dir / f"{key}.json"
                try:
                    with open(cache_file, 'w') as f:
                        json.dump(cache_data, f)
                except Exception:
                    pass
            
            # Clear pending writes
            self.pending_writes = {}
        
        # Clean expired cache in background
        threading.Thread(target=self._clean_all_expired).start()
    
    def clear_cache(self, cache_type=None):
        """
        Clear cache
        
        Args:
            cache_type: Type of cache to clear ('images', 'audio', 'metadata', or None for all)
        """
        if cache_type == 'images' or cache_type is None:
            for file in self.image_cache_dir.glob("*"):
                try:
                    file.unlink()
                except Exception:
                    pass
                    
        if cache_type == 'audio' or cache_type is None:
            for file in self.audio_cache_dir.glob("*"):
                try:
                    file.unlink()
                except Exception:
                    pass
                    
        if cache_type == 'metadata' or cache_type is None:
            for file in self.metadata_cache_dir.glob("*"):
                try:
                    file.unlink()
                except Exception:
                    pass
            
            # Clear memory cache as well
            self.memory_cache = {}
            self.memory_cache_expiry = {}
            self.metadata_cache = {}
            
        # Clear temp cache regardless of type
        for file in self.temp_cache_dir.glob("*"):
            try:
                file.unlink()
            except Exception:
                pass
                
    def get_cache_size(self):
        """Get the size of the cache in bytes"""
        total_size = 0
        
        # Calculate size of image cache
        for file in self.image_cache_dir.glob("*"):
            total_size += file.stat().st_size
            
        # Calculate size of audio cache
        for file in self.audio_cache_dir.glob("*"):
            total_size += file.stat().st_size
            
        # Calculate size of metadata cache
        for file in self.metadata_cache_dir.glob("*"):
            total_size += file.stat().st_size
            
        return total_size