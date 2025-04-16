#!/usr/bin/env python3
"""
Production deployment script for Torrent Manager.
Uses Waitress as a production WSGI server.
"""

import os
import argparse
from waitress import serve
import logging
import sys

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the Flask app
from torrent_manager.app import app

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

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run Torrent Manager in production mode.')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to (default: 8080)')
    parser.add_argument('--threads', type=int, default=4, help='Number of worker threads (default: 4)')
    return parser.parse_args()

def main():
    """Run the application with Waitress."""
    args = parse_args()
    
    # Log startup information
    logger.info(f"Starting Torrent Manager on {args.host}:{args.port}")
    logger.info(f"Worker threads: {args.threads}")
    
    # Get download directory from environment or use default
    download_dir = os.environ.get('TORRENT_DOWNLOAD_DIR', os.path.expanduser('~/Downloads/torrents'))
    if not os.path.exists(download_dir):
        os.makedirs(download_dir, exist_ok=True)
        logger.info(f"Created download directory: {download_dir}")
    else:
        logger.info(f"Using download directory: {download_dir}")
    
    # Print access URL
    if args.host == '0.0.0.0':
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        logger.info(f"Access Torrent Manager at http://{local_ip}:{args.port}")
    else:
        logger.info(f"Access Torrent Manager at http://{args.host}:{args.port}")
    
    # Start the WSGI server
    try:
        serve(
            app,
            host=args.host,
            port=args.port,
            threads=args.threads,
            url_scheme='http'
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())