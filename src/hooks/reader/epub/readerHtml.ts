export interface ReaderHtmlOptions {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  accentColor: string;
}

export function getEpubReaderHtml({
  backgroundColor,
  textColor,
  fontSize,
  accentColor,
}: ReaderHtmlOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="preconnect" href="https://unpkg.com">
  <link rel="preconnect" href="https://cdnjs.cloudflare.com">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{height:100%;overflow:hidden;background:${backgroundColor}}
    #reader{width:100%;height:100%;position:relative}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${textColor};font-family:system-ui;text-align:center;z-index:1000}
    .spinner{width:32px;height:32px;border:3px solid ${textColor}33;border-top-color:${accentColor};border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div id="reader"></div>
  <div id="loading"><div class="spinner"></div><div id="loadingText">Loading...</div></div>
  <script>
    var INIT_BG = "${backgroundColor}";
    var INIT_TEXT = "${textColor}";
    var INIT_FONTSIZE = ${fontSize};
    var INIT_ACCENT = "${accentColor}";

    var book = null;
    var rendition = null;
    var currentFontSize = INIT_FONTSIZE;
    var currentBg = INIT_BG;
    var currentText = INIT_TEXT;
    var lastKnownCfi = null;
    var lastKnownPercent = 0;
    var locationsGenerated = false;
    var highlightAnnotations = {};
    var isInitializing = false;
    var totalSpineItems = 0;
    var currentSpineIndex = 0;

    function msg(type, data) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type: type}, data || {})));
      } catch(e) {}
    }

    function log(m) {
      msg('log', {message: String(m)});
    }

    window.onerror = function(m, s, l, c, e) {
      msg('error', {message: 'JS: ' + m});
      return true;
    };

    function setLoadingText(t) {
      var el = document.getElementById('loadingText');
      if (el) el.textContent = t;
    }

    function hideLoading() {
      var el = document.getElementById('loading');
      if (el) el.style.display = 'none';
    }

    function showLoading() {
      var el = document.getElementById('loading');
      if (el) el.style.display = 'block';
    }

    var scriptsToLoad = [
      {url: 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js', backup: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', name: 'jszip'},
      {url: 'https://unpkg.com/epubjs@0.3.93/dist/epub.min.js', backup: 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js', name: 'epubjs'}
    ];
    var scriptsLoaded = 0;
    var scriptsFailed = 0;

    function loadScript(config, useBackup) {
      var s = document.createElement('script');
      s.src = useBackup ? config.backup : config.url;
      s.onload = function() {
        scriptsLoaded++;
        if (scriptsLoaded === scriptsToLoad.length) {
          setLoadingText('Ready');
          msg('webviewReady', {});
        }
      };
      s.onerror = function() {
        if (!useBackup && config.backup) {
          loadScript(config, true);
        } else {
          scriptsFailed++;
          msg('error', {message: 'Failed to load ' + config.name + '. Check internet connection.'});
        }
      };
      document.head.appendChild(s);
    }

    scriptsToLoad.forEach(function(c) { loadScript(c, false); });

    window.epubBase64 = "";

    function base64ToArrayBuffer(b64) {
      var binary = atob(b64);
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function getThemeStyles(bg, text, fontPct, accent) {
      return {
        "body": {
          "background": bg + " !important",
          "color": text + " !important",
          "font-size": fontPct + "% !important",
          "line-height": "1.6 !important",
          "padding": "12px !important"
        },
        "p,div,span,h1,h2,h3,h4,h5,h6,li,td,th": {
          "color": text + " !important"
        },
        "a": {
          "color": accent + " !important"
        }
      };
    }

    function getSpineProgress(href) {
      if (!book || !book.spine || !totalSpineItems) return 0;
      var idx = 0;
      for (var i = 0; i < book.spine.items.length; i++) {
        if (book.spine.items[i].href === href || book.spine.items[i].url === href) {
          idx = i;
          break;
        }
      }
      return totalSpineItems > 1 ? (idx / (totalSpineItems - 1)) : 0;
    }

    function setupRenditionEvents(rend) {
      rend.on("relocated", function(location) {
        if (!location || !location.start) return;
        lastKnownCfi = location.start.cfi;
        var href = location.start.href || '';
        var pct = 0;

        if (locationsGenerated && book && book.locations && book.locations.length()) {
          pct = book.locations.percentageFromCfi(location.start.cfi) || 0;
        } else {
          pct = getSpineProgress(href);
        }
        lastKnownPercent = pct;
        msg("relocated", {cfi: location.start.cfi, progress: pct, href: href});
      });

      rend.on("keydown", function(e) {
        if (e.key === "ArrowLeft") prevPage();
        else if (e.key === "ArrowRight") nextPage();
      });
    }

    function createRendition(targetCfi) {
      if (rendition) {
        try { rendition.destroy(); } catch(e) {}
      }

      document.body.style.background = currentBg;
      document.getElementById('reader').innerHTML = '';

      rendition = book.renderTo("reader", {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "paginated"
      });

      rendition.themes.default(getThemeStyles(currentBg, currentText, currentFontSize, INIT_ACCENT));
      setupRenditionEvents(rendition);

      return rendition.display(targetCfi || undefined);
    }

    async function initReaderWithData() {
      if (isInitializing) return;
      isInitializing = true;

      setLoadingText('Opening book...');

      try {
        if (!window.JSZip) {
          throw new Error('JSZip not loaded. Check internet connection.');
        }
        if (!window.ePub) {
          throw new Error('epub.js not loaded. Check internet connection.');
        }

        if (!window.epubBase64 || window.epubBase64.length === 0) {
          throw new Error('No book data received');
        }

        setLoadingText('Decoding...');
        var arrayBuffer = base64ToArrayBuffer(window.epubBase64);

        var header = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer.slice(0, 5)));
        if (header.indexOf('%PDF') === 0) {
          msg("wrongFormat", {format: "pdf"});
          return;
        }

        window.epubBase64 = "";

        setLoadingText('Parsing...');
        book = ePub(arrayBuffer);

        await book.ready;
        if (book.spine) {
          totalSpineItems = book.spine.items.length;
        }

        setLoadingText('Rendering...');
        await createRendition();
        hideLoading();

        book.loaded.navigation.then(function(nav) {
          if (nav && nav.toc && nav.toc.length > 0) {
            var flattenToc = function(items, depth) {
              var result = [];
              (items || []).forEach(function(t) {
                result.push({href: t.href, label: t.label, depth: depth || 0});
                if (t.subitems && t.subitems.length > 0) {
                  result = result.concat(flattenToc(t.subitems, (depth || 0) + 1));
                }
              });
              return result;
            };
            msg("toc", {items: flattenToc(nav.toc, 0)});
          }
        }).catch(function(e) {});

        msg("ready", {});
        msg('locationsReady', {});

        setTimeout(function() {
          book.locations.generate(1500).then(function() {
            locationsGenerated = true;
            if (rendition && rendition.location && rendition.location.start) {
              var pct = book.locations.percentageFromCfi(rendition.location.start.cfi) || 0;
              lastKnownPercent = pct;
              msg("relocated", {cfi: rendition.location.start.cfi, progress: pct, href: rendition.location.start.href || ''});
            }
          }).catch(function(e) {});
        }, 100);

      } catch(e) {
        msg("error", {message: e.message});
        setLoadingText('Error: ' + e.message);
      } finally {
        isInitializing = false;
      }
    }

    function nextPage() {
      if (!rendition) return;
      rendition.next().catch(function(e) { log('next error: ' + e.message); });
    }

    function prevPage() {
      if (!rendition) return;
      rendition.prev().catch(function(e) { log('prev error: ' + e.message); });
    }

    function goToCfi(cfi) {
      if (!rendition || !cfi) return;
      rendition.display(cfi).then(function() {
        lastKnownCfi = cfi;
        msg("navigationComplete", {});
      }).catch(function(e) {
        log('goToCfi error: ' + e.message);
        msg("navigationComplete", {});
      });
    }

    function goToHref(href) {
      if (!rendition || !href) return;
      rendition.display(href).then(function() {
        msg("navigationComplete", {});
      }).catch(function(e) {
        log('goToHref error: ' + e.message);
        msg("navigationComplete", {});
      });
    }

    function goToPercent(percent) {
      if (!rendition || !book || !locationsGenerated) {
        msg("navigationComplete", {});
        return;
      }
      var cfi = book.locations.cfiFromPercentage(percent);
      if (cfi) {
        lastKnownPercent = percent;
        goToCfi(cfi);
      } else {
        msg("navigationComplete", {});
      }
    }

    function setReaderThemeWithProgress(bg, text, progressHint) {
      if (!rendition) {
        msg("styleChangeComplete", {});
        return;
      }

      currentBg = bg;
      currentText = text;
      document.body.style.background = bg;

      try {
        rendition.themes.override('background', bg + ' !important');
        rendition.themes.override('color', text + ' !important');
        rendition.getContents().forEach(function(c) {
          if (c && c.document) {
            c.document.body.style.background = bg;
            c.document.body.style.color = text;
            var els = c.document.querySelectorAll('p,div,span,h1,h2,h3,h4,h5,h6,li,td,th');
            els.forEach(function(el) { el.style.color = text; });
          }
        });
      } catch(e) {
        log('Theme override error: ' + e.message);
      }

      msg("styleChangeComplete", {cfi: lastKnownCfi, progress: lastKnownPercent});
    }

    function setFontSizeWithProgress(size, progressHint, bg, text) {
      if (!rendition) {
        msg("styleChangeComplete", {});
        return;
      }

      currentFontSize = size;
      currentBg = bg;
      currentText = text;
      document.body.style.background = bg;

      try {
        rendition.themes.override('font-size', size + '% !important');
        rendition.themes.override('background', bg + ' !important');
        rendition.themes.override('color', text + ' !important');
        rendition.getContents().forEach(function(c) {
          if (c && c.document) {
            c.document.body.style.fontSize = size + '%';
            c.document.body.style.background = bg;
            c.document.body.style.color = text;
          }
        });
      } catch(e) {
        log('Font size override error: ' + e.message);
      }

      msg("styleChangeComplete", {cfi: lastKnownCfi, progress: lastKnownPercent});
    }

    function addHighlightAnnotation(cfiRange, color, id) {
      if (!rendition) return;
      try {
        rendition.annotations.add('highlight', cfiRange, {}, function() {
          msg('highlightClicked', {cfiRange: cfiRange});
        }, 'hl', {
          'fill': color,
          'fill-opacity': '0.4',
          'mix-blend-mode': 'multiply'
        });
        highlightAnnotations[cfiRange] = id;
      } catch(e) {
        log('addHighlight error: ' + e.message);
      }
    }

    function addHighlightsBatch(highlights) {
      if (!rendition || !highlights || !highlights.length) return;
      highlights.forEach(function(h) {
        try {
          rendition.annotations.add('highlight', h.cfi, {}, function() {
            msg('highlightClicked', {cfiRange: h.cfi});
          }, 'hl', {
            'fill': h.color,
            'fill-opacity': '0.4',
            'mix-blend-mode': 'multiply'
          });
          highlightAnnotations[h.cfi] = h.id;
        } catch(e) {}
      });
    }

    function removeHighlightAnnotation(cfiRange) {
      if (!rendition) return;
      try {
        rendition.annotations.remove(cfiRange, 'highlight');
        delete highlightAnnotations[cfiRange];
      } catch(e) {
        log('removeHighlight error: ' + e.message);
      }
    }

    var touchStartX = 0;
    var touchStartY = 0;
    var touchStartTime = 0;
    var longPressTimer = null;

    document.addEventListener("touchstart", function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(checkTextSelection, 500);
    }, {passive: true});

    document.addEventListener("touchmove", function(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, {passive: true});

    document.addEventListener("touchend", function(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      var dt = Date.now() - touchStartTime;

      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2 && dt < 400) {
        if (dx > 0) prevPage();
        else nextPage();
      } else if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 250) {
        msg("tap", {});
      }
    }, {passive: true});

    function checkTextSelection() {
      if (!rendition) return;
      try {
        var contents = rendition.getContents();
        if (!contents || !contents.length) return;
        var doc = contents[0].document;
        var selection = doc.getSelection();
        if (!selection || selection.isCollapsed) return;
        var text = selection.toString().trim();
        if (text.length < 2) return;
        var range = selection.getRangeAt(0);
        var cfiRange = contents[0].cfiFromRange(range);
        if (cfiRange) {
          msg('textSelected', {cfiRange: cfiRange, text: text});
          selection.removeAllRanges();
        }
      } catch(e) {}
    }

    document.addEventListener('selectionchange', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(checkTextSelection, 300);
      }
    });
  </script>
</body>
</html>
  `;
}
