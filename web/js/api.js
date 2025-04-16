/**
 * API client for JellyTorrent
 */
class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.token = localStorage.getItem('token');
    }

    /**
     * Set the authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * Clear the authentication token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * Get the authentication token
     * @returns {string} JWT token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check if the user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get headers for API requests
     * @param {boolean} includeAuth - Whether to include authentication header
     * @returns {Object} Headers object
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response
     * @returns {Promise} Parsed response
     */
    async handleResponse(response) {
        const contentType = response.headers.get('Content-Type') || '';
        
        if (response.status === 401) {
            this.clearToken();
            window.location.reload();
            throw new Error('Authentication error');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'API error');
        }

        if (contentType.includes('application/json')) {
            return response.json();
        }

        return response.text();
    }

    /**
     * Make API request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {boolean} auth - Whether to include authentication
     * @returns {Promise} API response
     */
    async request(method, endpoint, data = null, auth = true) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(auth)
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`API error (${method} ${endpoint}):`, error);
            throw error;
        }
    }

    // Authentication endpoints

    /**
     * Login
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise} Login response
     */
    async login(username, password) {
        const response = await this.request('POST', '/api/login', { username, password }, false);
        this.setToken(response.access_token);
        return response;
    }

    // Status endpoint

    /**
     * Get API status
     * @returns {Promise} Status response
     */
    async getStatus() {
        return this.request('GET', '/api/status', null, false);
    }

    // Torrent endpoints

    /**
     * Get all torrents
     * @returns {Promise} Torrents list
     */
    async getTorrents() {
        return this.request('GET', '/api/torrents');
    }

    /**
     * Get a specific torrent
     * @param {string} infoHash - Torrent info hash
     * @returns {Promise} Torrent details
     */
    async getTorrent(infoHash) {
        return this.request('GET', `/api/torrents/${infoHash}`);
    }

    /**
     * Add a torrent
     * @param {string} magnetOrUrl - Magnet link or torrent URL
     * @param {string} savePath - Optional save path
     * @returns {Promise} Add response
     */
    async addTorrent(magnetOrUrl, savePath = null) {
        return this.request('POST', '/api/torrents', {
            magnet_or_url: magnetOrUrl,
            save_path: savePath
        });
    }

    /**
     * Remove a torrent
     * @param {string} infoHash - Torrent info hash
     * @param {boolean} removeFiles - Whether to remove downloaded files
     * @returns {Promise} Remove response
     */
    async removeTorrent(infoHash, removeFiles = false) {
        return this.request('DELETE', `/api/torrents/${infoHash}?remove_files=${removeFiles}`);
    }

    /**
     * Pause a torrent
     * @param {string} infoHash - Torrent info hash
     * @returns {Promise} Pause response
     */
    async pauseTorrent(infoHash) {
        return this.request('POST', `/api/torrents/${infoHash}/pause`);
    }

    /**
     * Resume a torrent
     * @param {string} infoHash - Torrent info hash
     * @returns {Promise} Resume response
     */
    async resumeTorrent(infoHash) {
        return this.request('POST', `/api/torrents/${infoHash}/resume`);
    }

    /**
     * Set file priorities for a torrent
     * @param {string} infoHash - Torrent info hash
     * @param {Array} priorities - Array of { index, priority } objects
     * @returns {Promise} Set priorities response
     */
    async setFilePriorities(infoHash, priorities) {
        return this.request('POST', `/api/torrents/${infoHash}/priorities`, priorities);
    }

    /**
     * Get stream URL for a file
     * @param {string} infoHash - Torrent info hash
     * @param {number} fileIndex - File index
     * @returns {string} Stream URL
     */
    getStreamUrl(infoHash, fileIndex) {
        return `${this.baseUrl}/api/stream/${infoHash}/${fileIndex}`;
    }

    // Search endpoints

    /**
     * Search for movies
     * @param {string} query - Search query
     * @param {string} imdbId - Optional IMDB ID
     * @param {number} limit - Maximum results
     * @returns {Promise} Search results
     */
    async searchMovies(query, imdbId = null, limit = 20) {
        return this.request('POST', '/api/search/movies', {
            query,
            imdb_id: imdbId,
            limit
        });
    }

    /**
     * Search for TV shows
     * @param {string} query - Search query
     * @param {string} tvdbId - Optional TVDB ID
     * @param {number} season - Optional season number
     * @param {number} episode - Optional episode number
     * @param {number} limit - Maximum results
     * @returns {Promise} Search results
     */
    async searchTVShows(query, tvdbId = null, season = null, episode = null, limit = 20) {
        return this.request('POST', '/api/search/tvshows', {
            query,
            tvdb_id: tvdbId,
            season,
            episode,
            limit
        });
    }

    // Jellyfin integration endpoints

    /**
     * Add a virtual movie to Jellyfin
     * @param {Object} movieData - Movie data
     * @returns {Promise} Add response
     */
    async addVirtualMovie(movieData) {
        return this.request('POST', '/api/jellyfin/movies', movieData);
    }

    /**
     * Add a virtual TV show to Jellyfin
     * @param {Object} showData - TV show data
     * @returns {Promise} Add response
     */
    async addVirtualTVShow(showData) {
        return this.request('POST', '/api/jellyfin/tvshows', showData);
    }

    /**
     * Get a virtual item
     * @param {string} libId - Library ID
     * @param {string} itemId - Item ID
     * @returns {Promise} Virtual item
     */
    async getVirtualItem(libId, itemId) {
        return this.request('GET', `/api/jellyfin/virtual/${libId}/${itemId}`);
    }

    /**
     * Remove a virtual item
     * @param {string} libId - Library ID
     * @param {string} itemId - Item ID
     * @returns {Promise} Remove response
     */
    async removeVirtualItem(libId, itemId) {
        return this.request('DELETE', `/api/jellyfin/virtual/${libId}/${itemId}`);
    }
}

// Create and export API client instance
const api = new ApiClient();