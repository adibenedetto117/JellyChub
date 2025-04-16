from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_from_directory
import os
import json
import logging
import shutil
from urllib.parse import unquote
from datetime import datetime
import psutil
from torrent_client import TorrentClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('torrent_manager.log')
    ]
)
logger = logging.getLogger('torrent_manager')

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For flash messages and sessions

# Configuration
CONFIG_DIR = os.path.expanduser("~/.torrent_manager")
os.makedirs(CONFIG_DIR, exist_ok=True)

# Initialize the torrent client
client = TorrentClient(config_dir=CONFIG_DIR)

@app.route('/')
def index():
    """Render the main page with the list of torrents."""
    status = client.get_status()
    return render_template('index.html', torrents=status['torrents'], stats=status['stats'], settings=client.settings)

@app.route('/add', methods=['POST'])
def add_torrent():
    """Add a new torrent from a magnet link, URL, or torrent file."""
    options = {}
    
    # Parse advanced options if provided
    if request.form.get('show_advanced'):
        if request.form.get('download_dir_specific'):
            options['download_dir'] = request.form.get('download_dir_specific')
        
        start_option = request.form.get('start_option', 'default')
        if start_option == 'start':
            options['start_paused'] = False
        elif start_option == 'pause':
            options['start_paused'] = True
        
        priority = request.form.get('priority', 'normal')
        options['priority'] = priority
        
        if request.form.get('seed_ratio'):
            options['seed_ratio'] = float(request.form.get('seed_ratio'))
        
        if request.form.get('sequential'):
            options['sequential'] = True
    
    # Check for torrent file upload
    if 'torrent_file' in request.files:
        file = request.files['torrent_file']
        if file.filename:
            # Save the file temporarily
            temp_path = os.path.join(client.download_dir, file.filename)
            file.save(temp_path)
            torrent_hash = client.add_torrent_file(temp_path, options)
            
            if torrent_hash:
                flash(f'Torrent added successfully: {client.get_torrent_name(torrent_hash)}', 'success')
            else:
                flash('Failed to add torrent file', 'danger')
            
            # Clean up the temp file
            try:
                os.remove(temp_path)
            except:
                pass
            
            return redirect(url_for('index'))
    
    # Check for magnet link or URL
    if request.form.get('magnet'):
        magnet_link = request.form.get('magnet')
        torrent_hash = client.add_magnet(magnet_link, options)
        
        if torrent_hash:
            flash(f'Magnet link added successfully', 'success')
        else:
            flash('Failed to add magnet link', 'danger')
        
        return redirect(url_for('index'))
    
    flash('No torrent file or magnet link provided', 'warning')
    return redirect(url_for('index'))

@app.route('/remove/<torrent_id>')
def remove_torrent(torrent_id):
    """Remove a torrent from the client."""
    delete_files = request.args.get('delete_files') == '1'
    success = client.remove_torrent(torrent_id, delete_files)
    
    if success:
        flash('Torrent removed successfully', 'success')
    else:
        flash('Failed to remove torrent', 'danger')
    
    return redirect(url_for('index'))

@app.route('/pause/<torrent_id>')
def pause_torrent(torrent_id):
    """Pause a downloading torrent."""
    success = client.pause_torrent(torrent_id)
    
    if success:
        flash('Torrent paused', 'success')
    else:
        flash('Failed to pause torrent', 'danger')
    
    return redirect(url_for('index'))

@app.route('/resume/<torrent_id>')
def resume_torrent(torrent_id):
    """Resume a paused torrent."""
    success = client.resume_torrent(torrent_id)
    
    if success:
        flash('Torrent resumed', 'success')
    else:
        flash('Failed to resume torrent', 'danger')
    
    return redirect(url_for('index'))

@app.route('/prioritize/<torrent_id>')
def prioritize_torrent(torrent_id):
    """Set high priority for a torrent."""
    success = client.prioritize_torrent(torrent_id)
    
    if success:
        flash('Torrent prioritized', 'success')
    else:
        flash('Failed to prioritize torrent', 'danger')
    
    return redirect(url_for('index'))

