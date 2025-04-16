#!/usr/bin/env python3
"""
Torrent service for JellyTorrent
Handles downloading and streaming of torrent content
"""

import logging
import os
import threading
import time
import shutil
from typing import Dict, List, Any, Optional, Tuple

# Import libtorrent
try:
    import libtorrent as lt
except ImportError:
    logging.error("libtorrent is required. Install with 'pip install python-libtorrent'")
    lt = None

logger = logging.getLogger('jellytorrent.torrent')

class TorrentService:
    """Service to handle torrent downloading and streaming"""
    
    def __init__(self, config):
        """Initialize the torrent service"""
        self.config = config
        self.download_dir = config.get('torrent', 'download_dir')
        self.buffer_size = self._parse_size(config.get('torrent', 'buffer_size', '50MB'))
        self.max_download_rate = int(config.get('torrent', 'max_download_rate', '0'))
        self.max_upload_rate = int(config.get('torrent', 'max_upload_rate', '1000'))
        self.port = int(config.get('torrent', 'port', '6881'))
        self.use_random_port = config.get('torrent', 'use_random_port', True)
        self.encryption = int(config.get('torrent', 'encryption', 1))
        
        self.running = False
        self._lt_session = None
        self._torrents = {}  # info_hash -> torrent_handle
        self._torrent_statuses = {}  # info_hash -> status_dict
        self._update_thread = None
        
        # Create download directory if it doesn't exist
        os.makedirs(self.download_dir, exist_ok=True)
    
    def start(self):
        """Start the torrent service"""
        if lt is None:
            logger.error("Cannot start torrent service: libtorrent not installed")
            return False
        
        logger.info("Starting torrent service...")
        
        # Initialize libtorrent session
        self._init_session()
        
        # Start update thread
        self.running = True
        self._update_thread = threading.Thread(target=self._update_loop)
        self._update_thread.daemon = True
        self._update_thread.start()
        
        logger.info("Torrent service started")
        return True
    
    def stop(self):
        """Stop the torrent service"""
        logger.info("Stopping torrent service...")
        self.running = False
        
        # Wait for update thread to finish
        if self._update_thread and self._update_thread.is_alive():
            self._update_thread.join(timeout=5)
        
        # Save torrent resume data
        self._save_resume_data()
        
        # Stop all torrents and close session
        if self._lt_session:
            for info_hash, handle in list(self._torrents.items()):
                self._remove_torrent(info_hash)
            self._lt_session = None
        
        logger.info("Torrent service stopped")
    
    def _init_session(self):
        """Initialize libtorrent session"""
        # Create session
        self._lt_session = lt.session()
        
        # Set session settings
        settings = {
            'user_agent': 'JellyTorrent/1.0',
            'listen_interfaces': f"0.0.0.0:{self.port}" if not self.use_random_port else "0.0.0.0:0",
            'download_rate_limit': self.max_download_rate * 1024 if self.max_download_rate > 0 else 0,
            'upload_rate_limit': self.max_upload_rate * 1024,
            'alert_mask': lt.alert.category_t.all_categories,
            'outgoing_interfaces': "",
            'announce_to_all_trackers': True,
            'announce_to_all_tiers': True,
            'auto_manage_interval': 5,
            'auto_scrape_interval': 60,
            'auto_scrape_min_interval': 30,
            'enable_upnp': True,
            'enable_natpmp': True,
            'enable_lsd': True,
            'enable_dht': True
        }
        
        self._lt_session.apply_settings(settings)
        
        # Set encryption settings
        enc_settings = lt.pe_settings()
        enc_settings.out_enc_policy = lt.enc_policy(self.encryption)
        enc_settings.in_enc_policy = lt.enc_policy(self.encryption)
        enc_settings.allowed_enc_level = lt.enc_level.both
        enc_settings.prefer_rc4 = True
        self._lt_session.set_pe_settings(enc_settings)
        
        # Load DHT state if available
        dht_state_file = os.path.join(self.download_dir, "dht.state")
        if os.path.exists(dht_state_file):
            try:
                with open(dht_state_file, "rb") as f:
                    self._lt_session.load_state(lt.bdecode(f.read()))
                logger.info("Loaded DHT state")
            except Exception as e:
                logger.error(f"Failed to load DHT state: {e}")
        
        logger.info(f"Initialized libtorrent {lt.version} session")
    
    def _update_loop(self):
        """Background thread to update torrent status"""
        while self.running:
            try:
                # Process alerts
                self._process_alerts()
                
                # Update torrent statuses
                self._update_torrent_statuses()
                
                # Save resume data periodically
                current_time = time.time()
                if current_time % 60 < 1:  # Every minute
                    self._save_resume_data()
                
                # Sleep for a short time
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Error in update loop: {e}")
                time.sleep(1)
    
    def _process_alerts(self):
        """Process alerts from libtorrent"""
        if not self._lt_session:
            return
            
        alerts = self._lt_session.pop_alerts()
        for alert in alerts:
            if isinstance(alert, lt.torrent_finished_alert):
                info_hash = str(alert.handle.info_hash())
                logger.info(f"Torrent finished: {info_hash}")
                
            elif isinstance(alert, lt.save_resume_data_alert):
                info_hash = str(alert.handle.info_hash())
                self._save_torrent_resume_data(info_hash, alert.resume_data)
                
            elif isinstance(alert, lt.save_resume_data_failed_alert):
                logger.warning(f"Failed to save resume data: {alert.message()}")
                
            elif isinstance(alert, lt.fastresume_rejected_alert):
                logger.warning(f"Resume data rejected: {alert.message()}")
                
            elif isinstance(alert, lt.torrent_error_alert):
                logger.error(f"Torrent error: {alert.message()}")
    
    def _update_torrent_statuses(self):
        """Update status for all torrents"""
        if not self._lt_session:
            return
            
        for info_hash, handle in list(self._torrents.items()):
            if not handle.is_valid():
                continue
                
            status = handle.status()
            
            # Update status dictionary
            self._torrent_statuses[info_hash] = {
                'info_hash': info_hash,
                'name': status.name,
                'progress': status.progress * 100,
                'download_rate': status.download_rate / 1024,  # KB/s
                'upload_rate': status.upload_rate / 1024,  # KB/s
                'state': self._get_state_string(status.state),
                'num_peers': status.num_peers,
                'total_download': status.total_download,
                'total_upload': status.total_upload,
                'is_seeding': status.is_seeding,
                'is_finished': status.is_finished,
                'has_metadata': handle.has_metadata(),
                'files': self._get_files(handle) if handle.has_metadata() else [],
                'trackers': self._get_trackers(handle),
                'save_path': handle.save_path(),
                'prioritized_files': self._get_prioritized_files(handle)
            }
    
    def _get_state_string(self, state):
        """Convert libtorrent state to string"""
        states = {
            lt.torrent_status.checking_files: "checking_files",
            lt.torrent_status.downloading_metadata: "downloading_metadata",
            lt.torrent_status.downloading: "downloading",
            lt.torrent_status.finished: "finished",
            lt.torrent_status.seeding: "seeding",
            lt.torrent_status.allocating: "allocating",
            lt.torrent_status.checking_resume_data: "checking_resume_data"
        }
        return states.get(state, "unknown")
    
    def _get_files(self, handle):
        """Get files in the torrent"""
        if not handle.has_metadata():
            return []
            
        files = []
        torrent_info = handle.get_torrent_info()
        for i in range(torrent_info.num_files()):
            file_entry = torrent_info.file_at(i)
            files.append({
                'index': i,
                'path': file_entry.path,
                'size': file_entry.size,
                'offset': file_entry.offset
            })
        return files
    
    def _get_trackers(self, handle):
        """Get trackers for the torrent"""
        return [tracker.url for tracker in handle.trackers()]
    
    def _get_prioritized_files(self, handle):
        """Get files that have been prioritized"""
        if not handle.has_metadata():
            return []
            
        file_priorities = handle.file_priorities()
        torrent_info = handle.get_torrent_info()
        
        prioritized = []
        for i in range(torrent_info.num_files()):
            if file_priorities[i] > 0:
                file_entry = torrent_info.file_at(i)
                prioritized.append({
                    'index': i,
                    'path': file_entry.path,
                    'priority': file_priorities[i]
                })
        return prioritized
    
    def _save_resume_data(self):
        """Save resume data for all torrents"""
        if not self._lt_session:
            return
            
        for info_hash, handle in list(self._torrents.items()):
            if handle.is_valid() and handle.has_metadata():
                handle.save_resume_data()
    
    def _save_torrent_resume_data(self, info_hash, resume_data):
        """Save resume data for a specific torrent"""
        if not info_hash:
            return
            
        resume_file = os.path.join(self.download_dir, f"{info_hash}.fastresume")
        try:
            with open(resume_file, "wb") as f:
                f.write(lt.bencode(resume_data))
        except Exception as e:
            logger.error(f"Failed to save resume data for {info_hash}: {e}")
    
    def _save_session_state(self):
        """Save session state to disk"""
        if not self._lt_session:
            return
            
        try:
            state = self._lt_session.save_state()
            state_file = os.path.join(self.download_dir, "session.state")
            with open(state_file, "wb") as f:
                f.write(lt.bencode(state))
                
            # Save DHT state
            dht_state = self._lt_session.dht_state()
            dht_state_file = os.path.join(self.download_dir, "dht.state")
            with open(dht_state_file, "wb") as f:
                f.write(lt.bencode(dht_state))
                
            logger.info("Saved session state")
        except Exception as e:
            logger.error(f"Failed to save session state: {e}")
    
    def _parse_size(self, size_str):
        """Parse size string (e.g., '50MB') to bytes"""
        if isinstance(size_str, int):
            return size_str
            
        size_str = size_str.upper().strip()
        if size_str.endswith('KB'):
            return int(float(size_str[:-2]) * 1024)
        elif size_str.endswith('MB'):
            return int(float(size_str[:-2]) * 1024 * 1024)
        elif size_str.endswith('GB'):
            return int(float(size_str[:-2]) * 1024 * 1024 * 1024)
        elif size_str.endswith('TB'):
            return int(float(size_str[:-2]) * 1024 * 1024 * 1024 * 1024)
        else:
            try:
                return int(size_str)
            except ValueError:
                return 50 * 1024 * 1024  # Default to 50MB
    
    def add_torrent(self, magnet_or_url, save_path=None, info_hash=None):
        """Add a torrent by magnet link or URL"""
        if not self._lt_session:
            logger.error("Torrent service not initialized")
            return None
        
        if save_path is None:
            save_path = self.download_dir
            
        # Create save path if it doesn't exist
        os.makedirs(save_path, exist_ok=True)
        
        # Prepare add torrent params
        params = {
            'save_path': save_path,
            'storage_mode': lt.storage_mode_t.storage_mode_sparse,
            'paused': False,
            'auto_managed': True,
            'duplicate_is_error': False
        }
        
        # Try to load resume data if we have the info hash
        if info_hash:
            resume_file = os.path.join(self.download_dir, f"{info_hash}.fastresume")
            if os.path.exists(resume_file):
                try:
                    with open(resume_file, "rb") as f:
                        resume_data = f.read()
                    params['resume_data'] = lt.bdecode(resume_data)
                except Exception as e:
                    logger.error(f"Failed to load resume data: {e}")
        
        # Add the torrent
        try:
            if magnet_or_url.startswith('magnet:'):
                params['url'] = magnet_or_url
                handle = lt.add_magnet_uri(self._lt_session, magnet_or_url, params)
            else:
                # Assume it's a URL or local file
                if os.path.exists(magnet_or_url):
                    # Local .torrent file
                    with open(magnet_or_url, 'rb') as f:
                        params['ti'] = lt.torrent_info(lt.bdecode(f.read()))
                else:
                    # URL to .torrent file, download it first
                    import requests
                    response = requests.get(magnet_or_url)
                    torrent_data = response.content
                    params['ti'] = lt.torrent_info(lt.bdecode(torrent_data))
                
                handle = self._lt_session.add_torrent(params)
            
            info_hash = str(handle.info_hash())
            self._torrents[info_hash] = handle
            
            logger.info(f"Added torrent: {info_hash}")
            return info_hash
            
        except Exception as e:
            logger.error(f"Failed to add torrent: {e}")
            return None
    
    def remove_torrent(self, info_hash, remove_files=False):
        """Remove a torrent"""
        return self._remove_torrent(info_hash, remove_files)
    
    def _remove_torrent(self, info_hash, remove_files=False):
        """Internal method to remove a torrent"""
        if not self._lt_session or info_hash not in self._torrents:
            return False
            
        try:
            handle = self._torrents[info_hash]
            self._lt_session.remove_torrent(handle, 1 if remove_files else 0)
            del self._torrents[info_hash]
            
            if info_hash in self._torrent_statuses:
                del self._torrent_statuses[info_hash]
                
            # Remove resume file
            resume_file = os.path.join(self.download_dir, f"{info_hash}.fastresume")
            if os.path.exists(resume_file):
                os.remove(resume_file)
                
            logger.info(f"Removed torrent: {info_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove torrent: {e}")
            return False
    
    def get_torrent_status(self, info_hash):
        """Get status of a specific torrent"""
        return self._torrent_statuses.get(info_hash)
    
    def get_all_torrents(self):
        """Get status of all torrents"""
        return list(self._torrent_statuses.values())
    
    def pause_torrent(self, info_hash):
        """Pause a torrent"""
        if not self._lt_session or info_hash not in self._torrents:
            return False
            
        try:
            handle = self._torrents[info_hash]
            handle.pause()
            logger.info(f"Paused torrent: {info_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to pause torrent: {e}")
            return False
    
    def resume_torrent(self, info_hash):
        """Resume a torrent"""
        if not self._lt_session or info_hash not in self._torrents:
            return False
            
        try:
            handle = self._torrents[info_hash]
            handle.resume()
            logger.info(f"Resumed torrent: {info_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to resume torrent: {e}")
            return False
    
    def set_file_priorities(self, info_hash, file_priorities):
        """Set priorities for files in a torrent
        
        Args:
            info_hash (str): Torrent info hash
            file_priorities (list): List of (file_index, priority) tuples
        """
        if not self._lt_session or info_hash not in self._torrents:
            return False
            
        try:
            handle = self._torrents[info_hash]
            if not handle.has_metadata():
                logger.warning(f"Cannot set file priorities: torrent has no metadata yet")
                return False
                
            torrent_info = handle.get_torrent_info()
            num_files = torrent_info.num_files()
            
            # Get current priorities
            current_priorities = list(handle.file_priorities())
            
            # Update priorities
            for file_index, priority in file_priorities:
                if 0 <= file_index < num_files:
                    current_priorities[file_index] = priority
            
            # Set new priorities
            handle.prioritize_files(current_priorities)
            
            logger.info(f"Set file priorities for torrent: {info_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to set file priorities: {e}")
            return False
    
    def get_stream_url(self, info_hash, file_index):
        """Get URL for streaming a file from a torrent"""
        if not self._lt_session or info_hash not in self._torrents:
            return None
            
        try:
            handle = self._torrents[info_hash]
            if not handle.has_metadata():
                logger.warning(f"Cannot get stream URL: torrent has no metadata yet")
                return None
                
            torrent_info = handle.get_torrent_info()
            num_files = torrent_info.num_files()
            
            if not 0 <= file_index < num_files:
                logger.warning(f"Invalid file index: {file_index}")
                return None
                
            # Prioritize the selected file
            priorities = [0] * num_files
            priorities[file_index] = 7  # Highest priority
            handle.prioritize_files(priorities)
            
            # Get file path
            file_entry = torrent_info.file_at(file_index)
            file_path = os.path.join(handle.save_path(), file_entry.path)
            
            # Generate a stream URL
            stream_url = f"/api/stream/{info_hash}/{file_index}"
            
            logger.info(f"Stream URL for {info_hash}, file {file_index}: {stream_url}")
            return stream_url
        except Exception as e:
            logger.error(f"Failed to get stream URL: {e}")
            return None
    
    def get_file_path(self, info_hash, file_index):
        """Get the filesystem path for a file in a torrent"""
        if not self._lt_session or info_hash not in self._torrents:
            return None
            
        try:
            handle = self._torrents[info_hash]
            if not handle.has_metadata():
                logger.warning(f"Cannot get file path: torrent has no metadata yet")
                return None
                
            torrent_info = handle.get_torrent_info()
            num_files = torrent_info.num_files()
            
            if not 0 <= file_index < num_files:
                logger.warning(f"Invalid file index: {file_index}")
                return None
                
            file_entry = torrent_info.file_at(file_index)
            file_path = os.path.join(handle.save_path(), file_entry.path)
            
            return file_path
        except Exception as e:
            logger.error(f"Failed to get file path: {e}")
            return None
    
    def is_file_ready(self, info_hash, file_index, min_buffer_percent=10):
        """Check if a file is ready for streaming
        
        Args:
            info_hash (str): Torrent info hash
            file_index (int): File index
            min_buffer_percent (float): Minimum buffer percentage to consider ready
            
        Returns:
            bool: True if the file is ready for streaming
        """
        if not self._lt_session or info_hash not in self._torrents:
            return False
            
        try:
            handle = self._torrents[info_hash]
            if not handle.has_metadata():
                return False
                
            torrent_info = handle.get_torrent_info()
            num_files = torrent_info.num_files()
            
            if not 0 <= file_index < num_files:
                return False
                
            file_entry = torrent_info.file_at(file_index)
            file_size = file_entry.size
            
            # Get piece size and first/last piece of the file
            piece_length = torrent_info.piece_length()
            file_offset = file_entry.offset
            first_piece = int(file_offset / piece_length)
            last_piece = int((file_offset + file_size - 1) / piece_length)
            
            # Calculate buffer size in bytes
            buffer_size = min(self.buffer_size, file_size)
            
            # Calculate number of pieces in buffer
            buffer_pieces = int(buffer_size / piece_length) + 1
            
            # Check if the initial buffer is downloaded
            pieces_status = handle.status().pieces
            for i in range(first_piece, min(first_piece + buffer_pieces, last_piece + 1)):
                if not pieces_status[i]:
                    return False
            
            return True
        except Exception as e:
            logger.error(f"Failed to check if file is ready: {e}")
            return False
    
    def get_download_progress(self, info_hash, file_index):
        """Get download progress for a specific file
        
        Returns:
            tuple: (downloaded_bytes, total_bytes, percentage)
        """
        if not self._lt_session or info_hash not in self._torrents:
            return (0, 0, 0)
            
        try:
            handle = self._torrents[info_hash]
            if not handle.has_metadata():
                return (0, 0, 0)
                
            torrent_info = handle.get_torrent_info()
            num_files = torrent_info.num_files()
            
            if not 0 <= file_index < num_files:
                return (0, 0, 0)
                
            file_entry = torrent_info.file_at(file_index)
            file_size = file_entry.size
            
            # Get piece size and first/last piece of the file
            piece_length = torrent_info.piece_length()
            file_offset = file_entry.offset
            first_piece = int(file_offset / piece_length)
            last_piece = int((file_offset + file_size - 1) / piece_length)
            
            # Count downloaded pieces
            pieces_status = handle.status().pieces
            downloaded_pieces = 0
            for i in range(first_piece, last_piece + 1):
                if pieces_status[i]:
                    downloaded_pieces += 1
            
            total_pieces = last_piece - first_piece + 1
            downloaded_bytes = min(downloaded_pieces * piece_length, file_size)
            percentage = (downloaded_pieces / total_pieces) * 100 if total_pieces > 0 else 0
            
            return (downloaded_bytes, file_size, percentage)
        except Exception as e:
            logger.error(f"Failed to get download progress: {e}")
            return (0, 0, 0)