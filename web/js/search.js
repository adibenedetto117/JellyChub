/**
 * Authentication handler for JellyTorrent
 */
class AuthHandler {
    constructor() {
        this.loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        this.loginForm = document.getElementById('loginForm');
        this.loginError = document.getElementById('loginError');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.init();
    }

    /**
     * Initialize auth handler
     */
    init() {
        // Add event listeners
        this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        
        // Check authentication on page load
        this.checkAuth();
    }

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        if (!api.isAuthenticated()) {
            this.showLoginModal();
        }
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        this.loginModal.show();
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        this.loginModal.hide();
    }

    /**
     * Handle login form submission
     * @param {Event} event - Form submit event
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            this.loginError.classList.add('d-none');
            await api.login(username, password);
            this.hideLoginModal();
            
            // Reset form
            this.loginForm.reset();
            
            // Refresh data
            if (typeof torrentsHandler !== 'undefined') {
                torrentsHandler.loadTorrents();
            }
            
            if (typeof libraryHandler !== 'undefined') {
                libraryHandler.loadLibrary();
            }
        } catch (error) {
            this.loginError.classList.remove('d-none');
            console.error('Login error:', error);
        }
    }

    /**
     * Handle logout button click
     * @param {Event} event - Click event
     */
    handleLogout(event) {
        event.preventDefault();
        
        api.clearToken();
        this.showLoginModal();
    }
}

// Initialize auth handler
const authHandler = new AuthHandler();