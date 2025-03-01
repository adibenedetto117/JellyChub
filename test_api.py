#!/usr/bin/env python3
"""
Test script for Jellyfin API authentication
"""
import os
import sys
import requests
from urllib.parse import urljoin
import json

# Test parameters
server_url = input("Enter Jellyfin server URL (e.g. http://192.168.1.100:8096): ")
username = input("Enter username: ")
password = input("Enter password: ")

print(f"\nTesting connection to {server_url}...")

# Test basic connection
try:
    response = requests.get(server_url)
    print(f"Server connection test: {'Success' if response.status_code == 200 else 'Failed - Status: ' + str(response.status_code)}")
except Exception as e:
    print(f"Server connection test: Failed - {str(e)}")
    sys.exit(1)

# Test authentication
auth_endpoint = urljoin(server_url, "Users/AuthenticateByName")
headers = {
    'Content-Type': 'application/json',
    'X-Emby-Authorization': 'MediaBrowser Client="Jellyfin Test", Device="Python Test", DeviceId="test123", Version="1.0.0"'
}
data = {
    "Username": username,
    "Pw": password
}

print(f"\nTesting authentication...")
print(f"Endpoint: {auth_endpoint}")
print(f"Headers: {headers}")
print(f"Data: {data}")

try:
    response = requests.post(auth_endpoint, headers=headers, json=data)
    
    print(f"Status code: {response.status_code}")
    print(f"Response headers: {response.headers}")
    
    if response.status_code == 200:
        result = response.json()
        print("\nAuthentication successful!")
        print(f"User ID: {result.get('User', {}).get('Id')}")
        print(f"Access Token: {result.get('AccessToken')}...")
    else:
        print(f"Authentication failed: {response.text}")
except Exception as e:
    print(f"Authentication test failed: {str(e)}")

print("\nTest completed.")