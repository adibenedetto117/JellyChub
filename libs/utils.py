"""
Utility functions for the Jellyfin client
"""
import re
import time
from functools import wraps
from threading import Thread

def format_time(seconds):
    """
    Format seconds into a time string (MM:SS or HH:MM:SS)
    
    Args:
        seconds: Time in seconds
        
    Returns:
        Formatted time string
    """
    if seconds is None:
        return "00:00"
        
    seconds = int(seconds)
    minutes = seconds // 60
    hours = minutes // 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes % 60:02d}:{seconds % 60:02d}"
    else:
        return f"{minutes:02d}:{seconds % 60:02d}"

def debounce(wait):
    """
    Decorator that will postpone a function's execution until after 
    wait seconds have elapsed since the last time it was invoked.
    
    Args:
        wait: Seconds to wait before executing the function
    """
    def decorator(fn):
        last_called = [0]
        timer = [None]
        
        @wraps(fn)
        def debounced(*args, **kwargs):
            def call_function():
                fn(*args, **kwargs)
                last_called[0] = time.time()
                
            current_time = time.time()
            elapsed = current_time - last_called[0]
            
            if elapsed >= wait:
                # Execute immediately
                call_function()
            else:
                # Cancel previous timer if exists
                if timer[0]:
                    timer[0].cancel()
                    
                # Schedule new timer
                new_timer = Thread(target=lambda: time.sleep(wait - elapsed) or call_function())
                new_timer.daemon = True
                new_timer.start()
                timer[0] = new_timer
                
        return debounced
    return decorator

def throttle(wait):
    """
    Decorator that prevents a function from being called more than once
    in a given time period.
    
    Args:
        wait: Minimum seconds between function calls
    """
    def decorator(fn):
        last_called = [0]
        
        @wraps(fn)
        def throttled(*args, **kwargs):
            current_time = time.time()
            elapsed = current_time - last_called[0]
            
            if elapsed >= wait:
                last_called[0] = current_time
                return fn(*args, **kwargs)
            
        return throttled
    return decorator

def clean_filename(filename):
    """
    Remove invalid characters from a filename
    
    Args:
        filename: Original filename
        
    Returns:
        Cleaned filename
    """
    # Replace invalid characters with underscore
    return re.sub(r'[\\/*?:"<>|]', '_', filename)

def format_file_size(size_bytes):
    """
    Format file size in bytes to human-readable format
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

def run_in_thread(fn):
    """
    Decorator to run a function in a background thread
    
    Args:
        fn: Function to run in background
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        thread = Thread(target=fn, args=args, kwargs=kwargs)
        thread.daemon = True
        thread.start()
        return thread
    return wrapper

def run_on_main_thread(main_thread_fn):
    """
    Helper function to run a callback on the main thread
    
    Args:
        main_thread_fn: Function to schedule on the main thread
    """
    from kivy.clock import Clock
    Clock.schedule_once(lambda dt: main_thread_fn(), 0)

class LRUCache:
    """
    Least Recently Used (LRU) cache implementation
    """
    
    def __init__(self, capacity):
        """
        Initialize LRU cache
        
        Args:
            capacity: Maximum number of items to store
        """
        self.capacity = capacity
        self.cache = {}
        self.lru = []
    
    def get(self, key):
        """
        Get item from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if key in self.cache:
            # Move key to the end (most recently used)
            self.lru.remove(key)
            self.lru.append(key)
            return self.cache[key]
        return None
    
    def put(self, key, value):
        """
        Put item in cache
        
        Args:
            key: Cache key
            value: Value to cache
        """
        if key in self.cache:
            # Update existing item
            self.cache[key] = value
            # Move to the end (most recently used)
            self.lru.remove(key)
            self.lru.append(key)
        else:
            # Check if cache is full
            if len(self.cache) >= self.capacity:
                # Remove least recently used item
                lru_key = self.lru.pop(0)
                del self.cache[lru_key]
            
            # Add new item
            self.cache[key] = value
            self.lru.append(key)
    
    def clear(self):
        """Clear cache"""
        self.cache = {}
        self.lru = []