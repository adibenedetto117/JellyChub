// Global variables
let refreshInterval = null;
const DEFAULT_REFRESH_INTERVAL = 3000; // 3 seconds
let currentFilter = 'all';
let speedHistory = {
    download: Array(20).fill(0),
    upload: Array(20).fill(0)
};
let currentTorrentHash = null;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips and popovers
    initializeBootstrapComponents();
    
    // Start auto-refresh of torrent data
    startAutoRefresh();
    
    // Setup form validation for adding torrents
    setupTorrentForm();
    
    // Setup click handlers for the torrents table
    setupTableInteractions();
    
    // Setup filter buttons
    setupFilterButtons();
    
    // Setup files section
    setupFilesSection();
    
    // Setup modals
    setupModals();
    
    // First refresh
    refreshTorrents();
});

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize all tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize all popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Start auto-refresh of torrent data
 */
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(function() {
        // Only refresh if we're on the torrents page (has torrents-table)
        if (document.getElementById('torrents-table')) {
            refreshTorrents();
        }
    }, DEFAULT_REFRESH_INTERVAL);
}

/**
 * Setup the torrent add form
 */
function setupTorrentForm() {
    const form = document.getElementById('torrent-form');
    if (!form) return;
    
    // Show/hide advanced options
    const showAdvancedCheckbox = document.getElementById('show_advanced');
    const advancedOptions = document.getElementById('advanced-options');
    
    if (showAdvancedCheckbox && advancedOptions) {
        showAdvancedCheckbox.addEventListener('change', function() {
            advancedOptions.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Paste button for magnet link
    const pasteButton = document.getElementById('paste-magnet');
    const magnetInput = document.getElementById('magnet');
    
    if (pasteButton && magnetInput) {
        pasteButton.addEventListener('click', async function() {
            try {
                const text = await navigator.clipboard.readText();
                magnetInput.value = text;
            } catch (err) {
                showToast('Error', 'Could not read from clipboard. Please paste manually.', 'danger');
            }
        });
    }
    
    // Form validation
    form.addEventListener('submit', function(e) {
        const magnetInput = document.getElementById('magnet');
        const fileInput = document.getElementById('torrent_file');
        
        // Check if at least one input has a value
        if ((!magnetInput || !magnetInput.value.trim()) && 
            (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
            e.preventDefault();
            showToast('Error', 'Please enter a magnet link or select a torrent file.', 'danger');
            return false;
        }
        
        // Validate magnet link format if provided
        if (magnetInput && magnetInput.value.trim()) {
            const magnetValue = magnetInput.value.trim();
            if (!magnetValue.startsWith('magnet:?') && !magnetValue.startsWith('http')) {
                e.preventDefault();
                showToast('Error', 'Invalid magnet link or URL format.', 'danger');
                return false;
            }
        }
        
        // All validations passed, show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
        }
    });
}

/**
 * Setup interactions for the torrents table
 */
function setupTableInteractions() {
    const table = document.getElementById('torrents-table');
    if (!table) return;
    
    // Delegate click event to the table body
    table.querySelector('tbody').addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        
        // Only handle clicks on the row itself, not on action buttons
        if (row && row.dataset.hash && !e.target.closest('a.dropdown-item') && !e.target.closest('button.dropdown-toggle')) {
            showTorrentDetails(row.dataset.hash);
        }
    });
    
    // Handle refresh button click
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshTorrents();
        });
    }
    
    // Handle remove torrent buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.closest('.remove-torrent')) {
            e.preventDefault();
            const link = e.target.closest('.remove-torrent');
            const name = link.dataset.name || 'this torrent';
            
            if (confirm(`Are you sure you want to remove ${name}?`)) {
                window.location.href = link.href;
            }
        }
    });
}

/**
 * Setup filter buttons for the torrents table
 */
