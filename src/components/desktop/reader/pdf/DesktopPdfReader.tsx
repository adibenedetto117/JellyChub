import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import type { PdfReaderCore } from '@/hooks';

interface DesktopPdfReaderProps {
  core: PdfReaderCore;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const DEFAULT_ZOOM_INDEX = 2;

export function DesktopPdfReader({ core }: DesktopPdfReaderProps) {
  const {
    item,
    itemId,
    status,
    errorMsg,
    debugInfo,
    isLoading,
    pdfBase64,
    currentPage,
    totalPages,
    progressPercent,
    downloaded,
    isDownloading,
    handleDownload,
    goToPage,
    handleClose,
    webViewRef,
    handleMessage,
    accentColor,
  } = core;

  const [showSidebar, setShowSidebar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [page: number]: string }>({});
  const sidebarWidth = useSharedValue(showSidebar ? 200 : 0);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    sidebarWidth.value = withTiming(showSidebar ? 200 : 0, { duration: 200 });
  }, [showSidebar, sidebarWidth]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoomLevel(1);
            updateZoom(1);
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'b':
          e.preventDefault();
          setShowSidebar((prev) => !prev);
          break;
        case 'Escape':
          handleClose();
          break;
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const pageNum = prompt('Go to page:', String(currentPage));
            if (pageNum) {
              const num = parseInt(pageNum, 10);
              if (!isNaN(num)) goToPage(num);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, goToPage, handleClose]);

  const updateZoom = useCallback((zoom: number) => {
    webViewRef.current?.injectJavaScript(`setZoom(${zoom}); true;`);
  }, [webViewRef]);

  const handleZoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoomLevel);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    const newZoom = ZOOM_LEVELS[nextIndex];
    setZoomLevel(newZoom);
    updateZoom(newZoom);
  }, [zoomLevel, updateZoom]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoomLevel);
    const prevIndex = Math.max(currentIndex - 1, 0);
    const newZoom = ZOOM_LEVELS[prevIndex];
    setZoomLevel(newZoom);
    updateZoom(newZoom);
  }, [zoomLevel, updateZoom]);

  const handlePageInputSubmit = useCallback(() => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    } else {
      setPageInput(String(currentPage));
    }
  }, [pageInput, totalPages, goToPage, currentPage]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    setIsSearching(true);
    webViewRef.current?.injectJavaScript(`searchText("${searchQuery.replace(/"/g, '\\"')}"); true;`);
  }, [searchQuery, webViewRef]);

  const handleNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    goToPage(searchResults[nextIndex]);
  }, [searchResults, currentSearchIndex, goToPage]);

  const handlePrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    goToPage(searchResults[prevIndex]);
  }, [searchResults, currentSearchIndex, goToPage]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'searchResults') {
        setSearchResults(data.pages || []);
        setCurrentSearchIndex(data.pages?.length > 0 ? 0 : -1);
        setIsSearching(false);
        if (data.pages?.length > 0) {
          goToPage(data.pages[0]);
        }
      } else if (data.type === 'thumbnail') {
        setThumbnails((prev) => ({ ...prev, [data.page]: data.dataUrl }));
      } else {
        handleMessage(event);
      }
    } catch {
      handleMessage(event);
    }
  }, [handleMessage, goToPage]);

  const sidebarStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
    opacity: sidebarWidth.value > 0 ? 1 : 0,
  }));

  const getDesktopPdfHtml = useCallback(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #1a1a1a; overflow: hidden; }
    #container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }
    #page-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      min-height: 100%;
    }
    canvas {
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    }
    #status {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #888;
      font-family: system-ui;
      font-size: 14px;
    }
    .highlight { background: rgba(255, 255, 0, 0.4); }
  </style>
