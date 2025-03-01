#!/usr/bin/env python3
"""
Utility script to view Jellyfin libraries
"""
import sys
import requests
import json
from urllib.parse import urljoin

def view_libraries(server_url, user_id, token):
    """Get and display all libraries for a user"""
    endpoint = f"Users/{user_id}/Views"
    url = urljoin(server_url, endpoint)
    
    headers = {
        'X-Emby-Token': token
    }
    
    print(f"Requesting libraries from: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            print("\nAll Libraries:")
            print("==============")
            
            for i, library in enumerate(data.get('Items', [])):
                library_type = library.get('CollectionType', 'Unknown')
                library_name = library.get('Name', 'Unnamed')
                library_id = library.get('Id', 'No ID')
                
                print(f"{i+1}. {library_name} (Type: {library_type}, ID: {library_id})")
            
            # Extract just music libraries
            music_libraries = [lib for lib in data.get('Items', []) if lib.get('CollectionType') == 'music']
            
            print("\nMusic Libraries:")
            print("===============")
            
            if music_libraries:
                for i, library in enumerate(music_libraries):
                    print(f"{i+1}. {library.get('Name', 'Unnamed')} (ID: {library.get('Id', 'No ID')})")
            else:
                print("No music libraries found!")
                print("\nTo use the Jellyfin Music Player, you need at least one library with 'Music' type.")
                print("Please add a music library in your Jellyfin server.")
            
        else:
            print(f"Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Error requesting libraries: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python view_libraries.py <server_url> <user_id> <access_token>")
        print("\nExample: python view_libraries.py http://192.168.1.100:8096 ab123456789 myaccesstoken")
        sys.exit(1)
    
    server_url = sys.argv[1]
    user_id = sys.argv[2]
    token = sys.argv[3]
    
    view_libraries(server_url, user_id, token)