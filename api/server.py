#!/usr/bin/env python3
"""
API server for JellyTorrent
Provides a REST API and streaming functionality
"""

import os
import logging
import time
import shutil
import json
import mimetypes
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

import jwt
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse, FileResponse
from pydantic import BaseModel, Field

# Setup logger
logger = logging.getLogger('jellytorrent.api')

# Create FastAPI app
app = FastAPI(
    title="JellyTorrent API",
    description="API for streaming torrents via Jellyfin",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Add security scheme
security = HTTPBearer()

# Global variables to be set later
config = None
jellyfin_service = None
prowlarr_service = None
torrent_service = None

# Models for API
class TorrentAdd(BaseModel):
    magnet_or_url: str
    save_path: Optional[str] = None

class TorrentRemove(BaseModel):
    info_hash: str
    remove_files: bool = False

class TorrentFilePriority(BaseModel):
    info_hash: str
    file_priorities: List[Dict[str, int]]

class SearchQuery(BaseModel):
    query: str
    imdb_id: Optional[str] = None
    tvdb_id: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    limit: int = 20

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

# Setup API dependencies
def initialize_services(cfg, jfs, prs, ts):
    """Initialize API with services"""
    global config, jellyfin_service, prowlarr_service, torrent_service
    config = cfg
    jellyfin_service = jfs
    prowlarr_service = prs
    torrent_service = ts

def get_token_from_header(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract JWT token from header"""
    return credentials.credentials

def verify_token(token: str = Depends(get_token_from_header)):
    """Verify JWT token"""
    try:
        jwt_secret = config.get('api', 'jwt_secret')
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

def get_current_user(payload: dict = Depends(verify_token)):
    """Get current user from token payload"""
    return payload.get("sub")

# API Routes

@app.get("/api/status")
def get_status():
    """Get API status"""
    return {
        "status": "running",
        "version": "0.1.0",
        "services": {
            "jellyfin": jellyfin_service is not None,
            "prowlarr": prowlarr_service is not None and prowlarr_service.enabled,
            "torrent": torrent_service is not None
        }
    }

@app.post("/api/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    """Login and get JWT token"""
    username = config.get('api', 'username')
    password = config.get('api', 'password')
    
    if login_data.username != username or login_data.password != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Generate JWT token
    jwt_secret = config.get('api', 'jwt_secret')
    if not jwt_secret:
        # Generate a random secret if not set
        import secrets
        jwt_secret = secrets.token_hex(32)
        config.set('api', 'jwt_secret', jwt_secret)
    
    jwt_expiry = config.get('api', 'jwt_expiry', 7200)  # Default 2 hours
    expires = datetime.utcnow() + timedelta(seconds=jwt_expiry)
    
    payload = {
        "sub": login_data.username,
        "exp": expires
    }
    
    token = jwt.encode(payload, jwt_secret, algorithm="HS256")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": jwt_expiry
    }

# Torrent management endpoints

@app.get("/api/torrents", dependencies=[Depends(verify_token)])
def get_torrents():
    """Get all torrents"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    return torrent_service.get_all_torrents()

@app.get("/api/torrents/{info_hash}", dependencies=[Depends(verify_token)])
def get_torrent(info_hash: str):
    """Get a specific torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    status = torrent_service.get_torrent_status(info_hash)
    if not status:
        raise HTTPException(status_code=404, detail="Torrent not found")
    
    return status

@app.post("/api/torrents", dependencies=[Depends(verify_token)])
def add_torrent(torrent_data: TorrentAdd):
    """Add a new torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    info_hash = torrent_service.add_torrent(
        torrent_data.magnet_or_url,
        torrent_data.save_path
    )
    
    if not info_hash:
        raise HTTPException(status_code=400, detail="Failed to add torrent")
    
    return {"info_hash": info_hash}

@app.delete("/api/torrents/{info_hash}", dependencies=[Depends(verify_token)])
def remove_torrent(info_hash: str, remove_files: bool = False):
    """Remove a torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    success = torrent_service.remove_torrent(info_hash, remove_files)
    if not success:
        raise HTTPException(status_code=404, detail="Torrent not found")
    
    return {"success": True}

@app.post("/api/torrents/{info_hash}/pause", dependencies=[Depends(verify_token)])
def pause_torrent(info_hash: str):
    """Pause a torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    success = torrent_service.pause_torrent(info_hash)
    if not success:
        raise HTTPException(status_code=404, detail="Torrent not found")
    
    return {"success": True}

@app.post("/api/torrents/{info_hash}/resume", dependencies=[Depends(verify_token)])
def resume_torrent(info_hash: str):
    """Resume a torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    success = torrent_service.resume_torrent(info_hash)
    if not success:
        raise HTTPException(status_code=404, detail="Torrent not found")
    
    return {"success": True}

@app.post("/api/torrents/{info_hash}/priorities", dependencies=[Depends(verify_token)])
def set_file_priorities(info_hash: str, priorities: List[Dict[str, int]]):
    """Set file priorities for a torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    file_priorities = [(p["index"], p["priority"]) for p in priorities]
    success = torrent_service.set_file_priorities(info_hash, file_priorities)
    
    if not success:
        raise HTTPException(status_code=404, detail="Torrent not found or invalid priorities")
    
    return {"success": True}

# Streaming endpoints

@app.get("/api/stream/{info_hash}/{file_index}")
async def stream_file(info_hash: str, file_index: int, request: Request, response: Response):
    """Stream a file from a torrent"""
    if not torrent_service:
        raise HTTPException(status_code=503, detail="Torrent service not available")
    
    # Convert file_index to int
    try:
        file_index = int(file_index)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file index")
    
    # Get file path
    file_path = torrent_service.get_file_path(info_hash, file_index)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file is ready for streaming
    if not torrent_service.is_file_ready(info_hash, file_index):
        # Get download progress
        downloaded, total, percentage = torrent_service.get_download_progress(info_hash, file_index)
        
        # Return download status instead of file
        return JSONResponse({
            "status": "downloading",
            "downloaded": downloaded,
            "total": total,
            "percentage": percentage
        })
    
    # Get file info
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    
    # Handle range requests for seeking
    headers = {}
    range_header = request.headers.get("Range")
    
    start = 0
    end = file_size - 1
    
    if range_header:
        try:
            range_data = range_header.replace("bytes=", "").split("-")
            start = int(range_data[0]) if range_data[0] else 0
            end = int(range_data[1]) if range_data[1] else file_size - 1
        except (ValueError, IndexError):
            end = file_size - 1
    
    # Calculate chunk size
    chunk_size = end - start + 1
    
    # Set Content-Type based on file extension
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"
    
    # Create response headers
    headers.update({
        "Content-Type": content_type,
        "Accept-Ranges": "bytes",
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(chunk_size)
    })
    
    # Stream the file
    async def file_streamer():
        with open(file_path, "rb") as f:
            f.seek(start)
            data = f.read(chunk_size)
            yield data
    
    return StreamingResponse(
        file_streamer(),
        headers=headers,
        status_code=206 if range_header else 200
    )

# Search endpoints

@app.post("/api/search/movies", dependencies=[Depends(verify_token)])
def search_movies(search_query: SearchQuery):
    """Search for movies"""
    if not prowlarr_service:
        raise HTTPException(status_code=503, detail="Prowlarr service not available")
    
    results = prowlarr_service.search_movie(
        search_query.query,
        search_query.imdb_id,
        search_query.limit
    )
    
    return {"results": results}

@app.post("/api/search/tvshows", dependencies=[Depends(verify_token)])
def search_tvshows(search_query: SearchQuery):
    """Search for TV shows"""
    if not prowlarr_service:
        raise HTTPException(status_code=503, detail="Prowlarr service not available")
    
    results = prowlarr_service.search_tvshow(
        search_query.query,
        search_query.tvdb_id,
        search_query.season,
        search_query.episode,
        search_query.limit
    )
    
    return {"results": results}

# Jellyfin integration endpoints

@app.post("/api/jellyfin/movies", dependencies=[Depends(verify_token)])
def add_virtual_movie(movie_data: dict):
    """Add a virtual movie to Jellyfin"""
    if not jellyfin_service:
        raise HTTPException(status_code=503, detail="Jellyfin service not available")
    
    success = jellyfin_service.add_virtual_movie(movie_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add virtual movie")
    
    return {"success": True}

@app.post("/api/jellyfin/tvshows", dependencies=[Depends(verify_token)])
def add_virtual_tvshow(show_data: dict):
    """Add a virtual TV show to Jellyfin"""
    if not jellyfin_service:
        raise HTTPException(status_code=503, detail="Jellyfin service not available")
    
    success = jellyfin_service.add_virtual_tvshow(show_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add virtual TV show")
    
    return {"success": True}

@app.get("/api/jellyfin/virtual/{lib_id}/{item_id}", dependencies=[Depends(verify_token)])
def get_virtual_item(lib_id: str, item_id: str):
    """Get a virtual item"""
    if not jellyfin_service:
        raise HTTPException(status_code=503, detail="Jellyfin service not available")
    
    item = jellyfin_service.get_virtual_item(lib_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Virtual item not found")
    
    return item

@app.delete("/api/jellyfin/virtual/{lib_id}/{item_id}", dependencies=[Depends(verify_token)])
def remove_virtual_item(lib_id: str, item_id: str):
    """Remove a virtual item"""
    if not jellyfin_service:
        raise HTTPException(status_code=503, detail="Jellyfin service not available")
    
    success = jellyfin_service.remove_virtual_item(lib_id, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Virtual item not found")
    
    return {"success": True}

# Web UI
app.mount("/app", StaticFiles(directory="web", html=True), name="web")

@app.get("/", include_in_schema=False)
def redirect_to_web():
    """Redirect to web UI"""
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>JellyTorrent</title>
            <meta http-equiv="refresh" content="0;url=/app">
        </head>
        <body>
            <p>Redirecting to <a href="/app">JellyTorrent Web UI</a>...</p>
        </body>
        </html>
        """,
        status_code=200
    )