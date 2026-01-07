import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { getItem, getBookDownloadUrl } from '@/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReaderTheme = 'dark' | 'light' | 'sepia';

const THEMES: Record<ReaderTheme, { bg: string; text: string; name: string }> = {
  dark: { bg: '#121212', text: '#e0e0e0', name: 'Dark' },
  light: { bg: '#fafafa', text: '#1a1a1a', name: 'Light' },
  sepia: { bg: '#f4ecd8', text: '#5b4636', name: 'Sepia' },
};

interface TocItem {
  href: string;
  label: string;
}

export default function EpubReaderScreen() {
  const { itemId, cfi: startCfi } = useLocalSearchParams<{ itemId: string; cfi?: string }>();
  const decodedStartCfi = startCfi ? decodeURIComponent(startCfi) : undefined;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  // Get saved reader settings
  const savedSettings = useReadingProgressStore((s) => s.readerSettings);
  const setReaderSettings = useReadingProgressStore((s) => s.setReaderSettings);
  const updateProgressPercent = useReadingProgressStore((s) => s.updateProgressPercent);

  const [status, setStatus] = useState<'downloading' | 'ready' | 'error'>('downloading');
  const [loadingStage, setLoadingStage] = useState<string>('Connecting...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [isReaderReady, setIsReaderReady] = useState(false);
  const [isConfirmedEpub, setIsConfirmedEpub] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(savedSettings.theme);
  const [fontSize, setFontSize] = useState(savedSettings.fontSize);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [locationsReady, setLocationsReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingCfiRef = useRef<string | null>(null);

  const ebookBookmarks = useReadingProgressStore((s) => s.ebookBookmarks);
  const addEbookBookmark = useReadingProgressStore((s) => s.addEbookBookmark);
  const removeEbookBookmark = useReadingProgressStore((s) => s.removeEbookBookmark);

  const itemBookmarks = useMemo(() =>
    ebookBookmarks.filter(b => b.itemId === itemId).sort((a, b) => a.progress - b.progress),
    [ebookBookmarks, itemId]
  );

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  // Download EPUB and read as base64
  useEffect(() => {
    let cancelled = false;

    const download = async () => {
      if (!itemId) return;

      try {
        setStatus('downloading');
        setDownloadProgress(0);
        const downloadUrl = getBookDownloadUrl(itemId);
        const localUri = `${FileSystem.cacheDirectory}book_${itemId}`;

        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (!fileInfo.exists) {
          setLoadingStage('Downloading...');
          console.log('Downloading book from:', downloadUrl);

          const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            localUri,
            {},
            (progress) => {
              const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              setDownloadProgress(pct);
            }
          );

          const result = await downloadResumable.downloadAsync();
          if (!result || result.status !== 200) {
            throw new Error(`Download failed: ${result?.status}`);
          }
        } else {
          setLoadingStage('Loading from cache...');
          setDownloadProgress(1);
          console.log('Using cached book');
        }

        if (cancelled) return;

        setLoadingStage('Reading file...');
        console.log('Reading file as base64...');
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('Base64 length:', base64.length);

        if (cancelled) return;

        if (base64.startsWith('JVBERi')) {
          console.log('Detected PDF file, redirecting...');
          router.replace(`/reader/pdf?itemId=${itemId}`);
          return;
        }

        setLoadingStage('Opening book...');
        setFileUri(base64);
        setStatus('ready');
      } catch (err) {
        console.error('Download error:', err);
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Download failed');
          setStatus('error');
        }
      }
    };

    download();
    return () => { cancelled = true; };
  }, [itemId]);

  // Load saved progress or bookmark position
  const [savedPercent, setSavedPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!itemId) return;
    const stored = useReadingProgressStore.getState().progress[itemId];

    if (decodedStartCfi) {
      // If navigating from a bookmark, use the CFI
      pendingCfiRef.current = decodedStartCfi;
      setCurrentCfi(decodedStartCfi);
      setIsNavigating(true);
    } else if (stored?.position && typeof stored.position === 'string' && stored.percent > 1) {
      // Use saved CFI for resuming (like bookmarks) - only if we're past 1%
      console.log('Will resume at CFI:', stored.position, '(', stored.percent, '%)');
      pendingCfiRef.current = stored.position;
      setCurrentCfi(stored.position);
      setProgress(stored.percent / 100);
      setSavedPercent(stored.percent / 100);
      setIsNavigating(true);
    } else if (stored?.percent !== undefined && stored.percent > 0) {
      // Fallback to percentage if no valid CFI
      setSavedPercent(stored.percent / 100);
      setProgress(stored.percent / 100);
      setIsNavigating(true);
      console.log('Will resume at percent:', stored.percent, '%');
    }
  }, [itemId, decodedStartCfi]);

  // Save progress
  useEffect(() => {
    if (!item || !currentCfi) return;

    const save = () => {
      const author = item.People?.find(p => p.Type === 'Author')?.Name;
      useReadingProgressStore.getState().updateProgress(item.Id, {
        itemId: item.Id,
        itemName: item.Name ?? 'Unknown',
        itemType: 'Book',
        coverImageTag: item.ImageTags?.Primary,
        author,
        position: currentCfi,
        total: 1,
      });
    };

    const interval = setInterval(save, 10000);
    return () => {
      clearInterval(interval);
      save();
    };
  }, [item, currentCfi]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data.type);

      if (data.type === 'tap') {
        setShowControls(prev => !prev);
      } else if (data.type === 'webviewReady') {
        console.log('WebView ready, injecting epub data...');
        setLoadingStage('Parsing book...');
        injectEpubData();
      } else if (data.type === 'ready') {
        setIsReaderReady(true);
        setIsConfirmedEpub(true);
        setLoadingStage('Preparing pages...');
        if (pendingCfiRef.current) {
          webViewRef.current?.injectJavaScript(`goToCfi("${pendingCfiRef.current}"); true;`);
        }
      } else if (data.type === 'locationsReady') {
        setLocationsReady(true);
        setLoadingStage('Almost ready...');
        if (pendingCfiRef.current) {
          // Navigate to specific CFI (from bookmark)
          setIsNavigating(true);
          webViewRef.current?.injectJavaScript(`goToCfi("${pendingCfiRef.current}"); true;`);
          pendingCfiRef.current = null;
        } else if (savedPercent !== null && savedPercent > 0) {
          // Set the percent in WebView first, then navigate
          setIsNavigating(true);
          console.log('Navigating to saved percent:', savedPercent);
          webViewRef.current?.injectJavaScript(`lastKnownPercent = ${savedPercent}; goToPercent(${savedPercent}); true;`);
          setSavedPercent(null);
        }
      } else if (data.type === 'navigationComplete') {
        setIsNavigating(false);
      } else if (data.type === 'relocated') {
        // Only update CFI and progress if we're not at the very beginning
        // This prevents font/theme changes from corrupting saved position
        if (data.progress !== undefined && data.progress > 0.01) {
          if (data.cfi) setCurrentCfi(data.cfi);
          const progressValue = Math.round(data.progress * 100);
          setProgress(progressValue / 100);
          if (itemId) {
            updateProgressPercent(itemId, progressValue);
          }
        }
      } else if (data.type === 'toc') {
        setToc(data.items || []);
      } else if (data.type === 'wrongFormat') {
        console.log('Wrong format detected:', data.format);
        if (data.format === 'pdf') {
          router.replace(`/reader/pdf?itemId=${itemId}`);
        }
      } else if (data.type === 'error') {
        console.error('Reader error:', data.message);
        setErrorMsg(data.message);
      } else if (data.type === 'log') {
        console.log('Reader log:', data.message);
      }
    } catch (e) {
      console.log('Message parse error:', e);
    }
  };

  const injectEpubData = () => {
    if (!fileUri || !webViewRef.current) return;

    // Split base64 into chunks to avoid JavaScript string limits
    const chunkSize = 500000; // 500KB chunks
    const chunks = [];
    for (let i = 0; i < fileUri.length; i += chunkSize) {
      chunks.push(fileUri.substring(i, i + chunkSize));
    }

    console.log(`Injecting ${chunks.length} chunks...`);

    // Start with empty accumulator
    webViewRef.current.injectJavaScript(`window.epubBase64 = ""; true;`);

    // Inject each chunk
    chunks.forEach((chunk, i) => {
      // Escape special characters
      const escaped = chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      webViewRef.current?.injectJavaScript(`window.epubBase64 += "${escaped}"; true;`);
    });

    // Trigger initialization
    webViewRef.current.injectJavaScript(`initReaderWithData(); true;`);
  };

  const handleThemeChange = (t: ReaderTheme) => {
    setTheme(t);
    setReaderSettings({ theme: t });
    setShowSettings(false);
    const colors = THEMES[t];
    webViewRef.current?.injectJavaScript(`setReaderTheme("${colors.bg}", "${colors.text}"); true;`);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    setReaderSettings({ fontSize: newSize });
    webViewRef.current?.injectJavaScript(`setFontSize(${newSize}); true;`);
  };

  const handleTocSelect = (href: string) => {
    webViewRef.current?.injectJavaScript(`goToHref("${href}"); true;`);
    setShowToc(false);
    setShowControls(false);
  };

  const handleAddBookmark = useCallback(() => {
    if (!currentCfi || !itemId) return;
    const progressPercent = Math.round(progress * 100);
    addEbookBookmark({
      itemId,
      bookTitle: item?.Name ?? 'Unknown Book',
      cfi: currentCfi,
      name: `Page ${progressPercent}%`,
      progress: progressPercent,
    });
  }, [currentCfi, itemId, progress, addEbookBookmark, item?.Name]);

  const handleBookmarkPress = useCallback((cfi: string) => {
    webViewRef.current?.injectJavaScript(`goToCfi("${cfi}"); true;`);
    setShowBookmarks(false);
  }, []);

  const handleRemoveBookmark = useCallback((id: string) => {
    removeEbookBookmark(id);
  }, [removeEbookBookmark]);

  const themeColors = THEMES[theme];
  const progressPercent = Math.round(progress * 100);


  // The HTML for the EPUB reader (data injected separately)
  const getReaderHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden;background:${themeColors.bg}}
    #reader{width:100%;height:100%}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${themeColors.text};font-family:system-ui;text-align:center}
  </style>
