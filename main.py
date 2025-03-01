#!/usr/bin/env python3
"""
Jellyfin Music Client - Main Entry Point
"""
import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Console output
        logging.FileHandler('jellyfin_client.log')  # Log file
    ]
)

print("CRITICAL: Initializing Jellyfin Music Client")
logging.info("Initializing Jellyfin Music Client")

# Ensure all required directories exist
directories = [
    "cache", 
    "cache/images", 
    "cache/audio", 
    "cache/metadata", 
    "cache/temp", 
    "ui", 
    "ui/screens", 
    "ui/widgets", 
    "ui/kv", 
    "libs"
]

for dir_path in directories:
    path = Path(dir_path)
    try:
        path.mkdir(parents=True, exist_ok=True)
        print(f"CRITICAL: Created directory: {path}")
        logging.info(f"Created directory: {path}")
    except Exception as e:
        print(f"CRITICAL: Error creating directory {path}: {e}")
        logging.error(f"Error creating directory {path}: {e}")

# Add project directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Create empty settings.json if it doesn't exist
settings_file = Path("settings.json")
if not settings_file.exists():
    try:
        with open(settings_file, 'w') as f:
            f.write('{}')
        print("CRITICAL: Created empty settings.json")
        logging.info("Created empty settings.json")
    except Exception as e:
        print(f"CRITICAL: Error creating settings.json: {e}")
        logging.error(f"Error creating settings.json: {e}")

from ui.app import JellyfinApp

if __name__ == "__main__":
    try:
        print("CRITICAL: Starting Jellyfin Music App")
        logging.info("Starting Jellyfin Music App")
        JellyfinApp().run()
    except Exception as e:
        print(f"CRITICAL: Unhandled exception: {e}")
        logging.critical(f"Unhandled exception: {e}", exc_info=True)