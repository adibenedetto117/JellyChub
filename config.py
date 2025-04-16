#!/usr/bin/env python3
"""
Configuration handler for JellyTorrent
"""

import os
import yaml
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger('jellytorrent.config')

class Config:
    """Configuration manager for JellyTorrent"""
    
    DEFAULT_CONFIG = {
        'jellyfin': {
            'url': 'http://localhost:8096',
            'api_key': '',
            'user_id': '',
            'libraries': {
                'movies': {
                    'name': 'Torrent Movies',
                    'type': 'movies',
                    'enabled': True
                },
                'shows': {
                    'name': 'Torrent TV Shows',
                    'type': 'tvshows',
                    'enabled': True
                }
            }
        },
        'prowlarr': {
            'enabled': True,
            'url': 'http://localhost:9696',
            'api_key': '',
            'indexers': []  # Will be populated from Prowlarr
        },
        'torrent': {
            'download_dir': '/tmp/jellytorrent',
            'buffer_size': '50MB',  # Buffer size before playback starts
            'max_download_rate': '0',  # 0 means unlimited
            'max_upload_rate': '1000',  # KB/s
            'port': 6881,
            'use_random_port': True,
            'encryption': 1  # 0=forced, 1=enabled, 2=disabled
        },
        'api': {
            'username': 'admin',
            'password': 'admin',  # Should be changed
            'jwt_secret': '',  # Will be generated if empty
            'jwt_expiry': 7200  # 2 hours in seconds
        },
        'logging': {
            'level': 'INFO',
            'file': 'jellytorrent.log'
        }
    }
    
    def __init__(self, config_path: str):
        """Initialize the config from a YAML file"""
        self.config_path = config_path
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load config from file or create default if not exists"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    config = yaml.safe_load(f)
                    
                # Merge with defaults for any missing keys
                return self._merge_defaults(config)
            except Exception as e:
                logger.error(f"Error loading config: {e}")
                logger.info("Using default configuration")
                return self.DEFAULT_CONFIG.copy()
        else:
            logger.info(f"Config file {self.config_path} not found, creating default")
            self._save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save config to file"""
        try:
            with open(self.config_path, 'w') as f:
                yaml.dump(config, f, default_flow_style=False)
            logger.info(f"Config saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def _merge_defaults(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge user config with defaults for any missing keys"""
        merged = self.DEFAULT_CONFIG.copy()
        
        def merge_dict(target, source):
            for key, value in source.items():
                if key in target and isinstance(value, dict) and isinstance(target[key], dict):
                    merge_dict(target[key], value)
                else:
                    target[key] = value
        
        merge_dict(merged, config)
        return merged
    
    def get(self, section: str, key: Optional[str] = None) -> Any:
        """Get a config value"""
        if section not in self.config:
            return None
        
        if key is None:
            return self.config[section]
        
        return self.config[section].get(key)
    
    def set(self, section: str, key: str, value: Any) -> None:
        """Set a config value"""
        if section not in self.config:
            self.config[section] = {}
        
        self.config[section][key] = value
        self._save_config(self.config)
    
    def save(self) -> None:
        """Save current config to file"""
        self._save_config(self.config)