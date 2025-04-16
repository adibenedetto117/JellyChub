/**
 * Torrents handler for JellyTorrent
 */
class TorrentsHandler {
    constructor() {
        this.torrentsBody = document.getElementById('torrentsBody');
        this.addTorrentBtn = document.getElementById('addTorrentBtn');
        this.addTorrentForm = document.getElementById('addTorrentForm');
        this.addTorrentModal = new bootstrap.Modal(document.getElementById('addTorrentModal'));
        this.torrentDetailsModal = new bootstrap.Modal(document.getElementById('torrentDetailsModal'));
        
        this.currentTorrentInfoHash = null;
        this.updateInterval = null;
        
        this.init();
    }

    /**
     * Initialize torrents handler
     */
    init() {
        // Add event listeners
        this.addTorrentBtn.addEventListener('click', this.handleAddTorrent.bind(this));
        
        // Setup detail modal event listeners
        document.getElementById('detailPauseResumeBtn').addEventListener('click', this.handlePauseResume.bind(this));
        document.getElementById('detailRemoveBtn').addEventListener('click', this.handleRemove.bind(this));
        
        // Load initial torrents
        if (api.isAuthenticated()) {
            this.loadTorrents();
        }
        
        // Setup automatic refresh
        this.startPeriodicUpdates();
    }

    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Clear existing interval if any
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update torrents every 3 seconds
        this.updateInterval = setInterval(() => {
            if (api.isAuthenticated() && !document.getElementById('torrents-page').classList.contains('d-none')) {
                this.loadTorrents();
            }
        }, 3000);
    }

    /**
     * Stop periodic updates
     */
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Load torrents from API
     */
    async loadTorrents() {
        if (!api.isAuthenticated()) {
            return;
        }
        
        try {
            const torrents = await api.getTorrents();
            this.displayTorrents(torrents);
        } catch (error) {
            console.error('Load torrents error:', error);
        }
    }

    /**
     * Display torrents in table
     * @param {Array} torrents - List of torrents
     */
    displayTorrents(torrents) {
        // Clear existing rows
        this.torrentsBody.innerHTML = '';
        
        if (!torrents || torrents.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center">No active torrents</td>
            `;
            this.torrentsBody.appendChild(emptyRow);
            return;
        }
        
        // Add torrent rows
        torrents.forEach(torrent => {
            const row = document.createElement('tr');
            
            // Format progress
            const progress = Math.round(torrent.progress * 100) / 100;
            
            // Format status badge class
            let statusClass = 'bg-primary';
            switch (torrent.state) {
                case 'downloading':
                    statusClass = 'bg-primary';
                    break;
                case 'seeding':
                    statusClass = 'bg-success';
                    break;
                case 'paused':
                    statusClass = 'bg-warning';
                    break;
                case 'checking_files':
                case 'checking_resume_data':
                    statusClass = 'bg-info';
                    break;
                case 'error':
                    statusClass = 'bg-danger';
                    break;
                default:
                    statusClass = 'bg-secondary';
            }
            
            row.innerHTML = `
                <td>${torrent.name}</td>
                <td>${this.formatSize(torrent.total_download)}</td>
                <td>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
                    </div>
                </td>
                <td>${this.formatSize(torrent.download_rate)}/s</td>
                <td><span class="badge ${statusClass}">${torrent.state}</span></td>
                <td>
                    <button class="btn btn-sm btn-info torrent-details-btn" data-hash="${torrent.info_hash}">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button class="btn btn-sm ${torrent.state === 'paused' ? 'btn-success' : 'btn-warning'} torrent-pause-resume-btn" data-hash="${torrent.info_hash}" data-state="${torrent.state}">
                        <i class="bi ${torrent.state === 'paused' ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger torrent-remove-btn" data-hash="${torrent.info_hash}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            this.torrentsBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        this.addButtonEventListeners();
    }

    /**
     * Add event listeners to torrent action buttons
     */
    addButtonEventListeners() {
        // Details buttons
        const detailBtns = document.querySelectorAll('.torrent-details-btn');
        detailBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const infoHash = btn.dataset.hash;
                this.showTorrentDetails(infoHash);
            });
        });
        
        // Pause/Resume buttons
        const pauseResumeBtns = document.querySelectorAll('.torrent-pause-resume-btn');
        pauseResumeBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const infoHash = btn.dataset.hash;
                const state = btn.dataset.state;
                
                try {
                    if (state === 'paused') {
                        await api.resumeTorrent(infoHash);
                    } else {
                        await api.pauseTorrent(infoHash);
                    }
                    // Refresh torrents list
                    this.loadTorrents();
                } catch (error) {
                    console.error('Pause/Resume error:', error);
                    this.showError(`Failed to ${state === 'paused' ? 'resume' : 'pause'} torrent`);
                }
            });
        });
        
        // Remove buttons
        const removeBtns = document.querySelectorAll('.torrent-remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const infoHash = btn.dataset.hash;
                
                if (confirm('Are you sure you want to remove this torrent?')) {
                    try {
                        const removeFiles = confirm('Do you also want to remove downloaded files?');
                        await api.removeTorrent(infoHash, removeFiles);
                        // Refresh torrents list
                        this.loadTorrents();
                    } catch (error) {
                        console.error('Remove torrent error:', error);
                        this.showError('Failed to remove torrent');
                    }
                }
            });
        });
    }

    /**
     * Handle add torrent button click
     */
    async handleAddTorrent() {
        const magnetUrl = document.getElementById('magnetUrl').value.trim();
        const savePath = document.getElementById('savePath').value.trim();
        
        if (!magnetUrl) {
            return;
        }
        
        try {
            await api.addTorrent(magnetUrl, savePath || null);
            this.addTorrentModal.hide();
            document.getElementById('magnetUrl').value = '';
            document.getElementById('savePath').value = '';
            
            // Show success notification
            this.showNotification('Torrent added successfully');
            
            // Refresh torrents list
            this.loadTorrents();
        } catch (error) {
            console.error('Add torrent error:', error);
            this.showError('Failed to add torrent');
        }
    }

    /**
     * Show torrent details modal
     * @param {string} infoHash - Torrent info hash
     */
    async showTorrentDetails(infoHash) {
        try {
            const torrent = await api.getTorrent(infoHash);
            
            if (!torrent) {
                this.showError('Torrent not found');
                return;
            }
            
            // Store current torrent info hash
            this.currentTorrentInfoHash = infoHash;
            
            // Update modal content
            document.getElementById('detailName').textContent = torrent.name;
            document.getElementById('detailStatus').textContent = torrent.state;
            document.getElementById('detailStatus').className = `badge ${this.getStatusClass(torrent.state)}`;
            document.getElementById('detailProgress').style.width = `${torrent.progress}%`;
            document.getElementById('detailProgress').textContent = `${Math.round(torrent.progress * 100) / 100}%`;
            document.getElementById('detailInfoHash').textContent = torrent.info_hash;
            document.getElementById('detailSavePath').textContent = torrent.save_path;
            document.getElementById('detailSize').textContent = this.formatSize(torrent.total_download);
            document.getElementById('detailDownloaded').textContent = this.formatSize(torrent.total_download);
            document.getElementById('detailUploaded').textContent = this.formatSize(torrent.total_upload);
            document.getElementById('detailDownloadSpeed').textContent = `${this.formatSize(torrent.download_rate)}/s`;
            document.getElementById('detailUploadSpeed').textContent = `${this.formatSize(torrent.upload_rate)}/s`;
            document.getElementById('detailPeers').textContent = torrent.num_peers;
            
            // Update pause/resume button
            const pauseResumeBtn = document.getElementById('detailPauseResumeBtn');
            if (torrent.state === 'paused') {
                pauseResumeBtn.textContent = 'Resume';
                pauseResumeBtn.className = 'btn btn-success';
            } else {
                pauseResumeBtn.textContent = 'Pause';
                pauseResumeBtn.className = 'btn btn-warning';
            }
            
            // Populate files table
            const filesTable = document.getElementById('detailFiles');
            filesTable.innerHTML = '';
            
            if (torrent.files && torrent.files.length > 0) {
                torrent.files.forEach(file => {
                    const row = document.createElement('tr');
                    
                    // Get file extension
                    const extension = file.path.split('.').pop().toLowerCase();
                    
                    // Determine if file is streamable
                    const isStreamable = this.isStreamableFormat(extension);
                    
                    row.innerHTML = `
                        <td>${file.path}</td>
                        <td>${this.formatSize(file.size)}</td>
                        <td>
                            <select class="form-select form-select-sm file-priority" data-index="${file.index}">
                                <option value="0" ${this.getPrioritySelected(file.index, 0, torrent.prioritized_files)}>Skip</option>
                                <option value="1" ${this.getPrioritySelected(file.index, 1, torrent.prioritized_files)}>Low</option>
                                <option value="4" ${this.getPrioritySelected(file.index, 4, torrent.prioritized_files)}>Normal</option>
                                <option value="7" ${this.getPrioritySelected(file.index, 7, torrent.prioritized_files)}>High</option>
                            </select>
                        </td>
                        <td>
                            ${isStreamable ? `
                                <button class="btn btn-sm btn-primary stream-file-btn" data-hash="${infoHash}" data-index="${file.index}">
                                    <i class="bi bi-play-fill"></i> Stream
                                </button>
                            ` : ''}
                        </td>
                    `;
                    
                    filesTable.appendChild(row);
                });
                
                // Add event listeners to file priority selects
                const prioritySelects = document.querySelectorAll('.file-priority');
                prioritySelects.forEach(select => {
                    select.addEventListener('change', async () => {
                        const fileIndex = parseInt(select.dataset.index);
                        const priority = parseInt(select.value);
                        
                        try {
                            await api.setFilePriorities(infoHash, [{ index: fileIndex, priority }]);
                            this.showNotification('File priority updated');
                        } catch (error) {
                            console.error('Set file priority error:', error);
                            this.showError('Failed to update file priority');
                        }
                    });
                });
                
                // Add event listeners to stream buttons
                const streamBtns = document.querySelectorAll('.stream-file-btn');
                streamBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const fileIndex = parseInt(btn.dataset.index);
                        this.streamFile(infoHash, fileIndex);
                    });
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="4" class="text-center">No files available yet. Waiting for metadata...</td>`;
                filesTable.appendChild(row);
            }
            
            // Show modal
            this.torrentDetailsModal.show();
        } catch (error) {
            console.error('Show torrent details error:', error);
            this.showError('Failed to load torrent details');
        }
    }

    /**
     * Handle pause/resume button in details modal
     */
    async handlePauseResume() {
        if (!this.currentTorrentInfoHash) {
            return;
        }
        
        try {
            const torrent = await api.getTorrent(this.currentTorrentInfoHash);
            
            if (torrent.state === 'paused') {
                await api.resumeTorrent(this.currentTorrentInfoHash);
            } else {
                await api.pauseTorrent(this.currentTorrentInfoHash);
            }
            
            // Refresh details
            this.showTorrentDetails(this.currentTorrentInfoHash);
            
            // Refresh torrents list
            this.loadTorrents();
        } catch (error) {
            console.error('Pause/Resume error:', error);
            this.showError(`Failed to ${torrent.state === 'paused' ? 'resume' : 'pause'} torrent`);
        }
    }

    /**
     * Handle remove button in details modal
     */
    async handleRemove() {
        if (!this.currentTorrentInfoHash) {
            return;
        }
        
        if (confirm('Are you sure you want to remove this torrent?')) {
            try {
                const removeFiles = confirm('Do you also want to remove downloaded files?');
                await api.removeTorrent(this.currentTorrentInfoHash, removeFiles);
                
                // Hide modal
                this.torrentDetailsModal.hide();
                
                // Clear current torrent
                this.currentTorrentInfoHash = null;
                
                // Show success notification
                this.showNotification('Torrent removed successfully');
                
                // Refresh torrents list
                this.loadTorrents();
            } catch (error) {
                console.error('Remove torrent error:', error);
                this.showError('Failed to remove torrent');
            }
        }
    }

    /**
     * Stream a file from torrent
     * @param {string} infoHash - Torrent info hash
     * @param {number} fileIndex - File index
     */
    streamFile(infoHash, fileIndex) {
        const streamUrl = api.getStreamUrl(infoHash, fileIndex);
        
        // Open in new window
        window.open(streamUrl, '_blank');
    }

    /**
     * Check if file format is streamable
     * @param {string} extension - File extension
     * @returns {boolean} Whether file is streamable
     */
    isStreamableFormat(extension) {
        const videoFormats = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
        const audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
        
        return videoFormats.includes(extension) || audioFormats.includes(extension);
    }

    /**
     * Get priority selected attribute
     * @param {number} fileIndex - File index
     * @param {number} priority - Priority value
     * @param {Array} prioritizedFiles - List of prioritized files
     * @returns {string} Selected attribute
     */
    getPrioritySelected(fileIndex, priority, prioritizedFiles) {
        if (!prioritizedFiles) {
            return priority === 4 ? 'selected' : '';
        }
        
        const file = prioritizedFiles.find(f => f.index === fileIndex);
        
        if (!file) {
            return priority === 4 ? 'selected' : '';
        }
        
        return file.priority === priority ? 'selected' : '';
    }

    /**
     * Get status badge class
     * @param {string} state - Torrent state
     * @returns {string} Badge class
     */
    getStatusClass(state) {
        switch (state) {
            case 'downloading':
                return 'bg-primary';
            case 'seeding':
                return 'bg-success';
            case 'paused':
                return 'bg-warning';
            case 'checking_files':
            case 'checking_resume_data':
                return 'bg-info';
            case 'error':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatSize(bytes) {
        if (!bytes) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // Create toast notification for error
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.appendChild(toast);
        
        document.body.appendChild(toastContainer);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toastContainer);
        });
    }

    /**
     * Show success notification
     * @param {string} message - Notification message
     */
    showNotification(message) {
        // Create toast notification for success
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.appendChild(toast);
        
        document.body.appendChild(toastContainer);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toastContainer);
        });
    }
}

// Initialize torrents handler
const torrentsHandler = new TorrentsHandler();