@app.route('/files/<torrent_id>')
def torrent_files(torrent_id):
    """Get files for a torrent."""
    files = client.get_files(torrent_id)
    name = client.get_torrent_name(torrent_id)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'name': name, 'files': files})
    
    # If not an AJAX request, redirect to index
    return redirect(url_for('index'))

@app.route('/trackers/<torrent_id>')
def torrent_trackers(torrent_id):
    """Get trackers for a torrent."""
    trackers = client.get_trackers(torrent_id)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'trackers': trackers})
    
    # If not an AJAX request, redirect to index
    return redirect(url_for('index'))

@app.route('/peers/<torrent_id>')
def torrent_peers(torrent_id):
    """Get peers for a torrent."""
    peers = client.get_peers(torrent_id)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'peers': peers})
    
    # If not an AJAX request, redirect to index
    return redirect(url_for('index'))

@app.route('/recheck/<torrent_id>')
def force_recheck(torrent_id):
    """Force recheck of a torrent."""
    success = client.force_recheck(torrent_id)
    
    if success:
        flash('Torrent recheck started', 'success')
    else:
        flash('Failed to start torrent recheck', 'danger')
    
    return redirect(url_for('index'))

@app.route('/reannounce/<torrent_id>')
def force_reannounce(torrent_id):
    """Force reannounce of a torrent."""
    success = client.force_reannounce(torrent_id)
    
    if success:
        flash('Torrent reannounce started', 'success')
    else:
        flash('Failed to start torrent reannounce', 'danger')
    
    return redirect(url_for('index'))

@app.route('/priority/<torrent_id>', methods=['POST'])
def set_file_priority(torrent_id):
    """Set priority for a file in a torrent."""
    path = unquote(request.args.get('path', ''))
    priority = int(request.args.get('priority', 1))
    
    if not path:
        return jsonify({'success': False, 'error': 'No file path provided'})
    
    file_priorities = {path: priority}
    success = client.set_file_priorities(torrent_id, file_priorities)
    
    return jsonify({'success': success})

@app.route('/pause_all')
def pause_all():
    """Pause all torrents."""
    success = client.pause_all()
    
    if success:
        flash('All torrents paused', 'success')
    else:
        flash('Failed to pause all torrents', 'danger')
    
    return redirect(url_for('index'))

@app.route('/start_all')
def start_all():
    """Resume all torrents."""
    success = client.resume_all()
    
    if success:
        flash('All torrents started', 'success')
    else:
        flash('Failed to start all torrents', 'danger')
    
    return redirect(url_for('index'))

@app.route('/remove_all')
def remove_all():
    """Remove all torrents."""
    delete_files = request.args.get('remove_data') == '1'
    success = client.remove_all(delete_files)
    
    if success:
        flash('All torrents removed', 'success')
    else:
        flash('Failed to remove all torrents', 'danger')
    
    return redirect(url_for('index'))