</head>
<body>
  <div id="reader"></div>
  <div id="loading">Loading libraries...</div>
  <script>
    var librariesLoaded = 0;
    window.epubBase64 = "";
    function msg(type, data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type, ...data})); } catch(e) {}
    }
    function log(m) { msg('log', {message: m}); }
    window.onerror = function(m,s,l,c,e) { msg('error',{message:'JS Error: '+m}); return true; };

    function libLoaded() {
      librariesLoaded++;
      if (librariesLoaded >= 2) {
        log('Libraries loaded, waiting for data...');
        document.getElementById('loading').textContent = 'Loading book data...';
        msg('webviewReady', {});
      }
    }
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" onload="libLoaded()" onerror="msg('error',{message:'Failed to load jszip'})"></script>
  <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js" onload="libLoaded()" onerror="msg('error',{message:'Failed to load epubjs'})"></script>
  <script>
    var book, rendition, currentFontSize = ${fontSize}, lastKnownCfi = null, lastKnownPercent = 0, locationsGenerated = false;

    function base64ToArrayBuffer(base64) {
      try {
        var binaryString = atob(base64);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      } catch(e) {
        throw new Error('Base64 decode failed: ' + e.message);
      }
    }

    async function initReaderWithData() {
      log('initReaderWithData called, data length: ' + window.epubBase64.length);
      document.getElementById('loading').textContent = 'Opening book...';

      try {
        if (!window.epubBase64 || window.epubBase64.length === 0) {
          throw new Error('No book data received');
        }

        log('Decoding base64...');
        var arrayBuffer = base64ToArrayBuffer(window.epubBase64);
        log('Decoded ' + arrayBuffer.byteLength + ' bytes');

        // Check if this is actually a PDF
        var firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
        var header = String.fromCharCode.apply(null, firstBytes);
        if (header.indexOf('%PDF') === 0) {
          msg("wrongFormat", {format: "pdf"});
          throw new Error('This is a PDF file. Redirecting...');
        }

        // Free memory
        window.epubBase64 = "";

        book = ePub(arrayBuffer);
        log('Book created');

        rendition = book.renderTo("reader", {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated"
        });
        log('Rendition created');

        rendition.themes.default({
          "body": {
            "background": "${themeColors.bg} !important",
            "color": "${themeColors.text} !important",
            "font-size": currentFontSize + "% !important",
            "line-height": "1.7 !important",
            "padding": "16px !important"
          },
          "p,div,span,h1,h2,h3,h4,h5,h6,li": {"color": "${themeColors.text} !important"},
          "a": {"color": "${accentColor} !important"},
          "img,svg,image,figure": {"display": "none !important"},
          "picture": {"display": "none !important"}
        });

        document.getElementById('loading').style.display = 'none';
        log('Calling display...');

        var displayTimeout = setTimeout(function() {
          log('Display timeout - trying fallback');
          msg("error", {message: "Timeout loading book content. The file may be corrupted."});
        }, 20000);

        await rendition.display();
        clearTimeout(displayTimeout);
        log('Displayed');

        book.loaded.navigation.then(function(nav) {
          log('Navigation loaded: ' + JSON.stringify(Object.keys(nav || {})));
          if(nav) {
            log('nav.toc exists: ' + !!nav.toc + ', length: ' + (nav.toc ? nav.toc.length : 0));
          }
          if(nav && nav.toc && nav.toc.length > 0) {
            var flattenToc = function(items, depth) {
              depth = depth || 0;
              var result = [];
              items.forEach(function(t) {
                result.push({href: t.href, label: (depth > 0 ? '  '.repeat(depth) : '') + t.label});
                if(t.subitems && t.subitems.length > 0) {
                  result = result.concat(flattenToc(t.subitems, depth + 1));
                }
              });
              return result;
            };
            var items = flattenToc(nav.toc, 0);
            log('TOC items: ' + items.length);
            msg("toc", {items: items});
          } else {
            log('No TOC found in navigation');
          }
        }).catch(function(e) { log('Nav error: ' + e.message); });

        rendition.on("relocated", function(loc) {
          try {
            lastKnownCfi = loc.start.cfi;
            if (locationsGenerated && book.locations && book.locations.length()) {
              var pct = book.locations.percentageFromCfi(loc.start.cfi);
              lastKnownPercent = pct || 0;
              msg("relocated", {cfi: loc.start.cfi, progress: pct || 0});
            } else {
              msg("relocated", {cfi: loc.start.cfi});
            }
          } catch(e) { log('Relocated error: ' + e.message); }
        });

        book.locations.generate(1500).then(function() {
          log('Locations generated: ' + book.locations.length());
          locationsGenerated = true;
          msg('locationsReady', {});
          if (rendition.location && rendition.location.start) {
            var pct = book.locations.percentageFromCfi(rendition.location.start.cfi);
            msg("relocated", {cfi: rendition.location.start.cfi, progress: pct || 0});
          }
        }).catch(function(e) { log('Locations error: ' + e.message); });

        msg("ready", {});
      } catch(e) {
        log('Error: ' + e.message);
        msg("error", {message: e.message});
        document.getElementById('loading').innerHTML = 'Error loading book<br><small style="opacity:0.7">' + e.message + '</small>';
      }
    }

    function goToCfi(cfi) {
      try {
        if(rendition && cfi) {
          log('goToCfi called with: ' + cfi);
          rendition.display(cfi).then(function() {
            log('goToCfi display complete');
            lastKnownCfi = cfi;
            if (locationsGenerated && book.locations) {
              var pct = book.locations.percentageFromCfi(cfi);
              if (pct !== undefined) {
                lastKnownPercent = pct;
                msg("relocated", {cfi: cfi, progress: pct});
              }
            }
            msg("navigationComplete", {});
          }).catch(function(e) {
            log('goToCfi display error: ' + e.message);
            msg("navigationComplete", {});
          });
        }
      } catch(e) { log('goToCfi error: ' + e.message); }
    }
    function goToHref(href) {
      try {
        if(rendition && href) {
          log('goToHref called with: ' + href);
          rendition.display(href).then(function() {
            log('goToHref display complete');
          }).catch(function(e) {
            log('goToHref display error: ' + e.message);
          });
        }
      } catch(e) { log('goToHref error: ' + e.message); }
    }
    function nextPage() { try { if(rendition) rendition.next(); } catch(e) { log('nextPage error: ' + e.message); } }
    function prevPage() { try { if(rendition) rendition.prev(); } catch(e) { log('prevPage error: ' + e.message); } }
    function goToPercent(percent) {
      try {
        log('goToPercent called: ' + (percent * 100) + '%');
        if(rendition && book && book.locations && locationsGenerated) {
          var cfi = book.locations.cfiFromPercentage(percent);
          if (cfi) {
            lastKnownPercent = percent;
            rendition.display(cfi).then(function() {
              log('goToPercent display complete at ' + (percent * 100) + '%');
              lastKnownCfi = cfi;
              msg("relocated", {cfi: cfi, progress: percent});
              msg("navigationComplete", {});
            }).catch(function(e) {
              log('goToPercent display error: ' + e.message);
              msg("navigationComplete", {});
            });
          } else {
            log('goToPercent - no CFI returned');
            msg("navigationComplete", {});
          }
        } else {
          log('goToPercent failed - locations not ready');
          msg("navigationComplete", {});
        }
      } catch(e) {
        log('goToPercent error: ' + e.message);
        msg("navigationComplete", {});
      }
    }

    function setReaderTheme(bg, text) {
      try {
        if(!book) { msg("navigationComplete", {}); return; }

        // Save current position
        var cfiToRestore = lastKnownCfi;
        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            cfiToRestore = currentLoc.start.cfi;
          }
          // Destroy old rendition
          rendition.destroy();
        }

        // Update body background
        document.body.style.background = bg;

        // Create new rendition with new theme
        rendition = book.renderTo("reader", {
          width: "100%",
          height: "100%",
          flow: "paginated"
        });

        rendition.themes.default({
          "body": {
            "background": bg + " !important",
            "color": text + " !important",
            "font-size": currentFontSize + "% !important",
            "line-height": "1.7 !important",
            "padding": "16px !important"
          },
          "p,div,span,h1,h2,h3,h4,h5,h6,li": {"color": text + " !important"},
          "a": {"color": "${accentColor} !important"},
          "img,svg,image,figure,picture": {"display": "none !important"}
        });

        // Re-attach navigation handlers
        rendition.on("keydown", function(e) {
          if (e.key === "ArrowLeft") prevPage();
          if (e.key === "ArrowRight") nextPage();
        });

        rendition.on("relocated", function(loc) {
          try {
            lastKnownCfi = loc.start.cfi;
            if (locationsGenerated && book.locations && book.locations.length()) {
              var pct = book.locations.percentageFromCfi(loc.start.cfi);
              lastKnownPercent = pct || 0;
              msg("relocated", {cfi: loc.start.cfi, progress: pct || 0});
            } else {
              msg("relocated", {cfi: loc.start.cfi});
            }
          } catch(e) {}
        });

        // Display at saved position
        rendition.display(cfiToRestore || undefined).then(function() {
          msg("navigationComplete", {});
        }).catch(function(e) {
          msg("navigationComplete", {});
        });

      } catch(e) {
        log('setTheme error: ' + e.message);
        msg("navigationComplete", {});
      }
    }

    function setFontSize(size) {
      try {
        currentFontSize = size;
        if(!book) { msg("navigationComplete", {}); return; }

        // Save current position
        var cfiToRestore = lastKnownCfi;
        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            cfiToRestore = currentLoc.start.cfi;
          }
          // Destroy old rendition
          rendition.destroy();
        }

        // Create new rendition with new font size
        var bg = document.body.style.background || '#0a0a0a';
        var text = getComputedStyle(document.body).color || '#e5e5e5';

        rendition = book.renderTo("reader", {
          width: "100%",
          height: "100%",
          flow: "paginated"
        });

        rendition.themes.default({
          "body": {
            "background": bg + " !important",
            "color": text + " !important",
            "font-size": size + "% !important",
            "line-height": "1.7 !important",
            "padding": "16px !important"
          },
          "p,div,span,h1,h2,h3,h4,h5,h6,li": {"color": text + " !important"},
          "a": {"color": "${accentColor} !important"},
          "img,svg,image,figure,picture": {"display": "none !important"}
        });

        // Re-attach navigation handlers
        rendition.on("keydown", function(e) {
          if (e.key === "ArrowLeft") prevPage();
          if (e.key === "ArrowRight") nextPage();
        });

        rendition.on("relocated", function(loc) {
          try {
            lastKnownCfi = loc.start.cfi;
            if (locationsGenerated && book.locations && book.locations.length()) {
              var pct = book.locations.percentageFromCfi(loc.start.cfi);
              lastKnownPercent = pct || 0;
              msg("relocated", {cfi: loc.start.cfi, progress: pct || 0});
            } else {
              msg("relocated", {cfi: loc.start.cfi});
            }
          } catch(e) {}
        });

        // Display at saved position
        rendition.display(cfiToRestore || undefined).then(function() {
          msg("navigationComplete", {});
        }).catch(function(e) {
          msg("navigationComplete", {});
        });

      } catch(e) {
        log('setFontSize error: ' + e.message);
        msg("navigationComplete", {});
      }
    }

    function setFontSizeAndMaintainPosition(size, cfi) {
      try {
        currentFontSize = size;
        if(rendition) {
          rendition.themes.fontSize(size + "%");
          // Wait for reflow then navigate back and regenerate locations
          setTimeout(function() {
            if (cfi) {
              rendition.display(cfi);
            }
            // Regenerate locations for accurate progress after font change
            locationsGenerated = false;
            book.locations.generate(1500).then(function() {
              log('Locations regenerated after font change: ' + book.locations.length());
              locationsGenerated = true;
              if (rendition.location && rendition.location.start) {
                var pct = book.locations.percentageFromCfi(rendition.location.start.cfi);
                msg("relocated", {cfi: rendition.location.start.cfi, progress: pct || 0});
              }
            }).catch(function(e) { log('Locations regen error: ' + e.message); });
          }, 150);
        }
      } catch(e) { log('setFontSize error: ' + e.message); }
    }

    var touchStartX=0, touchStartY=0, touchStartTime=0;
    document.addEventListener("touchstart", function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, {passive:true});

    document.addEventListener("touchend", function(e) {
      try {
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        var dt = Date.now() - touchStartTime;

        // Swipe detection - lowered threshold to 40px
        if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 500) {
          log('Swipe detected: ' + (dx > 0 ? 'right (prev)' : 'left (next)'));
          dx > 0 ? prevPage() : nextPage();
        } else if(Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 300) {
          msg("tap", {});
        }
      } catch(e) { log('Touch error: ' + e.message); }
    }, {passive:true});
  </script>