function setupFilterButtons() {
    const filterButtons = {
        'all': document.getElementById('filter-all'),
        'downloading': document.getElementById('filter-downloading'),
        'seeding': document.getElementById('filter-seeding'),
        'paused': document.getElementById('filter-paused'),
        'completed': document.getElementById('filter-completed')
    };
    
    // Add click handlers for filter buttons
    Object.keys(filterButtons).forEach(filter => {
        const button = filterButtons[filter];
        if (button) {
            button.addEventListener('click', function() {
                // Update active filter
                currentFilter = filter;
                
                // Update active button state
                Object.values(filterButtons).forEach(btn => {
                    if (btn) {
                        btn.classList.remove('active');
                    }
                });
                button.classList.add('active');
                
                // Apply filter
                applyTorrentFilter();
            });
        }
    });
}

/**
 * Apply the current filter to the torrents table
 */
function applyTorrentFilter() {
    const rows = document.querySelectorAll('#torrents-table tbody tr[data-hash]');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const status = row.dataset.status;
        const progress = parseFloat(row.querySelector('.progress-bar').style.width) || 0;
        
        let show = false;
        
        switch (currentFilter) {
            case 'all':
                show = true;
                break;
            case 'downloading':
                show = status === 'downloading';
                break;
            case 'seeding':
                show = status === 'seeding';
                break;
            case 'paused':
                show = status === 'paused';
                break;
            case 'completed':
                show = progress >= 100;
                break;
        }
        
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });
    
    // Show empty state if no visible torrents
    const tbody = document.querySelector('#torrents-table tbody');
    let emptyRow = tbody.querySelector('tr.empty-filter-row');
    
    if (visibleCount === 0 && rows.length > 0) {
        if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-filter-row';
            emptyRow.innerHTML = `
                <td colspan="7" class="text-center py-3">
                    No torrents match the current filter.
                </td>
            `;
            tbody.appendChild(emptyRow);
        } else {
            emptyRow.style.display = '';
        }
    } else if (emptyRow) {
        emptyRow.style.display = 'none';
    }
    
    // Update torrent count
    document.getElementById('torrent-count').textContent = visibleCount;
}

/**
 * Setup the files section
 */
function setupFilesSection() {
    const closeBtn = document.getElementById('close-files');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            document.getElementById('files-section').style.display = 'none';
        });
    }
}

/**
 * Setup modals
 */
function setupModals() {
    // Setup the remove all torrents modal
    const confirmRemoveAllBtn = document.getElementById('confirm-remove-all');
    const removeDataCheckbox = document.getElementById('remove-data');
    
    if (confirmRemoveAllBtn && removeDataCheckbox) {
        confirmRemoveAllBtn.addEventListener('click', function(e) {
            const removeData = removeDataCheckbox.checked;
            const url = new URL(this.href);
            
            if (removeData) {
                url.searchParams.append('remove_data', '1');
                this.href = url.toString();
            }
        });
    }
    
    // Setup view files button in torrent details modal
    const viewFilesBtn = document.getElementById('view-files-btn');
    if (viewFilesBtn) {
        viewFilesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (currentTorrentHash) {
                loadTorrentFiles(currentTorrentHash);
                
                // Close the details modal
                const detailsModal = bootstrap.Modal.getInstance(document.getElementById('torrentDetailsModal'));
                if (detailsModal) {
                    detailsModal.hide();
                }
            }
        });
    }
}

/**
 * Refresh the list of torrents
 */
function refreshTorrents() {
    // If we're not on the torrents page, don't refresh
    if (!document.getElementById('torrents-table')) {
        return;
    }
    
    // Show a loading indicator
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    fetch('/status')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateTorrentsTable(data.torrents);
            updateDashboardStats(data.stats);
        })
        .catch(error => {
            console.error('Error refreshing torrents:', error);
            showToast('Error', 'Failed to refresh torrents: ' + error.message, 'danger');
        })
        .finally(() => {
            // Reset the refresh button
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Refresh';
            }
            
            // Update the last updated time
            const updateTime = document.getElementById('update-time');
            if (updateTime) {
                const now = new Date();
                updateTime.textContent = 'Last updated: ' + now.toLocaleTimeString();
            }
        });
}

/**
 * Update the torrents table with new data
 */