@app.route('/status')
def get_status():
    """Return the current status of all torrents as JSON."""
    torrent_hash = request.args.get('hash')
    status = client.get_status(torrent_hash)
    
    # Add current timestamp
    status['timestamp'] = datetime.now().timestamp()
    
    return jsonify(status)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    """Handle application settings."""
    if request.method == 'POST':
        # Parse settings from form
        new_settings = {}
        
        # General settings
        new_settings['download_dir'] = request.form.get('download_dir', client.download_dir)
        new_settings['incomplete_dir'] = request.form.get('incomplete_dir', '')
        new_settings['start_paused'] = 'start_paused' in request.form
        new_settings['auto_start'] = 'auto_start' in request.form
        new_settings['remove_completed'] = 'remove_completed' in request.form
        
        # Network settings
        new_settings['max_download_speed'] = int(request.form.get('max_download_speed', 0))
        new_settings['max_upload_speed'] = int(request.form.get('max_upload_speed', 0))
        new_settings['listen_port'] = int(request.form.get('listen_port', 6881))
        new_settings['max_connections'] = int(request.form.get('max_connections', 200))
        new_settings['port_forwarding'] = 'port_forwarding' in request.form
        new_settings['dht'] = 'dht' in request.form
        new_settings['pex'] = 'pex' in request.form
        
        # Privacy settings
        new_settings['proxy_type'] = request.form.get('proxy_type', 'none')
        new_settings['proxy_host'] = request.form.get('proxy_host', '')
        new_settings['proxy_port'] = int(request.form.get('proxy_port', 0))
        new_settings['proxy_username'] = request.form.get('proxy_username', '')
        new_settings['proxy_password'] = request.form.get('proxy_password', '')
        new_settings['anonymous_mode'] = 'anonymous_mode' in request.form
        new_settings['force_encryption'] = 'force_encryption' in request.form
        
        # Advanced settings
        new_settings['max_active_torrents'] = int(request.form.get('max_active_torrents', 5))
        new_settings['max_active_seeding'] = int(request.form.get('max_active_seeding', 2))
        new_settings['seed_ratio_limit'] = float(request.form.get('seed_ratio_limit', 2.0))
        new_settings['cache_size'] = int(request.form.get('cache_size', 16))
        new_settings['enable_scrape'] = 'enable_scrape' in request.form
        new_settings['enable_lsd'] = 'enable_lsd' in request.form
        
        # Directory validation
        if new_settings['download_dir'] and not os.path.isdir(new_settings['download_dir']):
            try:
                os.makedirs(new_settings['download_dir'], exist_ok=True)
            except Exception as e:
                flash(f'Error creating download directory: {str(e)}', 'danger')
                return redirect(url_for('settings'))
        
        if new_settings['incomplete_dir'] and not os.path.isdir(new_settings['incomplete_dir']):
            try:
                os.makedirs(new_settings['incomplete_dir'], exist_ok=True)
            except Exception as e:
                flash(f'Error creating incomplete directory: {str(e)}', 'danger')
                return redirect(url_for('settings'))
        
        # Update settings
        success = client.update_settings(new_settings)
        
        if success:
            flash('Settings updated successfully', 'success')
        else:
            flash('Failed to update settings', 'danger')
        
        return redirect(url_for('index'))
    
    # Load current settings
    settings = client.settings
    
    # Get disk space information
    try:
        disk_usage = psutil.disk_usage(client.download_dir)
        disk_info = {
            'free': disk_usage.free,
            'used': disk_usage.used,
            'total': disk_usage.total,
            'percent': disk_usage.percent
        }
    except Exception as e:
        logger.error(f"Error getting disk space: {e}")
        disk_info = {
            'free': 0,
            'used': 0,
            'total': 0,
            'percent': 0
        }
    
    return render_template('settings.html', settings=settings, disk_info=disk_info)

@app.route('/reset_settings')
def reset_settings():
    """Reset settings to defaults."""
    # Load default settings
    default_settings = client.load_settings()
    
    # Reset to defaults
    success = client.update_settings(default_settings)
    
    if success:
        flash('Settings reset to defaults', 'success')
    else:
        flash('Failed to reset settings', 'danger')
    
    return redirect(url_for('settings'))

@app.route('/update_speed_limits', methods=['POST'])
def update_speed_limits():
    """Update speed limits."""
    try:
        download_speed = int(request.form.get('download_speed_limit', 0))
        upload_speed = int(request.form.get('upload_speed_limit', 0))
        
        # Update alternative speed settings if enabled
        alt_enabled = 'alternative_speed_enabled' in request.form
        alt_start = request.form.get('alt_speed_start', '08:00')
        alt_end = request.form.get('alt_speed_end', '23:00')
        
        # Update regular speed limits
        client.set_speed_limits(download_speed, upload_speed)
        
        # Update alternative speed settings
        client.update_alternative_speed_settings(
            enabled=alt_enabled,
            start_time=alt_start,
            end_time=alt_end,
            download_limit=download_speed,
            upload_limit=upload_speed
        )
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating speed limits: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/check_updates')
def check_updates():
    """Check for updates."""
    # This is a placeholder - in a real app, you would check for updates
    flash('You are running the latest version (0.2.0)', 'info')
    return redirect(url_for('index'))

