// Global variables
let refreshInterval = null;
const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Start auto-refresh of torrent data
    startAutoRefresh();
    
    // Setup form validation for adding torrents
    setupFormValidation();
    
    // Setup click handlers for the torrents table
    setupTableInteractions();
});

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
        refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
    }
    
    fetch('/status')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(torrents => {
            updateTorrentsTable(torrents);
        })
        .catch(error => {
            console.error('Error refreshing torrents:', error);
            // Show error toast or notification
            showNotification('Error refreshing torrents', 'danger');
        })
        .finally(() => {
            // Reset the refresh button
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3">No torrents found. Add a new torrent to get started.</td></tr>';
        return;
    }
    
    // Clear the table if it only has the "no torrents" message
    if (tbody.querySelector('td[colspan="6"]')) {
        tbody.innerHTML = '';
    }
    
    // Get existing hashes
    const existingRows = tbody.querySelectorAll('tr[data-hash]');
    const existingHashes = Array.from(existingRows).map(row => row.dataset.hash);
    
    // Track new hashes to detect removed torrents
    const currentHashes = [];
    
    // Update or add rows for each torrent
    torrents.forEach(torrent => {
        currentHashes.push(torrent.hash);
        
        // Format size for display
        let sizeDisplay = formatFileSize(torrent.size);
        
        // Format speed for display
        let speedDisplay = `${torrent.download_rate.toFixed(1)} KB/s`;
        
        // Find or create row
        let row = tbody.querySelector(`tr[data-hash="${torrent.hash}"]`);
        const isNewRow = !row;
        
        if (isNewRow) {
            row = document.createElement('tr');
            row.dataset.hash = torrent.hash;
            row.className = 'highlight-new';
            tbody.appendChild(row);
        }
        
        // Update row content
        row.innerHTML = `
            <td>${torrent.name}</td>
            <td>${sizeDisplay}</td>
            <td>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${torrent.progress}%" 
                         aria-valuenow="${torrent.progress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${torrent.progress.toFixed(1)}%
                    </div>
                </div>
            </td>
            <td>
                <div class="speed-indicator">
                    <span>${speedDisplay}</span>
                </div>
            </td>
            <td>${capitalizeFirstLetter(torrent.status)}</td>
            <td>
                ${torrent.status === 'paused' 
                    ? `<a href="/resume/${torrent.hash}" class="btn btn-sm btn-success">Resume</a>`
                    : `<a href="/pause/${torrent.hash}" class="btn btn-sm btn-warning">Pause</a>`
                }
                <a href="/remove/${torrent.hash}" class="btn btn-sm btn-danger remove-torrent">Remove</a>
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
                    if (tbody.querySelectorAll('tr').length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3">No torrents found. Add a new torrent to get started.</td></tr>';
                    }
                }, 500);
            }
        }
    });
    
    // Add event listeners to new buttons
    document.querySelectorAll('.remove-torrent').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to remove this torrent?')) {
                window.location.href = this.getAttribute('href');
            }
        });
    });
}

/**
 * Setup form validation for adding new torrents
 */
function setupFormValidation() {
    const form = document.querySelector('form[action*="add"]');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        const magnetInput = document.getElementById('magnet');
        const fileInput = document.getElementById('torrent_file');
        
        // Check if at least one input has a value
        if ((!magnetInput || !magnetInput.value.trim()) && 
            (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
            e.preventDefault();
            showNotification('Please enter a magnet link or select a torrent file.', 'danger');
            return false;
        }
        
        // Validate magnet link format if provided
        if (magnetInput && magnetInput.value.trim()) {
            if (!magnetInput.value.startsWith('magnet:?')) {
                e.preventDefault();
                showNotification('Invalid magnet link format.', 'danger');
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
        if (row && row.dataset.hash && !e.target.closest('a.btn')) {
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
}

/**
 * Show detailed information about a torrent
 */
function showTorrentDetails(hash) {
    // Show loading state in modal
    const modalTitle = document.getElementById('detailsModalTitle');
    const modalBody = document.getElementById('detailsModalBody');
    
    if (!modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'Loading...';
    modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('torrentDetailsModal'));
    modal.show();
    
    // Fetch the torrent details
    fetch('/status')
        .then(response => response.json())
        .then(torrents => {
            const torrent = torrents.find(t => t.hash === hash);
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
    
    // Create files list HTML if available
    let filesHtml = '';
    if (torrent.files && torrent.files.length > 0) {
        filesHtml = '<div class="mt-3"><h6>Files:</h6><ul class="file-list">';
        torrent.files.forEach(file => {
            filesHtml += `<li>${file}</li>`;
        });
        filesHtml += '</ul></div>';
    }
    
    // Format data for display
    const sizeFormatted = formatFileSize(torrent.size);
    const downloadedFormatted = formatFileSize(torrent.total_downloaded * 1024 * 1024);
    const uploadedFormatted = formatFileSize(torrent.total_uploaded * 1024 * 1024);
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Size:</strong> ${sizeFormatted}</p>
                <p><strong>Progress:</strong> ${torrent.progress.toFixed(1)}%</p>
                <p><strong>Status:</strong> ${capitalizeFirstLetter(torrent.status)}</p>
                <p><strong>Added:</strong> ${formatDate(torrent.added_time * 1000)}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Download Speed:</strong> ${torrent.download_rate.toFixed(1)} KB/s</p>
                <p><strong>Upload Speed:</strong> ${torrent.upload_rate.toFixed(1)} KB/s</p>
                <p><strong>Peers/Seeds:</strong> ${torrent.peers}/${torrent.seeds}</p>
                <p><strong>ETA:</strong> ${calculateETA(torrent)}</p>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-12">
                <p><strong>Downloaded:</strong> ${downloadedFormatted}</p>
                <p><strong>Uploaded:</strong> ${uploadedFormatted}</p>
                <p><strong>Ratio:</strong> ${calculateRatio(torrent)}</p>
                <p><strong>Hash:</strong> <span class="text-monospace small">${torrent.hash}</span></p>
            </div>
        </div>
        ${filesHtml}
    `;
}

/**
 * Helper functions
 */

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Format date in a human-readable format
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Calculate ETA for torrent completion
function calculateETA(torrent) {
    if (torrent.progress >= 100 || torrent.status === 'paused' || torrent.download_rate <= 0) {
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
}

// Calculate upload/download ratio
function calculateRatio(torrent) {
    if (torrent.total_downloaded === 0) return '0.00';
    return (torrent.total_uploaded / torrent.total_downloaded).toFixed(2);
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists, create if not
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 150);
    }, 5000);
}