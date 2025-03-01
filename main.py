#!/usr/bin/env python3
"""
Jellyfin Music Client - Main Entry Point
"""
import os
import sys
from pathlib import Path

# Ensure all required directories exist
cache_dir = Path("cache")
cache_dir.mkdir(exist_ok=True)
images_dir = Path("cache/images")
images_dir.mkdir(exist_ok=True)
audio_dir = Path("cache/audio")
audio_dir.mkdir(exist_ok=True)
metadata_dir = Path("cache/metadata")
metadata_dir.mkdir(exist_ok=True)
temp_dir = Path("cache/temp")
temp_dir.mkdir(exist_ok=True)

# Ensure UI directories exist
ui_dir = Path("ui")
ui_dir.mkdir(exist_ok=True)
screens_dir = Path("ui/screens")
screens_dir.mkdir(exist_ok=True)
widgets_dir = Path("ui/widgets")
widgets_dir.mkdir(exist_ok=True)
kv_dir = Path("ui/kv")
kv_dir.mkdir(exist_ok=True)

# Ensure libs directory exists
libs_dir = Path("libs")
libs_dir.mkdir(exist_ok=True)

# Add project directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Create empty settings.json if it doesn't exist
settings_file = Path("settings.json")
if not settings_file.exists():
    with open(settings_file, 'w') as f:
        f.write('{}')

from ui.app import JellyfinApp

if __name__ == "__main__":
    JellyfinApp().run()