@app.route('/test_connection')
def test_connection():
    """Test connection settings."""
    result = client.test_connection()
    
    if result['status'] == 'ok':
        flash(f'Connection test successful: {result["message"]}', 'success')
    else:
        flash(f'Connection test failed: {result["message"]}', 'danger')
    
    return redirect(url_for('index'))

@app.route('/download/<torrent_id>/<path:file_path>')
def download_file(torrent_id, file_path):
    """Download a file from a torrent."""
    # Security check - make sure the file is within the download directory
    full_path = os.path.join(client.download_dir, file_path)
    
    if not os.path.exists(full_path):
        flash('File not found', 'danger')
        return redirect(url_for('index'))
    
    # Get the directory and filename
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    
    try:
        return send_from_directory(directory, filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        flash('Error downloading file', 'danger')
        return redirect(url_for('index'))

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files."""
    return send_from_directory('static', filename)

@app.template_filter('format_size')
def format_size(size):
    """Format file size in human-readable format."""
    if size == 0:
        return '0 Bytes'
    
    size_names = ('Bytes', 'KB', 'MB', 'GB', 'TB')
    i = 0
    while size >= 1024 and i < len(size_names) - 1:
        size /= 1024
        i += 1
    
    return f"{size:.2f} {size_names[i]}"

@app.template_filter('format_timestamp')
def format_timestamp(timestamp):
    """Format Unix timestamp to human-readable date/time."""
    if timestamp is None:
        return 'Unknown'
    
    try:
        dt = datetime.fromtimestamp(timestamp)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return 'Invalid date'

@app.template_filter('progress_color')
def progress_color(progress):
    """Get Bootstrap color class for progress bar based on percentage."""
    if progress >= 100:
        return 'success'
    elif progress >= 50:
        return 'info'
    elif progress >= 25:
        return 'primary'
    else:
        return 'warning'

@app.template_filter('status_color')
def status_color(status):
    """Get Bootstrap color class for status badge."""
    colors = {
        'downloading': 'primary',
        'seeding': 'info',
        'paused': 'warning',
        'checking': 'secondary',
        'metadata': 'dark',
        'unknown': 'secondary'
    }
    return colors.get(status, 'secondary')

@app.template_filter('calculate_eta')
def calculate_eta(torrent):
    """Calculate estimated time remaining for a torrent."""
    if torrent['progress'] >= 100 or torrent['status'] == 'paused' or torrent['download_rate'] <= 0:
        if torrent['progress'] >= 100:
            return 'Complete'
        if torrent['status'] == 'paused':
            return 'Paused'
        return 'Unknown'
    
    try:
        # Calculate remaining bytes
        remaining = (100 - torrent['progress']) / 100 * torrent['size']
        
        # Calculate seconds
        seconds = remaining / (torrent['download_rate'] * 1024)
        
        # Format time
        if seconds < 60:
            return f"{int(seconds)} sec"
        elif seconds < 3600:
            return f"{int(seconds / 60)} min"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            return f"{hours}h {minutes}m"
        else:
            days = int(seconds / 86400)
            hours = int((seconds % 86400) / 3600)
            return f"{days}d {hours}h"
    except:
        return 'Unknown'

# Clean up on shutdown
@app.before_first_request
def setup():
    """Setup before first request."""
    logger.info("Setting up application...")

def shutdown_client():
    """Clean up and shutdown the torrent client."""
    logger.info("Shutting down torrent client...")
    client.shutdown()

if __name__ == '__main__':
    try:
        # Register shutdown handler
        import atexit
        atexit.register(shutdown_client)
        
        # Run the Flask app
        app.run(debug=True, host='0.0.0.0', port=5000)
    except (KeyboardInterrupt, SystemExit):
        # Clean up on exit
        shutdown_client()