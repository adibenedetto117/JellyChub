import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { downloadManager, encryptionService } from '@/services';
import { getItem, getBookDownloadUrl, reportPlaybackProgress, generatePlaySessionId } from '@/api';
import type { PdfReaderCore, UsePdfReaderCoreOptions } from './pdf/types';

export type { PdfReaderCore, UsePdfReaderCoreOptions };

export function usePdfReaderCore({ itemId }: UsePdfReaderCoreOptions): PdfReaderCore {
  const webViewRef = useRef<WebView>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((s) => s.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const getDownloadByItemId = useDownloadStore((s) => s.getDownloadByItemId);
  const userId = currentUser?.Id ?? '';

  // Download state
  const downloaded = getDownloadedItem(itemId ?? '');
  const downloadInProgress = getDownloadByItemId(itemId ?? '');
  const isDownloading = downloadInProgress?.status === 'downloading' || downloadInProgress?.status === 'pending';

  const [status, setStatus] = useState<'downloading' | 'ready' | 'error'>('downloading');
  const [errorMsg, setErrorMsg] = useState('');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [playSessionId] = useState(() => generatePlaySessionId());

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId!),
    enabled: !!userId && !!itemId,
  });

  // Load saved progress
  useEffect(() => {
    if (!itemId) return;
    const stored = useReadingProgressStore.getState().progress[itemId];
    if (stored?.position && typeof stored.position === 'number') {
      setCurrentPage(Math.max(1, Math.round(stored.position)));
    }
  }, [itemId]);

  // Download PDF
  useEffect(() => {
    let cancelled = false;

    const download = async () => {
      if (!itemId) return;

      const currentItemId = itemId;

      try {
        setStatus('downloading');
        setDebugInfo('Getting download URL...');

        let localUri: string;

        const downloaded = getDownloadedItem(currentItemId);
        if (downloaded?.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(downloaded.localPath);
          if (fileInfo.exists) {
            setDebugInfo('Loading downloaded PDF...');
            if (downloaded.localPath.endsWith('.enc')) {
              localUri = await encryptionService.getDecryptedUri(downloaded.localPath);
            } else {
              localUri = downloaded.localPath;
            }
          } else {
            localUri = await downloadToCache();
          }
        } else {
          localUri = await downloadToCache();
        }

        async function downloadToCache(): Promise<string> {
          const downloadUrl = getBookDownloadUrl(currentItemId);
          const cacheUri = `${FileSystem.cacheDirectory}book_${currentItemId}.pdf`;

          const fileInfo = await FileSystem.getInfoAsync(cacheUri);
          if (!fileInfo.exists) {
            setDebugInfo('Downloading PDF...');
            const result = await FileSystem.downloadAsync(downloadUrl, cacheUri);
            if (result.status !== 200) {
              throw new Error(`Download failed with status ${result.status}`);
            }
          } else {
            setDebugInfo('Using cached PDF...');
          }

          return cacheUri;
        }

        if (cancelled) return;

        setDebugInfo('Reading PDF file...');
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (cancelled) return;

        setDebugInfo(`PDF loaded (${Math.round(base64.length / 1024)}KB)`);
        setPdfBase64(base64);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Download failed');
          setStatus('error');
        }
      }
    };

    download();
    return () => { cancelled = true; };
  }, [itemId, getDownloadedItem]);

  // Save progress
  useEffect(() => {
    if (!item || !currentPage || totalPages === 0) return;

    const author = item.People?.find(p => p.Type === 'Author')?.Name;
    useReadingProgressStore.getState().updateProgress(item.Id, {
      itemId: item.Id,
      itemName: item.Name ?? 'Unknown',
      itemType: 'Book',
      coverImageTag: item.ImageTags?.Primary,
      author,
      position: currentPage,
      total: totalPages,
    });

    // Sync progress to Jellyfin server
    const totalTicks = item.RunTimeTicks || 10000000000;
    const positionTicks = Math.round(totalTicks * (currentPage / totalPages));
    reportPlaybackProgress({
      ItemId: item.Id,
      MediaSourceId: item.Id,
      PositionTicks: positionTicks,
      IsPaused: true,
      IsMuted: false,
      PlaySessionId: playSessionId,
    }).catch(() => {});
  }, [item, currentPage, totalPages, playSessionId]);

  const injectPdfData = useCallback(() => {
    if (!pdfBase64 || !webViewRef.current) return;

    const CHUNK_SIZE = 100000;
    const totalChunks = Math.ceil(pdfBase64.length / CHUNK_SIZE);

    webViewRef.current.injectJavaScript(`window.pdfChunks = []; window.totalChunks = ${totalChunks}; true;`);

    for (let i = 0; i < pdfBase64.length; i += CHUNK_SIZE) {
      const chunk = pdfBase64.substring(i, i + CHUNK_SIZE);
      const escaped = chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      webViewRef.current.injectJavaScript(`window.pdfChunks.push("${escaped}"); true;`);
    }

    webViewRef.current.injectJavaScript(`initPdfFromChunks(); true;`);
  }, [pdfBase64]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'webviewReady':
          setDebugInfo('Injecting PDF data...');
          injectPdfData();
          break;
        case 'ready':
          setIsLoading(false);
          if (data.numPages) setTotalPages(data.numPages);
          if (data.currentPage) setCurrentPage(data.currentPage);
          setDebugInfo(`Ready: ${data.numPages} pages`);
          break;
        case 'pageChange':
          setCurrentPage(data.page);
          break;
        case 'error':
          setDebugInfo(`Error: ${data.message}`);
          setErrorMsg(data.message);
          setIsLoading(false);
          break;
        case 'debug':
          setDebugInfo(data.message);
          break;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [injectPdfData]);

  const goToPage = useCallback((page: number) => {
    const target = Math.max(1, Math.min(totalPages || 1, page));
    webViewRef.current?.injectJavaScript(`goToPage(${target}); true;`);
  }, [totalPages]);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch (error) {
      console.error('Failed to start download:', error);
    }
  }, [item, activeServerId]);

  const handleClose = useCallback(() => {
    const { dismissModal } = require('@/utils');
    dismissModal();
  }, []);

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const getPdfHtml = useCallback(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #121212; overflow: hidden; touch-action: pan-y; }
    #container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    #page-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s ease-out;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    #status {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #888;
      font-family: system-ui;
      text-align: center;
      font-size: 14px;
      z-index: 100;
    }
    .tap-zone {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 25%;
      z-index: 10;
    }
    .tap-zone.left { left: 0; }
    .tap-zone.right { right: 0; }
    .tap-zone:active { background: rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div id="container">
    <div class="tap-zone left" id="tap-left"></div>
    <div id="page-wrapper">
      <canvas id="pdf-canvas"></canvas>
    </div>
    <div class="tap-zone right" id="tap-right"></div>
  </div>
  <div id="status">Loading PDF.js...</div>

  <script>
    var pdfDoc = null;
    var pageNum = ${currentPage};
    var pageRendering = false;
    var pageNumPending = null;
    var canvas = document.getElementById('pdf-canvas');
    var ctx = canvas.getContext('2d');
    var pageWrapper = document.getElementById('page-wrapper');
    var pageCache = {};
    var cacheSize = 5;
    window.pdfChunks = [];

    function msg(type, data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type, ...data})); } catch(e) {}
    }

    function debug(m) {
      document.getElementById('status').textContent = m;
      msg('debug', {message: m});
    }

    var devicePixelRatio = window.devicePixelRatio || 2;
    var renderScale = Math.max(devicePixelRatio, 3);

    function getScale() {
      var fitScale = Math.min(
        (window.innerWidth - 16) / 612,
        (window.innerHeight - 16) / 792
      );
      return fitScale * renderScale;
    }

    function getDisplayScale() {
      return Math.min(
        (window.innerWidth - 16) / 612,
        (window.innerHeight - 16) / 792
      );
    }

    function preloadPage(num) {
      if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
      if (pageCache[num]) return;

      pdfDoc.getPage(num).then(function(page) {
        var scale = getScale();
        var displayScale = getDisplayScale();
        var viewport = page.getViewport({ scale: scale });
        var offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        var offCtx = offscreen.getContext('2d');

        page.render({ canvasContext: offCtx, viewport: viewport }).promise.then(function() {
          pageCache[num] = {
            canvas: offscreen,
            width: viewport.width,
            height: viewport.height,
            displayWidth: viewport.width / renderScale,
            displayHeight: viewport.height / renderScale
          };

          var keys = Object.keys(pageCache).map(Number).sort(function(a,b) { return Math.abs(a - pageNum) - Math.abs(b - pageNum); });
          while (keys.length > cacheSize) {
            var far = keys.pop();
            delete pageCache[far];
          }
        });
      });
    }

    function renderPage(num) {
      if (!pdfDoc) return;
      pageRendering = true;

      if (pageCache[num]) {
        var cached = pageCache[num];
        canvas.width = cached.width;
        canvas.height = cached.height;
        canvas.style.width = cached.displayWidth + 'px';
        canvas.style.height = cached.displayHeight + 'px';
        ctx.drawImage(cached.canvas, 0, 0);
        pageRendering = false;
        document.getElementById('status').style.display = 'none';
        msg('pageChange', { page: num });

        preloadPage(num - 1);
        preloadPage(num + 1);

        if (pageNumPending !== null) {
          var pending = pageNumPending;
          pageNumPending = null;
          renderPage(pending);
        }
        return;
      }

      pdfDoc.getPage(num).then(function(page) {
        var scale = getScale();
        var viewport = page.getViewport({ scale: scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = (viewport.width / renderScale) + 'px';
        canvas.style.height = (viewport.height / renderScale) + 'px';

        page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function() {
          pageRendering = false;
          document.getElementById('status').style.display = 'none';
          msg('pageChange', { page: num });

          preloadPage(num - 1);
          preloadPage(num + 1);

          if (pageNumPending !== null) {
            var pending = pageNumPending;
            pageNumPending = null;
            renderPage(pending);
          }
        }).catch(function(e) {
          pageRendering = false;
          debug('Render error: ' + e.message);
        });
      }).catch(function(e) {
        pageRendering = false;
        debug('Page error: ' + e.message);
      });
    }

    function goToPage(num) {
      if (!pdfDoc) return;
      if (num < 1 || num > pdfDoc.numPages) return;
      if (num === pageNum) return;

      pageWrapper.style.opacity = '0.7';
      pageNum = num;

      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }

      setTimeout(function() { pageWrapper.style.opacity = '1'; }, 100);
    }

    function initPdfFromChunks() {
      debug('Assembling PDF data...');

      try {
        if (!window.pdfChunks || window.pdfChunks.length === 0) {
          throw new Error('No PDF data received');
        }

        var base64 = window.pdfChunks.join('');
        window.pdfChunks = null;
        debug('Decoding ' + Math.round(base64.length / 1024) + 'KB...');

        var binary = atob(base64);
        base64 = null;
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        binary = null;

        debug('Loading PDF...');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';

        pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
          pdfDoc = pdf;

          if (pageNum > pdf.numPages) pageNum = 1;

          msg('ready', { numPages: pdf.numPages, currentPage: pageNum });
          renderPage(pageNum);

          for (var i = Math.max(1, pageNum - 1); i <= Math.min(pdf.numPages, pageNum + 2); i++) {
            if (i !== pageNum) preloadPage(i);
          }
        }).catch(function(e) {
          debug('PDF load error: ' + e.message);
          msg('error', { message: 'Failed to load PDF: ' + e.message });
        });
      } catch(e) {
        debug('Error: ' + e.message);
        msg('error', { message: e.message });
      }
    }

    function loadPdfJs() {
      debug('Loading PDF.js...');
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = function() {
        debug('Ready for data...');
        msg('webviewReady', {});
      };
      script.onerror = function() {
        var script2 = document.createElement('script');
        script2.src = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js';
        script2.onload = function() { msg('webviewReady', {}); };
        script2.onerror = function() { msg('error', { message: 'Failed to load PDF.js' }); };
        document.head.appendChild(script2);
      };
      document.head.appendChild(script);
    }

    document.getElementById('tap-left').addEventListener('click', function(e) {
      e.preventDefault();
      if (pdfDoc && pageNum > 1) goToPage(pageNum - 1);
    });

    document.getElementById('tap-right').addEventListener('click', function(e) {
      e.preventDefault();
      if (pdfDoc && pageNum < pdfDoc.numPages) goToPage(pageNum + 1);
    });

    var touchStartX = 0;
    var touchStartY = 0;
    var touchStartTime = 0;

    document.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (!pdfDoc) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      var dt = Date.now() - touchStartTime;

      if (dt < 300 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0 && pageNum > 1) {
          goToPage(pageNum - 1);
        } else if (dx < 0 && pageNum < pdfDoc.numPages) {
          goToPage(pageNum + 1);
        }
      }
    }, { passive: true });

    loadPdfJs();
  </script>
</body>
</html>
  `, [currentPage]);

  return {
    // Item data
    item,
    itemId,

    // Status
    status,
    errorMsg,
    debugInfo,
    isLoading,

    // PDF state
    pdfBase64,
    currentPage,
    totalPages,
    progressPercent,

    // Download
    downloaded,
    isDownloading,
    handleDownload,

    // Navigation
    goToPage,
    handleClose,

    // WebView
    webViewRef,
    handleMessage,
    getPdfHtml,
    injectPdfData,

    // Misc
    accentColor,
  };
}
