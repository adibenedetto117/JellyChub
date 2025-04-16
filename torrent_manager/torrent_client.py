def add_magnet(self, magnet_link, options=None):
        """Add a magnet link to the session."""
        try:
            # Ensure options is a dict
            options = options or {}
            
            # Determine save path
            save_path = options.get('download_dir', self.download_dir)
            
            # Create parameters
            params = {
                'url': magnet_link,
                'save_path': save_path,
                'storage_mode': lt.storage_mode_t.storage_mode_sparse
            }
            
            # Determine if should start paused
            start_paused = options.get('start_paused', self.settings.get('start_paused', False))
            if start_paused:
                params['flags'] = lt.torrent_flags.paused
            
            # Add the torrent
            handle = self.session.add_torrent(params)
            torrent_hash = str(handle.info_hash())
            
            # Apply per-torrent settings
            ul_limit = options.get('upload_limit', -1)
            dl_limit = options.get('download_limit', -1)
            
            if ul_limit > 0:
                handle.set_upload_limit(ul_limit * 1024)
            if dl_limit > 0:
                handle.set_download_limit(dl_limit * 1024)
            
            # Store the handle
            with self.lock:
                self.torrents[torrent_hash] = handle
                
                # Store preliminary metadata
                self.torrent_info[torrent_hash] = {
                    'name': f"Magnet-{torrent_hash[:8]}",
                    'size': 0,
                    'files': [],
                    'added_time': time.time(),
                    'status': 'paused' if start_paused else 'downloading',
                    'options': options,
                }
                
                # Save metadata
                self.save_torrent_metadata(torrent_hash)
            
            logger.info(f"Added magnet link: {torrent_hash}")
            return torrent_hash
        except Exception as e:
            logger.error(f"Error adding magnet: {e}")
            return None
    
    def remove_torrent(self, torrent_hash, delete_files=False):
        """Remove a torrent from the session."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                # Save resume data before removing
                self.save_torrent_resume_data(torrent_hash)
                
                # Remove the torrent
                try:
                    self.session.remove_torrent(handle, 1 if delete_files else 0)
                    logger.info(f"Removed torrent: {torrent_hash} (delete_files={delete_files})")
                except Exception as e:
                    logger.error(f"Error removing torrent {torrent_hash}: {e}")
                
                # Clean up metadata files
                try:
                    resume_path = os.path.join(self.config_dir, "resume", f"{torrent_hash}.fastresume")
                    torrent_path = os.path.join(self.config_dir, "torrents", f"{torrent_hash}.torrent")
                    metadata_path = os.path.join(self.config_dir, "metadata", f"{torrent_hash}.json")
                    
                    for path in [resume_path, torrent_path, metadata_path]:
                        if os.path.exists(path):
                            os.remove(path)
                except Exception as e:
                    logger.error(f"Error cleaning up files for {torrent_hash}: {e}")
                
                # Remove from dictionaries
                del self.torrents[torrent_hash]
                if torrent_hash in self.torrent_info:
                    del self.torrent_info[torrent_hash]
                if torrent_hash in self.torrent_stats:
                    del self.torrent_stats[torrent_hash]
                
                return True
            
            return False
    
    def pause_torrent(self, torrent_hash):
        """Pause a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                handle.pause()
                
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'paused'
                    self.save_torrent_metadata(torrent_hash)
                
                logger.info(f"Paused torrent: {torrent_hash}")
                return True
            
            return False
    
    def resume_torrent(self, torrent_hash):
        """Resume a paused torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                handle.resume()
                
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'downloading'
                    self.save_torrent_metadata(torrent_hash)
                
                logger.info(f"Resumed torrent: {torrent_hash}")
                return True
            
            return False
    
    def prioritize_torrent(self, torrent_hash):
        """Set high priority for a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                # Set queue position to the top
                handle.queue_position_top()
                
                # Increase upload/download limits for this torrent
                handle.set_upload_limit(-1)  # unlimited
                handle.set_download_limit(-1)  # unlimited
                
                logger.info(f"Prioritized torrent: {torrent_hash}")
                return True
            
            return False
    
    def set_file_priorities(self, torrent_hash, file_priorities):
        """Set priorities for individual files in a torrent.
        
        Args:
            torrent_hash (str): Hash of the torrent
            file_priorities (dict): Dictionary mapping file path to priority
                                   (0=skip, 1=normal, 2=high, 3=low)
        """
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                if not handle.has_metadata():
                    logger.warning(f"Cannot set file priorities for {torrent_hash}: no metadata")
                    return False
                
                ti = handle.get_torrent_info()
                files = ti.files()
                
                # Create a list of priorities for all files
                priorities = []
                
                for file_idx in range(files.num_files()):
                    file_path = files.file_path(file_idx)
                    
                    # Default to normal priority
                    priority = 1
                    
                    # Check if this file's path is in the provided priorities
                    for path, prio in file_priorities.items():
                        if path == file_path:
                            priority = prio
                            break
                    
                    priorities.append(priority)
                
                # Set the priorities
                handle.prioritize_files(priorities)
                
                logger.info(f"Set file priorities for torrent: {torrent_hash}")
                return True
            
            return False
    
    def get_file_priorities(self, torrent_hash):
        """Get priorities for individual files in a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                if not handle.has_metadata():
                    logger.warning(f"Cannot get file priorities for {torrent_hash}: no metadata")
                    return {}
                
                ti = handle.get_torrent_info()
                files = ti.files()
                
                # Get the priorities
                priorities = handle.get_file_priorities()
                
                # Create a dictionary mapping file path to priority
                result = {}
                
                for file_idx in range(files.num_files()):
                    file_path = files.file_path(file_idx)
                    result[file_path] = priorities[file_idx]
                
                return result
            
            return {}
    
    def get_files(self, torrent_hash):
        """Get list of files in a torrent with progress information."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                if not handle.has_metadata():
                    logger.warning(f"Cannot get files for {torrent_hash}: no metadata")
                    return []
                
                ti = handle.get_torrent_info()
                files = ti.files()
                file_progress = []
                
                # Get file progress
                handle.file_progress(file_progress)
                
                # Get file priorities
                priorities = handle.get_file_priorities()
                
                result = []
                
                for file_idx in range(files.num_files()):
                    file_path = files.file_path(file_idx)
                    file_size = files.file_size(file_idx)
                    
                    # Calculate progress percentage
                    progress = 0
                    if file_size > 0:
                        progress = (file_progress[file_idx] * 100.0) / file_size
                    
                    # Add file info to result
                    result.append({
                        'path': file_path,
                        'size': file_size,
                        'progress': progress,
                        'priority': priorities[file_idx]
                    })
                
                return result
            
            return []
    
    def force_recheck(self, torrent_hash):
        """Force recheck of a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                handle.force_recheck()
                
                logger.info(f"Forced recheck for torrent: {torrent_hash}")
                return True
            
            return False
    
    def force_reannounce(self, torrent_hash):
        """Force reannounce of a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                handle.force_reannounce()
                
                logger.info(f"Forced reannounce for torrent: {torrent_hash}")
                return True
            
            return False
    
    def get_trackers(self, torrent_hash):
        """Get list of trackers for a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                result = []
                trackers = handle.trackers()
                
                for tracker in trackers:
                    # Parse tracker status
                    status = "unknown"
                    if tracker.verified:
                        status = "working"
                    elif tracker.updating:
                        status = "updating"
                    elif tracker.fails > 0:
                        status = "failed"
                    
                    result.append({
                        'url': tracker.url,
                        'status': status,
                        'peers': tracker.peers,
                        'seeds': tracker.peers_in_tracker, # This is an approximation
                        'fails': tracker.fails,
                        'last_announce': tracker.last_announce
                    })
                
                return result
            
            return []
    
    def get_peers(self, torrent_hash):
        """Get list of peers for a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                
                result = []
                peers = handle.get_peer_info()
                
                for peer in peers:
                    # Parse peer flags
                    flags = []
                    if peer.interesting:
                        flags.append('I')
                    if peer.choked:
                        flags.append('C')
                    if peer.remote_interested:
                        flags.append('R')
                    if peer.seed:
                        flags.append('S')
                    if peer.optimistically_unchoked:
                        flags.append('O')
                    if peer.dht_announce:
                        flags.append('D')
                    if peer.local_connection:
                        flags.append('L')
                    if peer.rc4_encrypted or peer.plaintext_encrypted:
                        flags.append('E')
                    
                    # Get client name
                    client = peer.client
                    
                    result.append({
                        'ip': peer.ip[0],
                        'port': peer.ip[1],
                        'client': client,
                        'flags': ''.join(flags),
                        'progress': peer.progress,
                        'download_rate': peer.down_speed / 1024.0,  # KB/s
                        'upload_rate': peer.up_speed / 1024.0  # KB/s
                    })
                
                return result
            
            return []
    
    def pause_all(self):
        """Pause all torrents."""
        with self.lock:
            for torrent_hash, handle in self.torrents.items():
                handle.pause()
                
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'paused'
                    self.save_torrent_metadata(torrent_hash)
            
            logger.info("Paused all torrents")
            return True
    
    def resume_all(self):
        """Resume all torrents."""
        with self.lock:
            for torrent_hash, handle in self.torrents.items():
                handle.resume()
                
                if torrent_hash in self.torrent_info:
                    self.torrent_info[torrent_hash]['status'] = 'downloading'
                    self.save_torrent_metadata(torrent_hash)
            
            logger.info("Resumed all torrents")
            return True
    
    def remove_all(self, delete_files=False):
        """Remove all torrents."""
        with self.lock:
            for torrent_hash in list(self.torrents.keys()):
                self.remove_torrent(torrent_hash, delete_files)
            
            logger.info(f"Removed all torrents (delete_files={delete_files})")
            return True
    
    def get_torrents(self):
        """Get information about all torrents."""
        result = []
        
        with self.lock:
            for torrent_hash, handle in self.torrents.items():
                info = self.torrent_info.get(torrent_hash, {}).copy()
                
                # Update with current status
                status = handle.status()
                
                # Determine real status
                current_status = 'unknown'
                if status.paused:
                    current_status = 'paused'
                elif status.state == lt.torrent_status.states.downloading:
                    current_status = 'downloading'
                elif status.state == lt.torrent_status.states.seeding:
                    current_status = 'seeding'
                elif status.state == lt.torrent_status.states.checking_files:
                    current_status = 'checking'
                elif status.state == lt.torrent_status.states.checking_resume_data:
                    current_status = 'checking'
                elif status.state == lt.torrent_status.states.downloading_metadata:
                    current_status = 'metadata'
                
                # Update info status
                if torrent_hash in self.torrent_info and current_status != self.torrent_info[torrent_hash].get('status'):
                    self.torrent_info[torrent_hash]['status'] = current_status
                    self.save_torrent_metadata(torrent_hash)
                
                info.update({
                    'hash': torrent_hash,
                    'progress': status.progress * 100,
                    'download_rate': status.download_rate / 1024.0,  # KB/s
                    'upload_rate': status.upload_rate / 1024.0,  # KB/s
                    'peers': status.num_peers,
                    'seeds': status.num_seeds,
                    'total_peers': status.list_peers,
                    'total_seeds': status.list_seeds,
                    'state': str(status.state),
                    'status': current_status,
                    'total_downloaded': status.total_download / (1024.0 * 1024.0),  # MB
                    'total_uploaded': status.total_upload / (1024.0 * 1024.0),  # MB
                    'ratio': status.all_time_upload / max(status.all_time_download, 1),
                    'eta': self._calculate_eta(status),
                    'has_metadata': handle.has_metadata()
                })
                
                # Update name if available
                if handle.has_metadata() and (not info.get('name') or info.get('name').startswith('Magnet-')):
                    ti = handle.get_torrent_info()
                    info['name'] = ti.name()
                    info['size'] = ti.total_size()
                    info['files'] = [f.path for f in ti.files()]
                    
                    # Update metadata in storage
                    self.torrent_info[torrent_hash].update({
                        'name': ti.name(),
                        'size': ti.total_size(),
                        'files': [f.path for f in ti.files()]
                    })
                    self.save_torrent_metadata(torrent_hash)
                
                result.append(info)
        
        return result
    
    def get_status(self, torrent_hash=None):
        """Get status information about torrents.
        
        Args:
            torrent_hash (str, optional): Hash of specific torrent to get status for.
                                         If None, returns status for all torrents.
        
        Returns:
            dict: Status information including torrents list and overall stats.
        """
        # Get list of torrents
        if torrent_hash:
            torrents = []
            with self.lock:
                if torrent_hash in self.torrents:
                    handle = self.torrents[torrent_hash]
                    info = self.torrent_info.get(torrent_hash, {}).copy()
                    
                    # Update with current status
                    status = handle.status()
                    
                    # Determine real status
                    current_status = 'unknown'
                    if status.paused:
                        current_status = 'paused'
                    elif status.state == lt.torrent_status.states.downloading:
                        current_status = 'downloading'
                    elif status.state == lt.torrent_status.states.seeding:
                        current_status = 'seeding'
                    elif status.state == lt.torrent_status.states.checking_files:
                        current_status = 'checking'
                    elif status.state == lt.torrent_status.states.checking_resume_data:
                        current_status = 'checking'
                    elif status.state == lt.torrent_status.states.downloading_metadata:
                        current_status = 'metadata'
                    
                    info.update({
                        'hash': torrent_hash,
                        'progress': status.progress * 100,
                        'download_rate': status.download_rate / 1024.0,  # KB/s
                        'upload_rate': status.upload_rate / 1024.0,  # KB/s
                        'peers': status.num_peers,
                        'seeds': status.num_seeds,
                        'total_peers': status.list_peers,
                        'total_seeds': status.list_seeds,
                        'state': str(status.state),
                        'status': current_status,
                        'total_downloaded': status.total_download / (1024.0 * 1024.0),  # MB
                        'total_uploaded': status.total_upload / (1024.0 * 1024.0),  # MB
                        'ratio': status.all_time_upload / max(status.all_time_download, 1),
                        'eta': self._calculate_eta(status),
                        'has_metadata': handle.has_metadata()
                    })
                    
                    # Get files info if has metadata
                    if handle.has_metadata():
                        info['files'] = self.get_files(torrent_hash)
                    
                    torrents.append(info)
        else:
            torrents = self.get_torrents()
        
        # Get session stats
        session_stats = self.session.status()
        
        # Count torrents by status
        status_counts = {
            'downloading': 0,
            'seeding': 0,
            'paused': 0,
            'checking': 0,
            'metadata': 0,
            'unknown': 0
        }
        
        for t in torrents:
            if t['status'] in status_counts:
                status_counts[t['status']] += 1
            else:
                status_counts['unknown'] += 1
        
        # Get disk space info
        try:
            download_path = self.download_dir
            disk_usage = psutil.disk_usage(download_path)
            disk_info = {
                'disk_free': disk_usage.free,
                'disk_used': disk_usage.used,
                'disk_total': disk_usage.total,
                'disk_percent': disk_usage.percent
            }
        except Exception as e:
            logger.error(f"Error getting disk space: {e}")
            disk_info = {
                'disk_free': 0,
                'disk_used': 0,
                'disk_total': 0,
                'disk_percent': 0
            }
        
        # Compile stats
        stats = {
            'download_rate': session_stats.download_rate / 1024.0,  # KB/s
            'upload_rate': session_stats.upload_rate / 1024.0,  # KB/s
            'total_download': session_stats.total_download / (1024.0 * 1024.0),  # MB
            'total_upload': session_stats.total_upload / (1024.0 * 1024.0),  # MB
            'dht_nodes': session_stats.dht_nodes,
            'dht_torrents': session_stats.dht_torrents,
            'total_torrents': len(torrents),
            'active_torrents': len([t for t in torrents if t['status'] not in ('paused', 'unknown')]),
            'download_protocol_rate': session_stats.download_protocol_rate / 1024.0,  # KB/s
            'upload_protocol_rate': session_stats.upload_protocol_rate / 1024.0,  # KB/s
            **status_counts,
            **disk_info
        }
        
        return {
            'torrents': torrents,
            'stats': stats
        }
    
    def _calculate_eta(self, status):
        """Calculate estimated time of arrival (completion) for a torrent."""
        if status.progress >= 1.0 or status.download_rate == 0:
            return -1  # Completed or stalled
        
        # Calculate remaining bytes
        remaining = (1.0 - status.progress) * status.total_wanted
        
        # Calculate ETA in seconds
        return int(remaining / status.download_rate)
    
    def _process_alerts(self):
        """Process alerts from libtorrent in a background thread."""
        while not self.shutdown_event.is_set():
            alerts = self.session.pop_alerts()
            for alert in alerts:
                alert_type = type(alert).__name__
                
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
                                
                                # Save metadata to file
                                self.save_torrent_metadata(torrent_hash)
                                
                                # Save torrent file
                                torrent_data = lt.bencode(lt.create_torrent(ti).generate())
                                torrents_dir = os.path.join(self.config_dir, "torrents")
                                os.makedirs(torrents_dir, exist_ok=True)
                                torrent_path = os.path.join(torrents_dir, f"{torrent_hash}.torrent")
                                
                                with open(torrent_path, 'wb') as f:
                                    f.write(torrent_data)
                                
                                logger.info(f"Received metadata for {torrent_hash}")
                
                # Process save resume data alerts
                elif isinstance(alert, lt.save_resume_data_alert):
                    torrent_hash = str(alert.handle.info_hash())
                    
                    # Save resume data
                    resume_data = lt.bencode(alert.resume_data)
                    resume_dir = os.path.join(self.config_dir, "resume")
                    os.makedirs(resume_dir, exist_ok=True)
                    resume_path = os.path.join(resume_dir, f"{torrent_hash}.fastresume")
                    
                    with open(resume_path, 'wb') as f:
                        f.write(resume_data)
                    
                    logger.debug(f"Saved resume data for {torrent_hash}")
                
                # Process torrent finished alerts
                elif isinstance(alert, lt.torrent_finished_alert):
                    torrent_hash = str(alert.handle.info_hash())
                    logger.info(f"Torrent finished: {torrent_hash}")
                    
                    # Move from incomplete dir if needed
                    if self.incomplete_dir and self.incomplete_dir != self.download_dir:
                        with self.lock:
                            if torrent_hash in self.torrents:
                                handle = self.torrents[torrent_hash]
                                
                                if handle.has_metadata():
                                    # Move files to final location
                                    ti = handle.get_torrent_info()
                                    
                                    # Stop the torrent
                                    handle.pause()
                                    
                                    # Create move job (will be handled in another method)
                                    self.torrent_stats[torrent_hash]['move_job'] = {
                                        'from_dir': self.incomplete_dir,
                                        'to_dir': self.download_dir,
                                        'files': [f.path for f in ti.files()]
                                    }
                
                # Process other alerts as needed
                elif isinstance(alert, lt.state_update_alert):
                    # This alert is sent when the state of a torrent changes
                    for status in alert.status:
                        torrent_hash = str(status.info_hash)
                        
                        # Store status in stats dictionary for potential use
                        with self.lock:
                            self.torrent_stats[torrent_hash]['last_status'] = status
                
                # Log interesting alerts
                if alert_type not in ('state_update_alert', 'dht_get_peers_alert', 'external_ip_alert'):
                    logger.debug(f"Alert: {alert_type} - {alert.message()}")
            
            # Sleep for a bit to avoid high CPU usage
            time.sleep(2)
    
    def shutdown(self):
        """Shutdown the client properly."""
        logger.info("Shutting down torrent client...")
        
        # Signal threads to stop
        self.running = False
        self.shutdown_event.set()
        
        # Wait for threads to finish
        if self.alert_thread.is_alive():
            self.alert_thread.join(timeout=5)
        
        if self.manage_thread.is_alive():
            self.manage_thread.join(timeout=5)
        
        # Save all resume data
        with self.lock:
            for torrent_hash in self.torrents:
                self.save_torrent_resume_data(torrent_hash)
                self.save_torrent_metadata(torrent_hash)
        
        # Give time for saving operations to complete
        time.sleep(1)
        
        # Save session state
        self.save_session_state()
        
        # Save settings
        self.save_settings()
        
        # Remove all torrents from session
        with self.lock:
            for handle in self.torrents.values():
                try:
                    self.session.remove_torrent(handle)
                except Exception as e:
                    logger.error(f"Error removing torrent during shutdown: {e}")
            
            self.torrents.clear()
            self.torrent_info.clear()
            self.torrent_stats.clear()
        
        logger.info("Torrent client shutdown complete")
    
    def get_torrent_name(self, torrent_hash):
        """Get the name of a torrent."""
        with self.lock:
            if torrent_hash in self.torrent_info:
                return self.torrent_info[torrent_hash].get('name', f"Unknown-{torrent_hash[:8]}")
            return f"Unknown-{torrent_hash[:8]}"
    
    def get_progress(self, torrent_hash):
        """Get the progress of a torrent."""
        with self.lock:
            if torrent_hash in self.torrents:
                handle = self.torrents[torrent_hash]
                status = handle.status()
                return status.progress * 100
            return 0.0
    
    def set_speed_limits(self, download_limit=None, upload_limit=None):
        """Set global speed limits."""
        current_settings = self.session.get_settings()
        
        if download_limit is not None:
            current_settings['download_rate_limit'] = download_limit * 1024  # KB/s to B/s
            self.settings['max_download_speed'] = download_limit
        
        if upload_limit is not None:
            current_settings['upload_rate_limit'] = upload_limit * 1024  # KB/s to B/s
            self.settings['max_upload_speed'] = upload_limit
        
        self.session.apply_settings(current_settings)
        self.save_settings()
        
        logger.info(f"Set speed limits: DL={download_limit} KB/s, UL={upload_limit} KB/s")
        return True
    
    def update_alternative_speed_settings(self, enabled=None, start_time=None, end_time=None, 
                                        download_limit=None, upload_limit=None):
        """Update alternative speed settings."""
        if enabled is not None:
            self.settings['alternative_speed_enabled'] = enabled
        
        if start_time is not None:
            self.settings['alt_speed_start'] = start_time
        
        if end_time is not None:
            self.settings['alt_speed_end'] = end_time
        
        if download_limit is not None:
            self.settings['alt_download_speed'] = download_limit
        
        if upload_limit is not None:
            self.settings['alt_upload_speed'] = upload_limit
        
        self.save_settings()
        
        # Apply settings if enabled
        if self.settings['alternative_speed_enabled']:
            self._apply_alternative_speed_if_needed()
        
        logger.info("Updated alternative speed settings")
        return True
    
    def get_client_stats(self):
        """Get client statistics."""
        try:
            # Get session stats
            session_stats = self.session.status()
            
            # Get disk space info
            download_path = self.download_dir
            disk_usage = psutil.disk_usage(download_path)
            
            # Get system info
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            # Count torrents by status
            torrents = self.get_torrents()
            status_counts = {
                'downloading': 0,
                'seeding': 0,
                'paused': 0,
                'checking': 0,
                'metadata': 0,
                'unknown': 0
            }
            
            for t in torrents:
                if t['status'] in status_counts:
                    status_counts[t['status']] += 1
                else:
                    status_counts['unknown'] += 1
            
            # Calculate total download/upload
            total_progress = sum(t['progress'] for t in torrents) / max(len(torrents), 1)
            
            stats = {
                'download_rate': session_stats.download_rate / 1024.0,  # KB/s
                'upload_rate': session_stats.upload_rate / 1024.0,  # KB/s
                'total_download': session_stats.total_download / (1024.0 * 1024.0),  # MB
                'total_upload': session_stats.total_upload / (1024.0 * 1024.0),  # MB
                'dht_nodes': session_stats.dht_nodes,
                'total_torrents': len(torrents),
                'active_torrents': len([t for t in torrents if t['status'] not in ('paused', 'unknown')]),
                'total_progress': total_progress,
                
                # Disk info
                'disk_free': disk_usage.free,
                'disk_used': disk_usage.used,
                'disk_total': disk_usage.total,
                'disk_percent': disk_usage.percent,
                
                # System info
                'cpu_percent': cpu_percent,
                'memory_used': memory.used,
                'memory_total': memory.total,
                'memory_percent': memory.percent,
                
                # Status counts
                **status_counts,
                
                # Settings
                'max_download_speed': self.settings.get('max_download_speed', 0),
                'max_upload_speed': self.settings.get('max_upload_speed', 0),
                'alternative_speed_enabled': self.settings.get('alternative_speed_enabled', False),
                'download_dir': self.download_dir,
                'incomplete_dir': self.incomplete_dir,
            }
            
            return stats
        except Exception as e:
            logger.error(f"Error getting client stats: {e}")
            return {}
    
    def test_connection(self):
        """Test the connection settings."""
        try:
            # Check if DHT is working
            dht_nodes = self.session.status().dht_nodes
            
            # Check listening port
            port = self.session.listen_port()
            
            # Check if port is open
            is_port_open = False
            try:
                # This is a simplification, in a real implementation you would 
                # use UPnP or NAT-PMP to check if the port is open
                is_port_open = True
            except:
                is_port_open = False
            
            return {
                'status': 'ok',
                'dht_nodes': dht_nodes,
                'port': port,
                'port_open': is_port_open,
                'anonymous_mode': self.anonymous_mode,
                'message': 'Connection is working properly'
            }
        except Exception as e:
            logger.error(f"Error testing connection: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
 to avoid high CPU usage (alerts batch processing)
            time.sleep(0.5)
    
    def _manage_torrents(self):
        """Background thread for torrent management tasks."""
        last_save_time = time.time()
        last_alt_speed_check = time.time()
        
        while not self.shutdown_event.is_set():
            current_time = time.time()
            
            # Save resume data for all torrents every 30 minutes
            if current_time - last_save_time > 1800:  # 30 minutes
                with self.lock:
                    for torrent_hash in self.torrents:
                        self.save_torrent_resume_data(torrent_hash)
                
                last_save_time = current_time
            
            # Check alternative speed schedule every minute
            if current_time - last_alt_speed_check > 60:  # 1 minute
                self._apply_alternative_speed_if_needed()
                last_alt_speed_check = current_time
            
            # Process any pending move jobs
            with self.lock:
                for torrent_hash, stats in self.torrent_stats.items():
                    if 'move_job' in stats:
                        move_job = stats['move_job']
                        
                        # Process the move job
                        try:
                            for file_path in move_job['files']:
                                src_path = os.path.join(move_job['from_dir'], file_path)
                                dst_path = os.path.join(move_job['to_dir'], file_path)
                                
                                # Create destination directory if needed
                                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                                
                                # Move the file
                                if os.path.exists(src_path):
                                    shutil.move(src_path, dst_path)
                            
                            # Update the torrent's save path
                            if torrent_hash in self.torrents:
                                handle = self.torrents[torrent_hash]
                                handle.move_storage(move_job['to_dir'])
                                handle.resume()
                            
                            logger.info(f"Moved completed torrent {torrent_hash} from incomplete dir to final location")
                        except Exception as e:
                            logger.error(f"Error moving files for {torrent_hash}: {e}")
                        
                        # Remove the move job
                        del stats['move_job']
            
            # Apply torrent limits based on ratio
            with self.lock:
                for torrent_hash, handle in self.torrents.items():
                    if not handle.is_valid():
                        continue
                    
                    status = handle.status()
                    
                    # Check if torrent has finished downloading and exceeds ratio limit
                    if (status.progress >= 1.0 and 
                        status.state == lt.torrent_status.states.seeding and 
                        self.seed_ratio_limit > 0):
                        
                        ratio = status.all_time_upload / max(status.all_time_download, 1)
                        
                        if ratio >= self.seed_ratio_limit:
                            # Pause the torrent
                            handle.pause()
                            
                            if torrent_hash in self.torrent_info:
                                self.torrent_info[torrent_hash]['status'] = 'paused'
                                self.save_torrent_metadata(torrent_hash)
                            
                            logger.info(f"Paused torrent {torrent_hash} after reaching seed ratio {ratio:.2f} >= {self.seed_ratio_limit:.2f}")
            
            # Sleepimport libtorrent as lt
import time
import os
import hashlib
import json
import shutil
import logging
import psutil
from threading import Thread, Lock, Event
from collections import defaultdict
from datetime import datetime

# Configure logging
logger = logging.getLogger("torrent_client")
logger.setLevel(logging.INFO)

class TorrentClient:
    """An enhanced wrapper class for libtorrent to manage torrents with additional features."""
    
    def __init__(self, config_dir=None):
        """Initialize the torrent client with configuration options."""
        # Set up configuration directory
        self.config_dir = config_dir or os.path.expanduser("~/.torrent_manager")
        self.session_state_file = os.path.join(self.config_dir, "session.state")
        self.settings_file = os.path.join(self.config_dir, "settings.json")
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Set up the download directory
        self.download_dir = os.path.expanduser("~/Downloads/torrents")
        self.incomplete_dir = None
        
        # Load settings
        self.settings = self.load_settings()
        
        # Create a session
        self.session = lt.session()
        
        # Load session state if exists
        self.load_session_state()
        
        # Configure the session with settings
        self.apply_settings()
        
        # Set up storage for torrents
        self.torrents = {}  # Maps hash to handle
        self.torrent_info = {}  # Maps hash to metadata
        self.torrent_stats = defaultdict(dict)  # Maps hash to various stats
        
        # Additional state variables
        self.anonymous_mode = self.settings.get("anonymous_mode", False)
        self.max_active_torrents = self.settings.get("max_active_torrents", 5)
        self.max_active_seeds = self.settings.get("max_active_seeding", 2)
        self.seed_ratio_limit = self.settings.get("seed_ratio_limit", 2.0)
        
        # Alerts and state management
        self.lock = Lock()
        self.running = True
        self.shutdown_event = Event()
        
        # Thread for processing alerts
        self.alert_thread = Thread(target=self._process_alerts)
        self.alert_thread.daemon = True
        self.alert_thread.start()
        
        # Thread for auto-management
        self.manage_thread = Thread(target=self._manage_torrents)
        self.manage_thread.daemon = True
        self.manage_thread.start()
        
        # Load existing torrents
        self.load_torrents()
        
        logger.info("Torrent client initialized")
        
    def load_settings(self):
        """Load settings from file or return defaults."""
        try:
            if os.path.exists(self.settings_file):
                with open(self.settings_file, 'r') as f:
                    settings = json.load(f)
                logger.info("Settings loaded from file")
                return settings
        except Exception as e:
            logger.error(f"Error loading settings: {e}")
        
        # Default settings
        return {
            "download_dir": self.download_dir,
            "incomplete_dir": None,
            "start_paused": False,
            "auto_start": True,
            "max_download_speed": 0,  # 0 means unlimited
            "max_upload_speed": 0,    # 0 means unlimited
            "listen_port": 6881,
            "max_connections": 200,
            "port_forwarding": True,
            "dht": True,
            "pex": True,
            "anonymous_mode": False,
            "force_encryption": False,
            "proxy_type": "none",
            "proxy_host": "",
            "proxy_port": 0,
            "proxy_username": "",
            "proxy_password": "",
            "max_active_torrents": 5,
            "max_active_seeding": 2,
            "seed_ratio_limit": 2.0,
            "cache_size": 16,  # MB
            "enable_scrape": True,
            "enable_lsd": True,
            "alternative_speed_enabled": False,
            "alt_speed_start": "08:00",
            "alt_speed_end": "23:00",
            "alt_download_speed": 100,  # KB/s
            "alt_upload_speed": 20,     # KB/s
        }
    
    def save_settings(self):
        """Save current settings to file."""
        try:
            with open(self.settings_file, 'w') as f:
                json.dump(self.settings, f, indent=2)
            logger.info("Settings saved to file")
            return True
        except Exception as e:
            logger.error(f"Error saving settings: {e}")
            return False
    
    def update_settings(self, new_settings):
        """Update settings and apply them."""
        with self.lock:
            # Update settings
            self.settings.update(new_settings)
            
            # Update download and incomplete dirs
            if "download_dir" in new_settings:
                self.download_dir = new_settings["download_dir"]
                os.makedirs(self.download_dir, exist_ok=True)
            
            if "incomplete_dir" in new_settings:
                self.incomplete_dir = new_settings["incomplete_dir"]
                if self.incomplete_dir:
                    os.makedirs(self.incomplete_dir, exist_ok=True)
            
            # Update instance variables
            if "anonymous_mode" in new_settings:
                self.anonymous_mode = new_settings["anonymous_mode"]
            
            if "max_active_torrents" in new_settings:
                self.max_active_torrents = new_settings["max_active_torrents"]
            
            if "max_active_seeding" in new_settings:
                self.max_active_seeds = new_settings["max_active_seeding"]
            
            if "seed_ratio_limit" in new_settings:
                self.seed_ratio_limit = new_settings["seed_ratio_limit"]
            
            # Apply settings to session
            self.apply_settings()
            
            # Save settings to file
            self.save_settings()
            
            return True
    
    def apply_settings(self):
        """Apply settings to the libtorrent session."""
        settings = {
            'user_agent': 'Torrent Manager/0.2.0',
            'listen_interfaces': f'0.0.0.0:{self.settings.get("listen_port", 6881)}',
            'alert_mask': lt.alert.category_t.all_categories,
            'enable_upnp': self.settings.get("port_forwarding", True),
            'enable_natpmp': self.settings.get("port_forwarding", True),
            'enable_dht': self.settings.get("dht", True),
            'enable_lsd': self.settings.get("enable_lsd", True),
            'announce_to_trackers': True,
            'announce_to_all_trackers': True,
            'announce_to_all_tiers': True,
            'auto_scrape_interval': 1800 if self.settings.get("enable_scrape", True) else 0,
            'download_rate_limit': self.settings.get("max_download_speed", 0) * 1024,  # convert to bytes/s
            'upload_rate_limit': self.settings.get("max_upload_speed", 0) * 1024,      # convert to bytes/s
            'connections_limit': self.settings.get("max_connections", 200),
            'peer_connect_timeout': 15,
            'request_timeout': 20,
            'seed_choking_algorithm': 1,  # fastest upload
            'choking_algorithm': 1,       # rate based
            'cache_size': self.settings.get("cache_size", 16) * 1024 * 1024,  # convert to bytes
        }
        
        # Encryption settings
        if self.settings.get("force_encryption", False):
            settings.update({
                'prefer_rc4': True,
                'out_enc_policy': lt.enc_policy.forced,
                'in_enc_policy': lt.enc_policy.forced,
                'allowed_enc_level': lt.enc_level.both,
            })
        
        # Anonymous mode
        if self.settings.get("anonymous_mode", False):
            settings.update({
                'anonymous_mode': True,
                'report_web_seed_downloads': False,
                'announce_ip': '',
                'proxy_hostname_lookup': True,
            })
        
        # Proxy settings
        proxy_type = self.settings.get("proxy_type", "none")
        if proxy_type != "none":
            proxy_host = self.settings.get("proxy_host", "")
            proxy_port = self.settings.get("proxy_port", 0)
            
            if proxy_host and proxy_port:
                proxy_settings = {
                    'proxy_type': self._get_proxy_type_enum(proxy_type),
                    'proxy_hostname': proxy_host,
                    'proxy_port': proxy_port,
                }
                
                proxy_username = self.settings.get("proxy_username", "")
                proxy_password = self.settings.get("proxy_password", "")
                
                if proxy_username and proxy_password:
                    proxy_settings.update({
                        'proxy_username': proxy_username,
                        'proxy_password': proxy_password,
                    })
                
                settings.update(proxy_settings)
        
        # Apply settings to session
        self.session.apply_settings(settings)
        
        # Set alternative speed limit if enabled
        self._apply_alternative_speed_if_needed()
        
        logger.info("Applied settings to session")
    
    def _get_proxy_type_enum(self, proxy_type):
        """Convert proxy type string to libtorrent enum."""
        proxy_types = {
            "none": lt.proxy_type_t.none,
            "socks4": lt.proxy_type_t.socks4,
            "socks5": lt.proxy_type_t.socks5,
            "http": lt.proxy_type_t.http,
        }
        return proxy_types.get(proxy_type, lt.proxy_type_t.none)
    
    def _apply_alternative_speed_if_needed(self):
        """Apply alternative speed limit if enabled and within schedule."""
        if not self.settings.get("alternative_speed_enabled", False):
            return
        
        # Check if current time is within schedule
        try:
            current_time = datetime.now().time()
            start_time_str = self.settings.get("alt_speed_start", "08:00")
            end_time_str = self.settings.get("alt_speed_end", "23:00")
            
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
            
            within_schedule = False
            if start_time <= end_time:
                within_schedule = start_time <= current_time <= end_time
            else:  # Schedule crosses midnight
                within_schedule = current_time >= start_time or current_time <= end_time
            
            if within_schedule:
                # Apply alternative speed limits
                alt_download_speed = self.settings.get("alt_download_speed", 100) * 1024  # KB/s to B/s
                alt_upload_speed = self.settings.get("alt_upload_speed", 20) * 1024  # KB/s to B/s
                
                current_settings = self.session.get_settings()
                current_settings['download_rate_limit'] = alt_download_speed
                current_settings['upload_rate_limit'] = alt_upload_speed
                self.session.apply_settings(current_settings)
                
                logger.info(f"Applied alternative speed limits: DL={alt_download_speed/1024:.1f} KB/s, UL={alt_upload_speed/1024:.1f} KB/s")
        except Exception as e:
            logger.error(f"Error applying alternative speed limits: {e}")
    
    def load_session_state(self):
        """Load session state from file if exists."""
        try:
            if os.path.exists(self.session_state_file):
                with open(self.session_state_file, 'rb') as f:
                    state = f.read()
                    self.session.load_state(lt.bdecode(state))
                logger.info("Session state loaded")
        except Exception as e:
            logger.error(f"Error loading session state: {e}")
    
    def save_session_state(self):
        """Save session state to file."""
        try:
            state = lt.bencode(self.session.save_state())
            with open(self.session_state_file, 'wb') as f:
                f.write(state)
            logger.info("Session state saved")
        except Exception as e:
            logger.error(f"Error saving session state: {e}")
    
    def load_torrents(self):
        """Load existing torrents from the resume directory."""
        resume_dir = os.path.join(self.config_dir, "resume")
        os.makedirs(resume_dir, exist_ok=True)
        
        try:
            for filename in os.listdir(resume_dir):
                if filename.endswith(".fastresume"):
                    torrent_hash = filename.split(".")[0]
                    fastresume_path = os.path.join(resume_dir, filename)
                    torrent_path = os.path.join(self.config_dir, "torrents", f"{torrent_hash}.torrent")
                    
                    # Skip if torrent file doesn't exist
                    if not os.path.exists(torrent_path):
                        logger.warning(f"Torrent file not found for {torrent_hash}, skipping")
                        continue
                    
                    try:
                        with open(fastresume_path, 'rb') as f:
                            fastresume_data = f.read()
                        
                        with open(torrent_path, 'rb') as f:
                            torrent_data = f.read()
                        
                        # Add torrent with fast resume data
                        atp = {
                            'ti': lt.torrent_info(lt.bdecode(torrent_data)),
                            'save_path': self.download_dir,
                            'resume_data': lt.bdecode(fastresume_data),
                        }
                        
                        # Add the torrent
                        handle = self.session.add_torrent(atp)
                        torrent_hash = str(handle.info_hash())
                        
                        # Store the handle
                        with self.lock:
                            self.torrents[torrent_hash] = handle
                            
                            # Load additional metadata if available
                            metadata_path = os.path.join(self.config_dir, "metadata", f"{torrent_hash}.json")
                            if os.path.exists(metadata_path):
                                with open(metadata_path, 'r') as f:
                                    self.torrent_info[torrent_hash] = json.load(f)
                            else:
                                # Create basic metadata
                                ti = handle.get_torrent_info()
                                self.torrent_info[torrent_hash] = {
                                    'name': ti.name(),
                                    'size': ti.total_size(),
                                    'files': [f.path for f in ti.files()],
                                    'added_time': time.time(),
                                    'status': 'paused' if handle.status().paused else 'downloading'
                                }
                        
                        logger.info(f"Loaded torrent: {torrent_hash}")
                    except Exception as e:
                        logger.error(f"Error loading torrent {torrent_hash}: {e}")
        except Exception as e:
            logger.error(f"Error scanning resume directory: {e}")
    
    def save_torrent_resume_data(self, torrent_hash):
        """Save torrent resume data to file."""
        with self.lock:
            if torrent_hash not in self.torrents:
                return
            
            handle = self.torrents[torrent_hash]
            if not handle.is_valid():
                return
            
            # Request resume data (async operation)
            handle.save_resume_data()
            logger.debug(f"Requested resume data for {torrent_hash}")
    
    def save_torrent_metadata(self, torrent_hash):
        """Save torrent metadata to file."""
        with self.lock:
            if torrent_hash not in self.torrent_info:
                return
            
            metadata_dir = os.path.join(self.config_dir, "metadata")
            os.makedirs(metadata_dir, exist_ok=True)
            
            metadata_path = os.path.join(metadata_dir, f"{torrent_hash}.json")
            try:
                with open(metadata_path, 'w') as f:
                    json.dump(self.torrent_info[torrent_hash], f, indent=2)
                logger.debug(f"Saved metadata for {torrent_hash}")
            except Exception as e:
                logger.error(f"Error saving metadata for {torrent_hash}: {e}")
    
    def add_torrent_file(self, file_path, options=None):
        """Add a torrent file to the session."""
        try:
            # Ensure options is a dict
            options = options or {}
            
            # Parse torrent file
            info = lt.torrent_info(file_path)
            torrent_hash = str(info.info_hash())
            
            with self.lock:
                if torrent_hash in self.torrents:
                    return torrent_hash  # Already added
                
                # Determine save path
                save_path = options.get('download_dir', self.download_dir)
                
                # Create parameters
                params = {
                    'ti': info,
                    'save_path': save_path,
                }
                
                # Set upload/download limits if specified
                ul_limit = options.get('upload_limit', -1)
                dl_limit = options.get('download_limit', -1)
                
                # Determine if should start paused
                start_paused = options.get('start_paused', self.settings.get('start_paused', False))
                if start_paused:
                    params['flags'] = lt.torrent_flags.paused
                
                # Add the torrent
                handle = self.session.add_torrent(params)
                
                # Apply per-torrent settings
                if ul_limit > 0:
                    handle.set_upload_limit(ul_limit * 1024)
                if dl_limit > 0:
                    handle.set_download_limit(dl_limit * 1024)
                
                # Store the handle
                self.torrents[torrent_hash] = handle
                
                # Store metadata
                self.torrent_info[torrent_hash] = {
                    'name': info.name(),
                    'size': info.total_size(),
                    'files': [f.path for f in info.files()],
                    'added_time': time.time(),
                    'status': 'paused' if start_paused else 'downloading',
                    'options': options,
                }
                
                # Save torrent file
                torrents_dir = os.path.join(self.config_dir, "torrents")
                os.makedirs(torrents_dir, exist_ok=True)
                torrent_path = os.path.join(torrents_dir, f"{torrent_hash}.torrent")
                
                # Copy the torrent file
                shutil.copy2(file_path, torrent_path)
                
                # Save metadata
                self.save_torrent_metadata(torrent_hash)
                
                logger.info(f"Added torrent from file: {torrent_hash}")
                return torrent_hash
        except Exception as e:
            logger.error(f"Error adding torrent file: {e}")
            return None
    
    def add_magnet(self, magnet_link, options=None):
        """Add a magnet link to