</head>
<body>
  <div id="container">
    <div id="page-wrapper">
      <canvas id="pdf-canvas"></canvas>
    </div>
  </div>
  <div id="status">Loading PDF.js...</div>

  <script>
    var pdfDoc = null;
    var pageNum = ${currentPage};
    var pageRendering = false;
    var pageNumPending = null;
    var currentZoom = 1;
    var canvas = document.getElementById('pdf-canvas');
    var ctx = canvas.getContext('2d');
    window.pdfChunks = [];

    function msg(type, data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type, ...data})); } catch(e) {}
    }

    function debug(m) {
      document.getElementById('status').textContent = m;
      msg('debug', {message: m});
    }

    var baseScale = 1.5;

    function getScale() {
      return baseScale * currentZoom * (window.devicePixelRatio || 1);
    }

    function setZoom(zoom) {
      currentZoom = zoom;
      if (pdfDoc) renderPage(pageNum);
    }

    function renderPage(num) {
      if (!pdfDoc) return;
      pageRendering = true;

      pdfDoc.getPage(num).then(function(page) {
        var scale = getScale();
        var viewport = page.getViewport({ scale: scale });
        var displayScale = baseScale * currentZoom;
        var displayViewport = page.getViewport({ scale: displayScale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = displayViewport.width + 'px';
        canvas.style.height = displayViewport.height + 'px';

        page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function() {
          pageRendering = false;
          document.getElementById('status').style.display = 'none';
          msg('pageChange', { page: num });

          if (pageNumPending !== null) {
            var pending = pageNumPending;
            pageNumPending = null;
            renderPage(pending);
          }
        });
      });
    }

    function goToPage(num) {
      if (!pdfDoc) return;
      if (num < 1 || num > pdfDoc.numPages) return;
      pageNum = num;
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
      document.getElementById('container').scrollTop = 0;
    }

    function searchText(query) {
      if (!pdfDoc || !query) {
        msg('searchResults', { pages: [] });
        return;
      }

      var results = [];
      var promises = [];

      for (var i = 1; i <= pdfDoc.numPages; i++) {
        (function(pageIdx) {
          promises.push(
            pdfDoc.getPage(pageIdx).then(function(page) {
              return page.getTextContent().then(function(textContent) {
                var text = textContent.items.map(function(item) { return item.str; }).join(' ');
                if (text.toLowerCase().includes(query.toLowerCase())) {
                  results.push(pageIdx);
                }
              });
            })
          );
        })(i);
      }

      Promise.all(promises).then(function() {
        results.sort(function(a, b) { return a - b; });
        msg('searchResults', { pages: results });
      });
    }

    function generateThumbnail(pageNum) {
      if (!pdfDoc) return;

      pdfDoc.getPage(pageNum).then(function(page) {
        var scale = 0.2;
        var viewport = page.getViewport({ scale: scale });
        var thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = viewport.width;
        thumbCanvas.height = viewport.height;
        var thumbCtx = thumbCanvas.getContext('2d');

        page.render({ canvasContext: thumbCtx, viewport: viewport }).promise.then(function() {
          msg('thumbnail', { page: pageNum, dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.6) });
        });
      });
    }

    function initPdfFromChunks() {
      debug('Assembling PDF data...');
      try {
        if (!window.pdfChunks || window.pdfChunks.length === 0) {
          throw new Error('No PDF data received');
        }

        var base64 = window.pdfChunks.join('');
        window.pdfChunks = null;
        debug('Decoding...');

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

          for (var i = 1; i <= Math.min(pdf.numPages, 20); i++) {
            generateThumbnail(i);
          }
        }).catch(function(e) {
          debug('PDF load error: ' + e.message);
          msg('error', { message: e.message });
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

    document.getElementById('container').addEventListener('wheel', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.1 : 0.1;
        currentZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
        renderPage(pageNum);
      }
    }, { passive: false });

    loadPdfJs();
  </script>
