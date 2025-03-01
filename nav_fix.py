#!/usr/bin/env python3
"""
Navigation Fix for Jellyfin Music Player
A small utility to help debug and fix navigation issues
"""
import os
import json
from pathlib import Path

def check_settings_file():
    """Check if settings.json exists and is valid"""
    settings_path = Path("settings.json")
    
    if not settings_path.exists():
        print("settings.json does not exist. Creating empty settings file.")
        with open(settings_path, 'w') as f:
            f.write('{}')
        return False
    
    try:
        with open(settings_path, 'r') as f:
            settings = json.load(f)
            
        print(f"Settings file exists with {len(settings)} keys:")
        for key in settings:
            if key == 'auth_data':
                auth_data = settings[key]
                print(f"  - auth_data:")
                if 'server_url' in auth_data:
                    print(f"    - server_url: {auth_data['server_url']}")
                if 'user_id' in auth_data:
                    print(f"    - user_id: {auth_data['user_id']}")
                if 'access_token' in auth_data:
                    print(f"    - access_token: {auth_data['access_token'][:10]}...")
                if 'user_data' in auth_data and isinstance(auth_data['user_data'], dict):
                    user = auth_data['user_data'].get('User', {})
                    print(f"    - user_data: {user.get('Name')} (ID: {user.get('Id')})")
            else:
                print(f"  - {key}: {settings[key]}")
                
        return True
    except json.JSONDecodeError:
        print("settings.json exists but is not valid JSON. Backing up and creating new file.")
        os.rename(settings_path, settings_path.with_suffix('.json.bak'))
        with open(settings_path, 'w') as f:
            f.write('{}')
        return False
    except Exception as e:
        print(f"Error reading settings file: {str(e)}")
        return False

def reset_settings():
    """Reset settings file to clear any stored data"""
    settings_path = Path("settings.json")
    
    if settings_path.exists():
        backup_path = settings_path.with_suffix('.json.bak')
        print(f"Backing up current settings to {backup_path}")
        try:
            os.rename(settings_path, backup_path)
        except Exception as e:
            print(f"Error backing up settings: {str(e)}")
    
    print("Creating new empty settings file")
    with open(settings_path, 'w') as f:
        f.write('{}')
    
    print("Settings reset complete. Restart the app to log in again.")

def check_directories():
    """Check if all required directories exist"""
    required_dirs = [
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
    
    print("Checking required directories:")
    
    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists() and path.is_dir():
            print(f"  - {dir_path}: ✓")
        else:
            print(f"  - {dir_path}: ✗ (creating)")
            path.mkdir(exist_ok=True, parents=True)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_settings()
    else:
        print("=== Jellyfin Music Player Navigation Fix ===")
        print("\nThis utility will check and repair common issues with the app.\n")
        
        check_directories()
        print("")
        check_settings_file()
        
        print("\nChecks complete. If you want to reset all settings and start fresh, run:")
        print("python nav_fix.py reset")