from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from torrent_client import TorrentClient

app = Flask(__name__)

# Initialize the torrent client
client = TorrentClient()

# Default download location
DOWNLOAD_DIR = os.path.expanduser("~/Downloads/torrents")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/')
def index():
    """Render the main page with the list of torrents."""
    torrents = client.get_torrents()
    return render_template('index.html', torrents=torrents)

@app.route('/add', methods=['POST'])
def add_torrent():
    """Add a new torrent from a magnet link or torrent file."""
    if 'torrent_file' in request.files:
        file = request.files['torrent_file']
        if file.filename:
            # Save the file temporarily
            temp_path = os.path.join(DOWNLOAD_DIR, file.filename)
            file.save(temp_path)
            client.add_torrent_file(temp_path)
    
    if request.form.get('magnet'):
        magnet_link = request.form.get('magnet')
        client.add_magnet(magnet_link)
    
    return redirect(url_for('index'))

@app.route('/remove/<torrent_id>')
def remove_torrent(torrent_id):
    """Remove a torrent from the client."""
    client.remove_torrent(torrent_id)
    return redirect(url_for('index'))

@app.route('/pause/<torrent_id>')
def pause_torrent(torrent_id):
    """Pause a downloading torrent."""
    client.pause_torrent(torrent_id)
    return redirect(url_for('index'))

@app.route('/resume/<torrent_id>')
def resume_torrent(torrent_id):
    """Resume a paused torrent."""
    client.resume_torrent(torrent_id)
    return redirect(url_for('index'))

@app.route('/status')
def get_status():
    """Return the current status of all torrents as JSON."""
    torrents = client.get_torrents()
    return jsonify(torrents)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    """Handle application settings."""
    if request.method == 'POST':
        # Update settings
        new_download_dir = request.form.get('download_dir')
        if new_download_dir and os.path.isdir(new_download_dir):
            global DOWNLOAD_DIR
            DOWNLOAD_DIR = new_download_dir
            client.set_download_dir(DOWNLOAD_DIR)
        
        # Additional settings can be handled here
        return redirect(url_for('index'))
    
    return render_template('settings.html', download_dir=DOWNLOAD_DIR)

if __name__ == '__main__':
    # Ensure the download directory exists
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    
    # Configure the client with the download directory
    client.set_download_dir(DOWNLOAD_DIR)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)