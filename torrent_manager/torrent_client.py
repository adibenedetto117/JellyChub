import libtorrent as lt
import time
import os
import hashlib
from threading import Thread, Lock

class TorrentClient:
    """A wrapper class for libtorrent to manage torrents."""
    
    def __init__(self):
        """Initialize the torrent client."""
        # Create a session
        self.session = lt.session()
        
        # Configure the session
        settings = {
            'listen_interfaces': '0.0.0.0:6881',
            'alert_mask': lt.alert.category_t.all_categories
        }
        self.session.apply_settings(settings)
        
        # Set up storage for torrents
        self.torrents = {}  # Maps hash to handle
        self.torrent_info = {}  # Maps hash to metadata
        self.download_dir = os.path.expanduser("~/Downloads/torrents")
        
        # Thread for processing alerts
        self.lock = Lock()
        self.running = True
        self.alert_thread = Thread(target=self._process_alerts)
        self.alert_thread.daemon = True
        self.alert_thread.start()
    
    def set_download_dir(self, path):
        """Set the download directory."""
        if os.path.isdir(path):
            self.download_dir = path
            os.makedirs(self.download_dir, exist_ok=True)
    
    def add_torrent_file(self, file_path):
        """Add a torrent file to the session."""
        try:
            info = lt.torrent_info(file_path)
            torrent_hash = str(info.info_hash())
            
            with self.lock:
                if torrent_hash in self.torrents:
                    return torrent_hash  # Already added
                
                params = {
                    'save_path': self.download_dir,
                    'ti': info
                }
                
                handle = self.session.add_torrent(params)
                self.torrents[torrent_hash] = handle
                
                # Store metadata
                self.torrent_info[torrent_hash] = {
                    'name': info.name(),
                    'size': info.total_size(),
                    'files': [f.path for f in info.files()],
                    'added_time': time.time(),
                    'status': 'downloading'
                }
                
                return torrent_hash
        except Exception as e:
            print(f"Error adding torrent file: {e}")
            return None
    
    def add_magnet(self, magnet_link):
        """Add a magnet link to the session."""
        try:
            params = {
                'save_path': self.download_dir,
                'url': magnet_link,
                'storage_mode': lt.storage_mode_t.storage_mode_sparse
            }
            
            handle = self.session.add_torrent(params)
            torrent_hash = str(handle.info_hash())
            
            with self.lock:
                self.torrents[torrent_hash] = handle
                
                # Store preliminary metadata
                self.torrent_info[torrent_hash] = {
                    'name': f"Magnet-{torrent_hash[:8]}",
                    'size': 0,
                    'files': [],
                    'added_time': time.time(),
                    'status': 'downloading'
                }
                
                return torrent_hash
        except Exception as e:
            print(f"Error adding magnet: {e}")
            return None
    
    def remove_torrent(self, torrent_hash):
        """Remove a torrent from the session."""
        with self.lock:
            if torrent_hash in self.torrents:
                self.session.remove_torrent(self.torrents[torrent_hash])
                del self.torrents[torrent_hash]
                if torrent_hash in self.torrent_info:
                    del self.torrent_info[torrent_hash]
    
    def pause_torrent(self, torrent_hash):
        """Pause a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                self.torrents[torrent_hash].pause()
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'paused'
    
    def resume_torrent(self, torrent_hash):
        """Resume a paused torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                self.torrents[torrent_hash].resume()
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'downloading'
    
    def get_torrents(self):
        """Get information about all torrents."""
        result = []
        
        with self.lock:
            for torrent_hash, handle in self.torrents.items():
                info = self.torrent_info.get(torrent_hash, {}).copy()
                
                # Update with current status
                status = handle.status()
                
                info.update({
                    'hash': torrent_hash,
                    'progress': status.progress * 100,
                    'download_rate': status.download_rate / 1024,  # KiB/s
                    'upload_rate': status.upload_rate / 1024,  # KiB/s
                    'peers': status.num_peers,
                    'seeds': status.num_seeds,
                    'state': str(status.state),
                    'total_downloaded': status.total_downloaded / (1024 * 1024),  # MiB
                    'total_uploaded': status.total_uploaded / (1024 * 1024)  # MiB
                })
                
                # Update name if available
                if handle.has_metadata() and not info['name'].startswith('Magnet-'):
                    ti = handle.get_torrent_info()
                    info['name'] = ti.name()
                    info['size'] = ti.total_size()
                    info['files'] = [f.path for f in ti.files()]
                
                result.append(info)
        
        return result
    
    def _process_alerts(self):
        """Process alerts from libtorrent in a background thread."""
        while self.running:
            alerts = self.session.pop_alerts()
            for alert in alerts:
                # Process metadata received alerts
                if isinstance(alert, lt.metadata_received_alert):
                    torrent_hash = str(alert.handle.info_hash())
                    with self.lock:
                        if torrent_hash in self.torrents:
                            handle = self.torrents[torrent_hash]
                            if handle.has_metadata():
                                ti = handle.get_torrent_info()
                                # Update metadata
                                self.torrent_info[torrent_hash].update({
                                    'name': ti.name(),
                                    'size': ti.total_size(),
                                    'files': [f.path for f in ti.files()]
                                })
                
                # Process other alerts as needed
                # ...
            
            time.sleep(1)  # Sleep to avoid high CPU usage
    
    def shutdown(self):
        """Shutdown the client properly."""
        self.running = False
        if self.alert_thread.is_alive():
            self.alert_thread.join(timeout=2)
        
        # Save session state if needed
        # ...
        
        # Remove all torrents
        with self.lock:
            for handle in self.torrents.values():
                self.session.remove_torrent(handle)
            self.torrents.clear()
            self.torrent_info.clear()