</body>
</html>
  `, [currentPage]);

  const injectDesktopPdfData = useCallback(() => {
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
  }, [pdfBase64, webViewRef]);

  const handleDesktopMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'webviewReady') {
        injectDesktopPdfData();
      } else {
        handleWebViewMessage(event);
      }
    } catch {
      handleWebViewMessage(event);
    }
  }, [injectDesktopPdfData, handleWebViewMessage]);

  if (status === 'downloading') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Downloading PDF...</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load PDF</Text>
          <Text style={styles.errorSubtext}>{errorMsg}</Text>
          <Pressable onPress={handleClose} style={[styles.errorButton, { backgroundColor: accentColor }]}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Pressable onPress={handleClose} style={styles.toolbarButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setShowSidebar((prev) => !prev)}
            style={[styles.toolbarButton, showSidebar && styles.toolbarButtonActive]}
          >
            <Ionicons name="menu" size={20} color="#fff" />
          </Pressable>
          <View style={styles.toolbarDivider} />
          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {item?.Name ?? 'PDF'}
          </Text>
        </View>

        <View style={styles.toolbarCenter}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#888" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchResults.length > 0 && (
              <View style={styles.searchResultsNav}>
                <Text style={styles.searchResultsText}>
                  {currentSearchIndex + 1}/{searchResults.length}
                </Text>
                <Pressable onPress={handlePrevSearchResult} style={styles.searchNavButton}>
                  <Ionicons name="chevron-up" size={16} color="#fff" />
                </Pressable>
                <Pressable onPress={handleNextSearchResult} style={styles.searchNavButton}>
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </Pressable>
              </View>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color={accentColor} style={styles.searchSpinner} />
            )}
          </View>
        </View>

        <View style={styles.toolbarRight}>
          <View style={styles.pageNavContainer}>
            <Pressable
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              style={[styles.pageNavButton, currentPage <= 1 && styles.pageNavButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={18} color={currentPage <= 1 ? '#555' : '#fff'} />
            </Pressable>
            <View style={styles.pageInputContainer}>
              <TextInput
                style={styles.pageInput}
                value={pageInput}
                onChangeText={setPageInput}
                onSubmitEditing={handlePageInputSubmit}
                onBlur={handlePageInputSubmit}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <Text style={styles.pageTotal}>/ {totalPages || '...'}</Text>
            </View>
            <Pressable
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={[styles.pageNavButton, currentPage >= totalPages && styles.pageNavButtonDisabled]}
            >
              <Ionicons name="chevron-forward" size={18} color={currentPage >= totalPages ? '#555' : '#fff'} />
            </Pressable>
          </View>

          <View style={styles.toolbarDivider} />

          <View style={styles.zoomControls}>
            <Pressable
              onPress={handleZoomOut}
              disabled={zoomLevel <= ZOOM_LEVELS[0]}
              style={[styles.zoomButton, zoomLevel <= ZOOM_LEVELS[0] && styles.zoomButtonDisabled]}
            >
              <Ionicons name="remove" size={18} color={zoomLevel <= ZOOM_LEVELS[0] ? '#555' : '#fff'} />
            </Pressable>
            <Pressable onPress={() => { setZoomLevel(1); updateZoom(1); }} style={styles.zoomPercentButton}>
              <Text style={styles.zoomPercent}>{Math.round(zoomLevel * 100)}%</Text>
            </Pressable>
            <Pressable
              onPress={handleZoomIn}
              disabled={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              style={[styles.zoomButton, zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1] && styles.zoomButtonDisabled]}
            >
              <Ionicons name="add" size={18} color={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ? '#555' : '#fff'} />
            </Pressable>
          </View>

          <View style={styles.toolbarDivider} />

          <Pressable
            onPress={handleDownload}
            disabled={!!downloaded || isDownloading}
            style={styles.toolbarButton}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : downloaded ? (
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.mainContent}>
        <Animated.View style={[styles.sidebar, sidebarStyle]}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Pages</Text>
          </View>
          <ScrollView style={styles.thumbnailList} showsVerticalScrollIndicator>
            {Array.from({ length: totalPages || 0 }, (_, i) => i + 1).map((page) => (
              <Pressable
                key={page}
                onPress={() => goToPage(page)}
                style={[
                  styles.thumbnailItem,
                  currentPage === page && [styles.thumbnailItemActive, { borderColor: accentColor }],
                ]}
              >
                {thumbnails[page] ? (
                  <View style={styles.thumbnailImageContainer}>
                    <View style={styles.thumbnailPlaceholder}>
                      <Text style={styles.thumbnailPlaceholderText}>{page}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Text style={styles.thumbnailPlaceholderText}>{page}</Text>
                  </View>
                )}
                <Text style={[styles.thumbnailPageNum, currentPage === page && { color: accentColor }]}>
                  {page}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        <View style={styles.pdfContainer}>
          {pdfBase64 && (
            <WebView
              key={`pdf-desktop-${itemId}`}
              ref={webViewRef}
              source={{ html: getDesktopPdfHtml() }}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              allowFileAccess
              allowUniversalAccessFromFileURLs
              onMessage={handleDesktopMessage}
            />
          )}

          {isLoading && pdfBase64 && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>Loading PDF...</Text>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>{progressPercent}% complete</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>
            Page {currentPage} of {totalPages || '...'}
          </Text>
        </View>
      </View>

      <View style={styles.shortcutsHint}>
        <Text style={styles.shortcutsText}>
          Arrow Keys: Navigate pages | +/-: Zoom | Ctrl+F: Search | Ctrl+G: Go to page | B: Toggle sidebar | Esc: Close
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#555',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolbarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
    maxWidth: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 32,
    minWidth: 250,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  searchResultsNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  searchResultsText: {
    fontSize: 12,
    color: '#888',
    marginRight: 4,
  },
  searchNavButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  pageNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNavButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pageNavButtonDisabled: {
    opacity: 0.5,
  },
  pageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageInput: {
    width: 50,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    padding: 0,
    outlineStyle: 'none',
  } as any,
  pageTotal: {
    fontSize: 13,
    color: '#888',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomPercentButton: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPercent: {
    fontSize: 12,
    color: '#fff',
    minWidth: 45,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  sidebarHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thumbnailList: {
    flex: 1,
    padding: 8,
  },
  thumbnailItem: {
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailItemActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  thumbnailImageContainer: {
    width: 120,
    height: 160,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 160,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#555',
  },
  thumbnailPageNum: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusLeft: {
    width: 120,
  },
  statusRight: {
    width: 120,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  shortcutsHint: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#161616',
    alignItems: 'center',
  },
  shortcutsText: {
    fontSize: 10,
    color: '#444',
  },
});

export default DesktopPdfReader;
