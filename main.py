#!/usr/bin/env python3
"""
JellyTorrent - A Jellyfin integration for streaming torrents
Main application file that starts all services
"""

import argparse
import logging
import os
import sys
import time
import signal
import uvicorn
from multiprocessing import Process

from config import Config
from services.jellyfin_api import JellyfinService
from services.prowlarr_api import ProwlarrService
from services.torrent_service import TorrentService
from api.server import app

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('jellytorrent')

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='JellyTorrent - Stream torrents through Jellyfin')
    parser.add_argument('--config', type=str, default='config.yml', help='Path to config file')
    parser.add_argument('--port', type=int, default=8000, help='Port for the API server')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host for the API server')
    return parser.parse_args()

def start_api_server(host, port):
    """Start the FastAPI server"""
    uvicorn.run(app, host=host, port=port)

def start_services(config_path):
    """Initialize and start all services"""
    config = Config(config_path)
    
    # Initialize services
    jellyfin_service = JellyfinService(config)
    prowlarr_service = ProwlarrService(config)
    torrent_service = TorrentService(config)
    
    # Start services
    jellyfin_service.start()
    prowlarr_service.start()
    torrent_service.start()
    
    return jellyfin_service, prowlarr_service, torrent_service

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    logger.info("Shutting down JellyTorrent...")
    sys.exit(0)

def main():
    """Main entry point"""
    args = parse_args()
    
    logger.info("Starting JellyTorrent...")
    logger.info(f"Using config file: {args.config}")
    
    # Start services
    jellyfin_service, prowlarr_service, torrent_service = start_services(args.config)
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start API server in a separate process
    api_process = Process(target=start_api_server, args=(args.host, args.port))
    api_process.start()
    
    logger.info(f"API server running at http://{args.host}:{args.port}")
    logger.info("JellyTorrent is ready")
    
    try:
        # Keep the main process running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        # Clean up
        if api_process.is_alive():
            api_process.terminate()
            api_process.join()

if __name__ == "__main__":
    main()