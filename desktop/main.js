const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

// Determine platform
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Store window state
let mainWindow = null;
let localServer = null;
const LOCAL_PORT = 45678;
let windowState = {
  width: 1280,
  height: 720,
  x: undefined,
  y: undefined,
  isMaximized: false,
};

// Window state file path
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

// Load window state
function loadWindowState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      windowState = { ...windowState, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load window state:', e);
  }
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return;

  try {
    const bounds = mainWindow.getBounds();
    windowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(windowState));
  } catch (e) {
    console.error('Failed to save window state:', e);
  }
}

// Simple static file server for serving the web app
function startLocalServer(distPath) {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.eot': 'application/vnd.ms-fontobject',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };

    localServer = http.createServer((req, res) => {
      let pathname = url.parse(req.url).pathname;

      // Default to index.html for root
      if (pathname === '/') {
        pathname = '/index.html';
      }

      const filePath = path.join(distPath, pathname);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // For SPA routing, serve index.html for any missing route
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(distPath, 'index.html'), (err2, indexData) => {
              if (err2) {
                res.writeHead(404);
                res.end('Not Found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexData);
              }
            });
          } else {
            res.writeHead(500);
            res.end('Server Error');
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    localServer.listen(LOCAL_PORT, '127.0.0.1', () => {
      console.log(`Local server running at http://127.0.0.1:${LOCAL_PORT}`);
      resolve();
    });

    localServer.on('error', reject);
  });
}

// Create main window
function createWindow() {
  loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: !isMac,
    backgroundColor: '#000000',
    show: false,
  });

  // Load the app from local server
  mainWindow.loadURL(`http://127.0.0.1:${LOCAL_PORT}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
    // Open DevTools in development
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Save state on close
  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create application menu
function createMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-platform', () => ({
  isMac,
  isWindows,
  isLinux,
  platform: process.platform,
}));

ipcMain.handle('get-theme', () => ({
  shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
  themeSource: nativeTheme.themeSource,
}));

ipcMain.handle('set-theme', (event, theme) => {
  nativeTheme.themeSource = theme; // 'dark', 'light', or 'system'
  return { success: true };
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized();
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('toggle-fullscreen', () => {
  const isFullScreen = mainWindow?.isFullScreen() ?? false;
  mainWindow?.setFullScreen(!isFullScreen);
  return !isFullScreen;
});

ipcMain.handle('is-fullscreen', () => {
  return mainWindow?.isFullScreen() ?? false;
});

// App lifecycle
app.whenReady().then(async () => {
  // Start local server for serving web app
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    await startLocalServer(distPath);
  }

  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
  }
  if (!isMac) {
    app.quit();
  }
});

// Security: Prevent navigation to unknown URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Allow localhost for development
    if (parsedUrl.hostname !== 'localhost' && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});