</body>
</html>
  `;

  if (status === 'downloading') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingStageText, { color: themeColors.text, marginTop: 16 }]}>{loadingStage}</Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <View style={styles.downloadProgressContainer}>
              <View style={styles.downloadProgressTrack}>
                <View style={[styles.downloadProgressFill, { width: `${downloadProgress * 100}%`, backgroundColor: accentColor }]} />
              </View>
              <Text style={[styles.downloadProgressText, { color: themeColors.text }]}>{Math.round(downloadProgress * 100)}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={[styles.errorText, { color: themeColors.text }]}>Failed to load book</Text>
          <Text style={[styles.errorSubtext, { color: themeColors.text }]}>{errorMsg}</Text>
          <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      {/* Header - always visible */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.bg }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item?.Name ?? 'Loading...'}
          </Text>
          {isConfirmedEpub && (
            <>
              <Pressable onPress={() => setShowToc(true)} style={styles.headerBtn}>
                <Ionicons name="list" size={24} color={themeColors.text} />
              </Pressable>
              <Pressable onPress={() => setShowBookmarks(true)} style={styles.headerBtn}>
                <Ionicons name="bookmark-outline" size={22} color={themeColors.text} />
              </Pressable>
              <Pressable onPress={() => setShowSettings(true)} style={styles.headerBtn}>
                <Ionicons name="settings-outline" size={22} color={themeColors.text} />
              </Pressable>
            </>
          )}
      </View>

      {/* WebView content area */}
      <View style={styles.readerContainer}>
        {fileUri && (
          <WebView
            ref={webViewRef}
            source={{ html: getReaderHtml() }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={handleMessage}
            onError={(e) => console.log('WebView error:', e.nativeEvent)}
            scrollEnabled={false}
          />
        )}

        {!locationsReady && fileUri && (
          <View style={[styles.overlay, { backgroundColor: themeColors.bg }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingStageText, { color: themeColors.text }]}>{loadingStage}</Text>
          </View>
        )}
      </View>

      {/* Footer with navigation - always visible */}
      {isConfirmedEpub && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.bg }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: themeColors.text }]}>{progressPercent}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
            </View>
          </View>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => webViewRef.current?.injectJavaScript('prevPage(); true;')}
              style={[styles.navButton, { backgroundColor: themeColors.text + '15' }]}
            >
              <Ionicons name="chevron-back" size={28} color={themeColors.text} />
              <Text style={[styles.navButtonText, { color: themeColors.text }]}>Previous</Text>
            </Pressable>
            <Pressable
              onPress={() => webViewRef.current?.injectJavaScript('nextPage(); true;')}
              style={[styles.navButton, { backgroundColor: themeColors.text + '15' }]}
            >
              <Text style={[styles.navButtonText, { color: themeColors.text }]}>Next</Text>
              <Ionicons name="chevron-forward" size={28} color={themeColors.text} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Settings */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}>
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Settings</Text>

            <Text style={[styles.label, { color: themeColors.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
                <Pressable key={t} onPress={() => handleThemeChange(t)}
                  style={[styles.themeBtn, { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' }]}>
                  <Text style={{ color: THEMES[t].text }}>{THEMES[t].name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: themeColors.text }]}>Font Size</Text>
            <View style={styles.fontRow}>
              <Pressable onPress={() => handleFontSizeChange(-10)} style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}>
                <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A−</Text>
              </Pressable>
              <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
              <Pressable onPress={() => handleFontSizeChange(10)} style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}>
                <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOC Modal */}
      <Modal visible={showToc} transparent animationType="slide" onRequestClose={() => setShowToc(false)}>
        <Pressable style={[styles.modalBg, { justifyContent: 'flex-end', alignItems: 'stretch' }]} onPress={() => setShowToc(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.tocModalPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a', paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.tocHeader}>
              <Text style={[styles.tocTitle, { color: themeColors.text }]}>Contents</Text>
              <Pressable onPress={() => setShowToc(false)} style={styles.tocCloseBtn}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }} showsVerticalScrollIndicator>
              {toc.length === 0 ? (
                <Text style={[styles.tocEmpty, { color: themeColors.text + '80' }]}>No table of contents</Text>
              ) : (
                toc.map((t, i) => (
                  <Pressable
                    key={`toc-${i}-${t.href}`}
                    onPress={() => handleTocSelect(t.href)}
                    style={({ pressed }) => [styles.tocItem, pressed && { backgroundColor: accentColor + '15' }]}
                  >
                    <Text style={[styles.tocItemText, { color: accentColor }]} numberOfLines={2}>
                      {t.label?.trim()}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal visible={showBookmarks} transparent animationType="fade" onRequestClose={() => setShowBookmarks(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowBookmarks(false)}>
          <Pressable
            style={[styles.bookmarksPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Bookmarks</Text>

            <Pressable
              onPress={handleAddBookmark}
              style={[styles.addBookmarkBtn, { backgroundColor: accentColor }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBookmarkText}>Add Bookmark</Text>
            </Pressable>

            <ScrollView style={styles.bookmarksList} showsVerticalScrollIndicator={false}>
              {itemBookmarks.length === 0 ? (
                <View style={styles.bookmarksEmpty}>
                  <Ionicons name="bookmark-outline" size={40} color={themeColors.text + '40'} />
                  <Text style={[styles.bookmarksEmptyText, { color: themeColors.text + '60' }]}>
                    No bookmarks yet
                  </Text>
                </View>
              ) : (
                itemBookmarks.map((bookmark) => (
                  <View key={bookmark.id} style={styles.bookmarkItem}>
                    <Pressable
                      style={styles.bookmarkItemContent}
                      onPress={() => handleBookmarkPress(bookmark.cfi)}
                    >
                      <Ionicons name="bookmark" size={18} color={accentColor} />
                      <View style={styles.bookmarkItemInfo}>
                        <Text style={[styles.bookmarkItemName, { color: themeColors.text }]} numberOfLines={1}>
                          {bookmark.name}
                        </Text>
                        <Text style={[styles.bookmarkItemProgress, { color: themeColors.text + '60' }]}>
                          {bookmark.progress}% through book
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveBookmark(bookmark.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.bookmarkDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={themeColors.text + '60'} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600' },
  errorSubtext: { marginTop: 8, fontSize: 14, opacity: 0.7, textAlign: 'center' },
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginHorizontal: 4 },

  // Reader content
  readerContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressText: { fontSize: 13, fontWeight: '500', width: 40 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, marginLeft: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  navRow: { flexDirection: 'row', gap: 12 },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  navButtonText: { fontSize: 15, fontWeight: '500' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24 },
  panelTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 12, opacity: 0.7 },
  themeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  themeBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  fontBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fontBtnText: { fontSize: 18, fontWeight: '600' },
  fontBtnTextLg: { fontSize: 22, fontWeight: '600' },
  fontValue: { fontSize: 20, fontWeight: '600', width: 70, textAlign: 'center' },
  tocModalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 8, maxHeight: '80%' },
  tocHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  tocTitle: { fontSize: 20, fontWeight: 'bold' },
  tocCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.15)' },
  tocItem: { paddingVertical: 18, paddingHorizontal: 24, marginHorizontal: 8, marginBottom: 4 },
  tocItemText: { fontSize: 16 },
  tocEmpty: { textAlign: 'center', paddingVertical: 48, fontSize: 15 },
  // Bookmarks
  bookmarksPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24, maxHeight: SCREEN_HEIGHT * 0.7 },
  addBookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  addBookmarkText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bookmarksList: { maxHeight: SCREEN_HEIGHT * 0.4 },
  bookmarksEmpty: { alignItems: 'center', paddingVertical: 32 },
  bookmarksEmptyText: { marginTop: 12, fontSize: 15 },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  bookmarkItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookmarkItemInfo: { flex: 1 },
  bookmarkItemName: { fontSize: 15, fontWeight: '500' },
  bookmarkItemProgress: { fontSize: 13, marginTop: 2 },
  bookmarkDeleteBtn: { padding: 8 },

  // Loading progress
  loadingStageText: { fontSize: 15, marginTop: 12, opacity: 0.8 },
  downloadProgressContainer: { marginTop: 20, width: 200, alignItems: 'center' },
  downloadProgressTrack: { width: '100%', height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, overflow: 'hidden' },
  downloadProgressFill: { height: '100%', borderRadius: 2 },
  downloadProgressText: { marginTop: 8, fontSize: 13, opacity: 0.7 },
});