function updateTorrentsTable(torrents) {
    const tbody = document.querySelector('#torrents-table tbody');
    if (!tbody) return;
    
    // If there are no torrents, show a message
    if (torrents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-download fa-3x mb-3 text-muted"></i>
                        <h5>No torrents found</h5>
                        <p class="text-muted">Add a new torrent to get started</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('torrent-count').textContent = '0';
        return;
    }
    
    // Clear the table if it only has the "no torrents" message
    if (tbody.querySelector('.empty-state')) {
        tbody.innerHTML = '';
    }
    
    // Get existing hashes
    const existingRows = tbody.querySelectorAll('tr[data-hash]');
    const existingHashes = Array.from(existingRows).map(row => row.dataset.hash);
    
    // Track new hashes to detect removed torrents
    const currentHashes = torrents.map(t => t.hash);
    
    // Update or add rows for each torrent
    torrents.forEach(torrent => {
        // Format data for display
        const sizeFormatted = formatFileSize(torrent.size);
        const progressFormatted = torrent.progress.toFixed(1) + '%';
        const downloadRateFormatted = torrent.download_rate.toFixed(1) + ' KB/s';
        const uploadRateFormatted = torrent.upload_rate.toFixed(1) + ' KB/s';
        const etaFormatted = calculateETA(torrent);
        const statusFormatted = torrent.status.charAt(0).toUpperCase() + torrent.status.slice(1);
        
        // Determine status icon
        let statusIcon = '';
        let statusBadgeClass = '';
        
        if (torrent.progress >= 100) {
            statusIcon = '<i class="fas fa-check-circle text-success"></i>';
            statusBadgeClass = 'bg-success';
        } else if (torrent.status === 'paused') {
            statusIcon = '<i class="fas fa-pause-circle text-warning"></i>';
            statusBadgeClass = 'bg-warning';
        } else if (torrent.status === 'downloading') {
            statusIcon = '<i class="fas fa-arrow-circle-down text-primary"></i>';
            statusBadgeClass = 'bg-primary';
        } else if (torrent.status === 'seeding') {
            statusIcon = '<i class="fas fa-arrow-circle-up text-info"></i>';
            statusBadgeClass = 'bg-info';
        } else {
            statusIcon = '<i class="fas fa-circle text-secondary"></i>';
            statusBadgeClass = 'bg-secondary';
        }
        
        // Determine progress bar color
        let progressBarClass = 'bg-primary';
        if (torrent.progress >= 100) {
            progressBarClass = 'bg-success';
        } else if (torrent.status === 'paused') {
            progressBarClass = 'bg-warning';
        }
        
        // Find or create row
        let row = tbody.querySelector(`tr[data-hash="${torrent.hash}"]`);
        const isNewRow = !row;
        
        if (isNewRow) {
            row = document.createElement('tr');
            row.dataset.hash = torrent.hash;
            row.dataset.status = torrent.status;
            row.className = 'highlight-new';
            tbody.appendChild(row);
        } else {
            // Update the status in the dataset
            row.dataset.status = torrent.status;
        }
        
        // Format the added time
        const addedTime = new Date(torrent.added_time * 1000).toLocaleString();
        
        // Update row content
        row.innerHTML = `
            <td class="torrent-name">
                <div class="d-flex align-items-center">
                    <div class="me-2">
                        ${statusIcon}
                    </div>
                    <div>
                        <div class="font-weight-bold">${torrent.name}</div>
                        <small class="text-muted">Added: ${addedTime}</small>
                    </div>
                </div>
            </td>
            <td>${sizeFormatted}</td>
            <td>
                <div class="progress">
                    <div class="progress-bar ${progressBarClass}" role="progressbar" 
                        style="width: ${torrent.progress}%" 
                        aria-valuenow="${torrent.progress}" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        ${progressFormatted}
                    </div>
                </div>
                <small class="text-muted">${formatFileSize(torrent.total_downloaded)} of ${sizeFormatted}</small>
            </td>
            <td>
                <div>↓ ${downloadRateFormatted}</div>
                <div>↑ ${uploadRateFormatted}</div>
            </td>
            <td>${etaFormatted}</td>
            <td>
                <span class="badge ${statusBadgeClass}">
                    ${statusFormatted}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                        Actions
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        ${torrent.status === 'paused' 
                            ? `<li><a class="dropdown-item" href="/resume/${torrent.hash}">
                                <i class="fas fa-play me-2"></i>Resume
                              </a></li>`
                            : `<li><a class="dropdown-item" href="/pause/${torrent.hash}">
                                <i class="fas fa-pause me-2"></i>Pause
                              </a></li>`
                        }
                        <li><a class="dropdown-item" href="/prioritize/${torrent.hash}">
                            <i class="fas fa-arrow-up me-2"></i>Prioritize
                        </a></li>
                        <li><a class="dropdown-item" href="/files/${torrent.hash}">
                            <i class="fas fa-file-alt me-2"></i>Files
                        </a></li>
                        <li><a class="dropdown-item" href="/trackers/${torrent.hash}">
                            <i class="fas fa-server me-2"></i>Trackers
                        </a></li>
                        <li><a class="dropdown-item" href="/peers/${torrent.hash}">
                            <i class="fas fa-users me-2"></i>Peers
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="/recheck/${torrent.hash}">
                            <i class="fas fa-sync me-2"></i>Force Recheck
                        </a></li>
                        <li><a class="dropdown-item" href="/reannounce/${torrent.hash}">
                            <i class="fas fa-bullhorn me-2"></i>Force Reannounce
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger remove-torrent" href="/remove/${torrent.hash}" data-name="${torrent.name}">
                            <i class="fas fa-trash-alt me-2"></i>Remove
                        </a></li>
                    </ul>
                </div>
            </td>
        `;
    });
    
    // Remove rows for torrents that no longer exist
    existingHashes.forEach(hash => {
        if (!currentHashes.includes(hash)) {
            const row = tbody.querySelector(`tr[data-hash="${hash}"]`);
            if (row) {
                // Add fade-out animation
                row.style.transition = 'opacity 0.5s';
                row.style.opacity = '0';
                
                // Remove after animation completes
                setTimeout(() => {
                    row.remove();
                    
                    // If no torrents left, show the "no torrents" message
                    if (tbody.querySelectorAll('tr[data-hash]').length === 0) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="7" class="text-center py-5">
                                    <div class="empty-state">
                                        <i class="fas fa-download fa-3x mb-3 text-muted"></i>
                                        <h5>No torrents found</h5>
                                        <p class="text-muted">Add a new torrent to get started</p>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                    
                    // Update torrent count
                    document.getElementById('torrent-count').textContent = 
                        tbody.querySelectorAll('tr[data-hash]').length;
                    
                    // Apply filter
                    applyTorrentFilter();
                }, 500);
            }
        }
    });
    
    // Update torrent count
    document.getElementById('torrent-count').textContent = torrents.length;
    
    // Apply filter
    applyTorrentFilter();
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(stats) {
    if (!stats) return;
    
    // Update download/upload speeds
    const totalDownloadSpeed = document.getElementById('total-download-speed');
    const totalUploadSpeed = document.getElementById('total-upload-speed');
    const downloadSpeedBar = document.getElementById('download-speed-bar');
    const uploadSpeedBar = document.getElementById('upload-speed-bar');
    
    if (totalDownloadSpeed && stats.download_rate !== undefined) {
        // Update speed history
        speedHistory.download.shift();
        speedHistory.download.push(stats.download_rate);
        
        // Format download speed
        totalDownloadSpeed.textContent = formatFileSize(stats.download_rate * 1024) + '/s';
        
        // Update progress bar (percentage of max speed or settings limit)
        if (downloadSpeedBar) {
            const maxRate = Math.max(...speedHistory.download, 1);
            const percentage = (stats.download_rate / maxRate) * 100;
            downloadSpeedBar.style.width = Math.min(percentage, 100) + '%';
        }
    }
    
    if (totalUploadSpeed && stats.upload_rate !== undefined) {
        // Update speed history
        speedHistory.upload.shift();
        speedHistory.upload.push(stats.upload_rate);
        
        // Format upload speed
        totalUploadSpeed.textContent = formatFileSize(stats.upload_rate * 1024) + '/s';
        
        // Update progress bar (percentage of max speed or settings limit)
        if (uploadSpeedBar) {
            const maxRate = Math.max(...speedHistory.upload, 1);
            const percentage = (stats.upload_rate / maxRate) * 100;
            uploadSpeedBar.style.width = Math.min(percentage, 100) + '%';
        }
    }
    
    // Update active torrents count
    const activeTorrents = document.getElementById('active-torrents');
    const torrentsStats = document.getElementById('torrents-stats');
    
    if (activeTorrents && stats.active_torrents !== undefined && stats.total_torrents !== undefined) {
        activeTorrents.textContent = stats.active_torrents + '/' + stats.total_torrents;
    }
    
    if (torrentsStats && stats.downloading !== undefined && stats.seeding !== undefined) {
        torrentsStats.textContent = `Downloading: ${stats.downloading} | Seeding: ${stats.seeding}`;
    }
    
    // Update disk space
    const diskSpaceUsed = document.getElementById('disk-space-used');
    const diskSpaceBar = document.getElementById('disk-space-bar');
    
    if (diskSpaceUsed && stats.disk_used !== undefined) {
        diskSpaceUsed.textContent = formatFileSize(stats.disk_used);
        
        if (diskSpaceBar && stats.disk_total !== undefined) {
            const percentage = (stats.disk_used / stats.disk_total) * 100;
            diskSpaceBar.style.width = percentage + '%';
            
            // Change color based on usage
            if (percentage > 90) {
                diskSpaceBar.className = 'progress-bar bg-danger';
            } else if (percentage > 70) {
                diskSpaceBar.className = 'progress-bar bg-warning';
            } else {
                diskSpaceBar.className = 'progress-bar bg-success';
            }
        }
    }
}

/**
 * Show torrent details in a modal
 */
function showTorrentDetails(hash) {
    if (!hash) return;
    
    // Store the current torrent hash
    currentTorrentHash = hash;
    
    // Show loading state in modal
    const modalTitle = document.getElementById('detailsModalTitle');
    const modalBody = document.getElementById('detailsModalBody');
    
    if (!modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'Loading...';
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('torrentDetailsModal'));
    modal.show();
    
    // Fetch the torrent details
    fetch(`/status?hash=${hash}`)
        .then(response => response.json())
        .then(data => {
            const torrent = data.torrents.find(t => t.hash === hash);
            if (!torrent) {
                modalTitle.textContent = 'Error';
                modalBody.textContent = 'Torrent not found.';
                return;
            }
            
            updateTorrentDetailsModal(torrent);
        })
        .catch(error => {
            console.error('Error fetching torrent details:', error);
            modalTitle.textContent = 'Error';
            modalBody.textContent = 'Failed to load torrent details: ' + error.message;
        });
}

/**
 * Update the torrent details modal with data
 */
function updateTorrentDetailsModal(torrent) {
    const modalTitle = document.getElementById('detailsModalTitle');
    const modalBody = document.getElementById('detailsModalBody');
    
    if (!modalTitle || !modalBody) return;
    
    modalTitle.textContent = torrent.name;
    
    // Format data for display
    const sizeFormatted = formatFileSize(torrent.size);
    const downloadedFormatted = formatFileSize(torrent.total_downloaded * 1024 * 1024);
    const uploadedFormatted = formatFileSize(torrent.total_uploaded * 1024 * 1024);
    const addedTime = new Date(torrent.added_time * 1000).toLocaleString();
    const ratio = (torrent.total_downloaded === 0) ? 
        '0.00' : 
        (torrent.total_uploaded / torrent.total_downloaded).toFixed(2);
    
    const etaFormatted = calculateETA(torrent);
    
    modalBody.innerHTML = `
        <ul class="nav nav-tabs" id="detailsTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="general-tab" data-bs-toggle="tab" data-bs-target="#general-content" type="button" role="tab">
                    General
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="trackers-tab" data-bs-toggle="tab" data-bs-target="#trackers-content" type="button" role="tab">
                    Trackers
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="peers-tab" data-bs-toggle="tab" data-bs-target="#peers-content" type="button" role="tab">
                    Peers
                </button>
            </li>
        </ul>
        
        <div class="tab-content pt-3" id="detailsTabContent">
            <!-- General Tab -->
            <div class="tab-pane fade show active" id="general-content" role="tabpanel" aria-labelledby="general-tab">
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th>Size:</th>
                                <td>${sizeFormatted}</td>
                            </tr>
                            <tr>
                                <th>Progress:</th>
                                <td>
                                    <div class="progress">
                                        <div class="progress-bar bg-${torrent.progress >= 100 ? 'success' : 'primary'}" 
                                             role="progressbar" 
                                             style="width: ${torrent.progress}%">
                                            ${torrent.progress.toFixed(1)}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>Status:</th>
                                <td>
                                    <span class="badge bg-${torrent.status === 'paused' ? 'warning' : 'primary'}">
                                        ${torrent.status.charAt(0).toUpperCase() + torrent.status.slice(1)}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <th>Added:</th>
                                <td>${addedTime}</td>
                            </tr>
                            <tr>
                                <th>ETA:</th>
                                <td>${etaFormatted}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th>Download Speed:</th>
                                <td>${torrent.download_rate.toFixed(1)} KB/s</td>
                            </tr>
                            <tr>
                                <th>Upload Speed:</th>
                                <td>${torrent.upload_rate.toFixed(1)} KB/s</td>
                            </tr>
                            <tr>
                                <th>Downloaded:</th>
                                <td>${downloadedFormatted}</td>
                            </tr>
                            <tr>
                                <th>Uploaded:</th>
                                <td>${uploadedFormatted}</td>
                            </tr>
                            <tr>
                                <th>Ratio:</th>
                                <td>${ratio}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6>Torrent Hash:</h6>
                    <div class="bg-light p-2 text-monospace small">
                        ${torrent.hash}
                    </div>
                </div>
            </div>
            
            <!-- Trackers Tab -->
            <div class="tab-pane fade" id="trackers-content" role="tabpanel" aria-labelledby="trackers-tab">
                <div class="text-center py-3" id="trackers-loading">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading trackers...</p>
                </div>
                <div id="trackers-data" style="display: none;">
                    <!-- Will be populated via JavaScript -->
                </div>
            </div>
            
            <!-- Peers Tab -->
            <div class="tab-pane fade" id="peers-content" role="tabpanel" aria-labelledby="peers-tab">
                <div class="text-center py-3" id="peers-loading">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading peers...</p>
                </div>
                <div id="peers-data" style="display: none;">
                    <!-- Will be populated via JavaScript -->
                </div>
            </div>
        </div>
    `;
    
    // Set up tab event listeners
    document.getElementById('trackers-tab').addEventListener('shown.bs.tab', function (e) {
        loadTorrentTrackers(torrent.hash);
    });
    
    document.getElementById('peers-tab').addEventListener('shown.bs.tab', function (e) {
        loadTorrentPeers(torrent.hash);
    });
}

/**
 * Load torrent trackers
 */
function loadTorrentTrackers(hash) {
    fetch(`/trackers/${hash}`)
        .then(response => response.json())
        .then(data => {
            const trackersLoading = document.getElementById('trackers-loading');
            const trackersData = document.getElementById('trackers-data');
            
            if (!trackersLoading || !trackersData) return;
            
            trackersLoading.style.display = 'none';
            trackersData.style.display = 'block';
            
            if (!data.trackers || data.trackers.length === 0) {
                trackersData.innerHTML = '<div class="alert alert-info">No trackers found for this torrent.</div>';
                return;
            }
            
            let html = '<div class="table-responsive"><table class="table table-hover">';
            html += '<thead><tr><th>URL</th><th>Status</th><th>Peers</th><th>Seeds</th></tr></thead><tbody>';
            
            data.trackers.forEach(tracker => {
                html += `
                    <tr>
                        <td>${tracker.url}</td>
                        <td>
                            <span class="badge ${tracker.status === 'working' ? 'bg-success' : 'bg-danger'}">
                                ${tracker.status}
                            </span>
                        </td>
                        <td>${tracker.peers}</td>
                        <td>${tracker.seeds}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            trackersData.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading trackers:', error);
            const trackersLoading = document.getElementById('trackers-loading');
            const trackersData = document.getElementById('trackers-data');
            
            if (!trackersLoading || !trackersData) return;
            
            trackersLoading.style.display = 'none';
            trackersData.style.display = 'block';
            trackersData.innerHTML = '<div class="alert alert-danger">Failed to load trackers: ' + error.message + '</div>';
        });
}

/**
 * Load torrent peers
 */
function loadTorrentPeers(hash) {
    fetch(`/peers/${hash}`)
        .then(response => response.json())
        .then(data => {
            const peersLoading = document.getElementById('peers-loading');
            const peersData = document.getElementById('peers-data');
            
            if (!peersLoading || !peersData) return;
            
            peersLoading.style.display = 'none';
            peersData.style.display = 'block';
            
            if (!data.peers || data.peers.length === 0) {
                peersData.innerHTML = '<div class="alert alert-info">No peers connected for this torrent.</div>';
                return;
            }
            
            let html = '<div class="table-responsive"><table class="table table-hover">';
            html += '<thead><tr><th>Address</th><th>Client</th><th>Flags</th><th>Progress</th><th>Speed</th></tr></thead><tbody>';
            
            data.peers.forEach(peer => {
                html += `
                    <tr>
                        <td>${peer.ip}:${peer.port}</td>
                        <td>${peer.client}</td>
                        <td>${formatPeerFlags(peer)}</td>
                        <td>
                            <div class="progress">
                                <div class="progress-bar bg-info" role="progressbar" style="width: ${peer.progress * 100}%">
                                    ${(peer.progress * 100).toFixed(1)}%
                                </div>
                            </div>
                        </td>
                        <td>
                            <div>↓ ${peer.download_rate.toFixed(1)} KB/s</div>
                            <div>↑ ${peer.upload_rate.toFixed(1)} KB/s</div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            peersData.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading peers:', error);
            const peersLoading = document.getElementById('peers-loading');
            const peersData = document.getElementById('peers-data');
            
            if (!peersLoading || !peersData) return;
            
            peersLoading.style.display = 'none';
            peersData.style.display = 'block';
            peersData.innerHTML = '<div class="alert alert-danger">Failed to load peers: ' + error.message + '</div>';
        });
}

/**
 * Load torrent files
 */
function loadTorrentFiles(hash) {
    // Show the files section
    const filesSection = document.getElementById('files-section');
    filesSection.style.display = 'block';
    
    // Scroll to files section
    filesSection.scrollIntoView({ behavior: 'smooth' });
    
    // Load the files
    fetch(`/files/${hash}`)
        .then(response => response.json())
        .then(data => {
            const filesTitle = document.getElementById('files-title');
            const filesTable = document.getElementById('files-table');
            
            if (!filesTitle || !filesTable) return;
            
            // Update the title
            filesTitle.textContent = `Files for: ${data.name || 'Torrent'}`;
            
            // Update the table
            const tbody = filesTable.querySelector('tbody');
            if (!tbody) return;
            
            if (!data.files || data.files.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No files found for this torrent.</td></tr>';
                return;
            }
            
            let html = '';
            data.files.forEach(file => {
                const priority = file.priority === 0 ? 'Skip' : 
                                 file.priority === 1 ? 'Normal' :
                                 file.priority === 2 ? 'High' : 'Low';
                
                const priorityClass = file.priority === 0 ? 'bg-danger' : 
                                       file.priority === 1 ? 'bg-primary' :
                                       file.priority === 2 ? 'bg-success' : 'bg-warning';
                
                html += `
                    <tr data-path="${file.path}">
                        <td>${file.path}</td>
                        <td>${formatFileSize(file.size)}</td>
                        <td>
                            <div class="progress">
                                <div class="progress-bar bg-info" role="progressbar" style="width: ${file.progress}%">
                                    ${file.progress.toFixed(1)}%
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${priorityClass}">${priority}</span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    Priority
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item change-priority" href="/priority/${hash}" data-path="${file.path}" data-priority="0">Skip</a></li>
                                    <li><a class="dropdown-item change-priority" href="/priority/${hash}" data-path="${file.path}" data-priority="1">Normal</a></li>
                                    <li><a class="dropdown-item change-priority" href="/priority/${hash}" data-path="${file.path}" data-priority="2">High</a></li>
                                    <li><a class="dropdown-item change-priority" href="/priority/${hash}" data-path="${file.path}" data-priority="3">Low</a></li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
            // Add event listeners for priority changes
            document.querySelectorAll('.change-priority').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const path = this.dataset.path;
                    const priority = this.dataset.priority;
                    const url = this.href;
                    
                    fetch(`${url}?path=${encodeURIComponent(path)}&priority=${priority}`, {
                        method: 'POST'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showToast('Success', `Priority changed for ${path}`, 'success');
                            // Refresh the files list
                            loadTorrentFiles(hash);
                        } else {
                            showToast('Error', data.error || 'Failed to change priority', 'danger');
                        }
                    })
                    .catch(error => {
                        console.error('Error changing priority:', error);
                        showToast('Error', 'Failed to change priority: ' + error.message, 'danger');
                    });
                });
            });
        })
        .catch(error => {
            console.error('Error loading files:', error);
            const filesSection = document.getElementById('files-section');
            const filesTable = document.getElementById('files-table');
            
            if (!filesSection || !filesTable) return;
            
            const tbody = filesTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load files: ' + error.message + '</td></tr>';
            }
        });
}

/**
 * Format peer flags
 */
function formatPeerFlags(peer) {
    const flags = [];
    
    if (peer.flags && peer.flags.includes) {
        if (peer.flags.includes('I')) flags.push('<span class="badge bg-info" title="Interested">I</span>');
        if (peer.flags.includes('C')) flags.push('<span class="badge bg-success" title="Choked">C</span>');
        if (peer.flags.includes('R')) flags.push('<span class="badge bg-warning" title="Remote">R</span>');
        if (peer.flags.includes('S')) flags.push('<span class="badge bg-primary" title="Seed">S</span>');
        if (peer.flags.includes('O')) flags.push('<span class="badge bg-secondary" title="Optimistic Unchoke">O</span>');
        if (peer.flags.includes('D')) flags.push('<span class="badge bg-dark" title="DHT">D</span>');
        if (peer.flags.includes('L')) flags.push('<span class="badge bg-light text-dark" title="Local">L</span>');
        if (peer.flags.includes('E')) flags.push('<span class="badge bg-danger" title="Encrypted">E</span>');
    }
    
    return flags.join(' ');
}

/**
 * Show a toast notification
 */
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastTime = document.getElementById('toast-time');
    
    if (!toastEl || !toastTitle || !toastMessage || !toastTime) {
        // Fallback to console if toast elements don't exist
        console.log(`${title}: ${message}`);
        return;
    }
    
    // Set toast content
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastTime.textContent = 'Just now';
    
    // Set toast type
    toastEl.className = `toast border-${type}`;
    
    // Show the toast
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

/**
 * Helper function - Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function - Calculate ETA
 */
function calculateETA(torrent) {
    if (torrent.progress >= 100 || torrent.status === 'paused' || torrent.download_rate <= 0) {
        if (torrent.progress >= 100) return 'Complete';
        if (torrent.status === 'paused') return 'Paused';
        return 'Unknown';
    }
    
    const remainingBytes = torrent.size * (1 - torrent.progress / 100);
    const seconds = remainingBytes / (torrent.download_rate * 1024);
    
    if (seconds < 60) {
        return `${Math.ceil(seconds)} sec`;
    } else if (seconds < 3600) {
        return `${Math.ceil(seconds / 60)} min`;
    } else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
    } else {
        return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    }
}>
                            <tr>
                                <th>Uploaded:</th>
                                <td>${uploadedFormatted}</td>
                            </tr