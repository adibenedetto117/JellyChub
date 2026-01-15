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
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden;background:${backgroundColor}}
    #reader{width:100%;height:100%}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:${textColor};font-family:system-ui;text-align:center}
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

        var firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
        var header = String.fromCharCode.apply(null, firstBytes);
        if (header.indexOf('%PDF') === 0) {
          msg("wrongFormat", {format: "pdf"});
          throw new Error('This is a PDF file. Redirecting...');
        }

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
            "background": "${backgroundColor} !important",
            "color": "${textColor} !important",
            "font-size": currentFontSize + "% !important",
            "line-height": "1.7 !important",
            "padding": "16px !important"
          },
          "p,div,span,h1,h2,h3,h4,h5,h6,li": {"color": "${textColor} !important"},
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
    function nextPage() {
      try {
        if (!rendition || !book) return;
        var currentLocation = rendition.currentLocation();
        var currentCfi = currentLocation && currentLocation.start ? currentLocation.start.cfi : null;
        rendition.next().then(function() {
          var newLocation = rendition.currentLocation();
          var newCfi = newLocation && newLocation.start ? newLocation.start.cfi : null;
          if (currentCfi && newCfi && currentCfi === newCfi) {
            var currentSection = book.spine.get(currentLocation.start.href);
            if (currentSection && currentSection.next()) {
              var nextSection = currentSection.next();
              log('Advancing to next chapter: ' + nextSection.href);
              rendition.display(nextSection.href);
            }
          }
        });
      } catch(e) { log('nextPage error: ' + e.message); }
    }
    function prevPage() {
      try {
        if (!rendition || !book) return;
        var currentLocation = rendition.currentLocation();
        var currentCfi = currentLocation && currentLocation.start ? currentLocation.start.cfi : null;
        rendition.prev().then(function() {
          var newLocation = rendition.currentLocation();
          var newCfi = newLocation && newLocation.start ? newLocation.start.cfi : null;
          if (currentCfi && newCfi && currentCfi === newCfi) {
            var currentSection = book.spine.get(currentLocation.start.href);
            if (currentSection && currentSection.prev()) {
              var prevSection = currentSection.prev();
              log('Going to previous chapter: ' + prevSection.href);
              rendition.display(prevSection.href);
            }
          }
        });
      } catch(e) { log('prevPage error: ' + e.message); }
    }
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

    var highlightAnnotations = {};

    function addHighlightAnnotation(cfiRange, color, id) {
      try {
        if (!rendition) return;
        log('Adding highlight: ' + cfiRange);
        rendition.annotations.add('highlight', cfiRange, {}, function(e) {
          msg('highlightClicked', { cfiRange: cfiRange });
        }, 'hl', {
          'fill': color,
          'fill-opacity': '0.4',
          'mix-blend-mode': 'multiply'
        });
        highlightAnnotations[cfiRange] = id;
      } catch(e) {
        log('addHighlightAnnotation error: ' + e.message);
      }
    }

    function removeHighlightAnnotation(cfiRange) {
      try {
        if (!rendition) return;
        log('Removing highlight: ' + cfiRange);
        rendition.annotations.remove(cfiRange, 'highlight');
        delete highlightAnnotations[cfiRange];
      } catch(e) {
        log('removeHighlightAnnotation error: ' + e.message);
      }
    }

    function setReaderTheme(bg, text, preservedCfi) {
      try {
        if(!book) { msg("styleChangeComplete", {}); return; }

        var cfiToRestore = null;
        var percentToRestore = lastKnownPercent;

        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            cfiToRestore = currentLoc.start.cfi;
            if (locationsGenerated && book.locations) {
              percentToRestore = book.locations.percentageFromCfi(cfiToRestore) || lastKnownPercent;
            }
          }
        }

        if (!cfiToRestore && preservedCfi && preservedCfi.length > 0) {
          cfiToRestore = preservedCfi;
        }
        if (!cfiToRestore && lastKnownCfi) {
          cfiToRestore = lastKnownCfi;
        }

        log('setReaderTheme: preserving CFI=' + cfiToRestore + ' percent=' + percentToRestore);

        if (rendition) {
          rendition.destroy();
        }

        document.body.style.background = bg;

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

        rendition.on("keydown", function(e) {
          if (e.key === "ArrowLeft") prevPage();
          if (e.key === "ArrowRight") nextPage();
        });

        var isStyleChangeNavigation = true;
        rendition.on("relocated", function(loc) {
          try {
            lastKnownCfi = loc.start.cfi;
            if (locationsGenerated && book.locations && book.locations.length()) {
              var pct = book.locations.percentageFromCfi(loc.start.cfi);
              lastKnownPercent = pct || 0;
              if (!isStyleChangeNavigation) {
                msg("relocated", {cfi: loc.start.cfi, progress: pct || 0});
              }
            } else if (!isStyleChangeNavigation) {
              msg("relocated", {cfi: loc.start.cfi});
            }
          } catch(e) {}
        });

        var displayTarget = cfiToRestore;
        if (!displayTarget && percentToRestore > 0 && locationsGenerated && book.locations) {
          displayTarget = book.locations.cfiFromPercentage(percentToRestore);
        }

        rendition.display(displayTarget || undefined).then(function() {
          isStyleChangeNavigation = false;
          var finalCfi = displayTarget;
          var finalPercent = percentToRestore;
          if (rendition.location && rendition.location.start) {
            finalCfi = rendition.location.start.cfi;
            if (locationsGenerated && book.locations) {
              finalPercent = book.locations.percentageFromCfi(finalCfi) || percentToRestore;
            }
          }
          lastKnownCfi = finalCfi;
          lastKnownPercent = finalPercent;
          log('setReaderTheme complete: CFI=' + finalCfi + ' percent=' + finalPercent);
          msg("styleChangeComplete", {cfi: finalCfi, progress: finalPercent});
        }).catch(function(e) {
          log('setReaderTheme display error: ' + e.message);
          isStyleChangeNavigation = false;
          if (percentToRestore > 0 && locationsGenerated && book.locations) {
            var fallbackCfi = book.locations.cfiFromPercentage(percentToRestore);
            if (fallbackCfi) {
              rendition.display(fallbackCfi).then(function() {
                lastKnownCfi = fallbackCfi;
                lastKnownPercent = percentToRestore;
                msg("styleChangeComplete", {cfi: fallbackCfi, progress: percentToRestore});
              }).catch(function() {
                msg("styleChangeComplete", {cfi: cfiToRestore, progress: percentToRestore});
              });
              return;
            }
          }
          msg("styleChangeComplete", {cfi: cfiToRestore, progress: percentToRestore});
        });

      } catch(e) {
        log('setTheme error: ' + e.message);
        msg("styleChangeComplete", {});
      }
    }

    function setFontSize(size, preservedCfi, bg, text) {
      try {
        currentFontSize = size;
        if(!book) { msg("styleChangeComplete", {}); return; }

        var cfiToRestore = null;
        var percentToRestore = lastKnownPercent;

        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            cfiToRestore = currentLoc.start.cfi;
            if (locationsGenerated && book.locations) {
              percentToRestore = book.locations.percentageFromCfi(cfiToRestore) || lastKnownPercent;
            }
          }
        }

        if (!cfiToRestore && preservedCfi && preservedCfi.length > 0) {
          cfiToRestore = preservedCfi;
        }
        if (!cfiToRestore && lastKnownCfi) {
          cfiToRestore = lastKnownCfi;
        }

        log('setFontSize: preserving CFI=' + cfiToRestore + ' percent=' + percentToRestore);

        if (rendition) {
          rendition.destroy();
        }

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

        rendition.on("keydown", function(e) {
          if (e.key === "ArrowLeft") prevPage();
          if (e.key === "ArrowRight") nextPage();
        });

        var isStyleChangeNavigation = true;
        rendition.on("relocated", function(loc) {
          try {
            lastKnownCfi = loc.start.cfi;
            if (locationsGenerated && book.locations && book.locations.length()) {
              var pct = book.locations.percentageFromCfi(loc.start.cfi);
              lastKnownPercent = pct || 0;
              if (!isStyleChangeNavigation) {
                msg("relocated", {cfi: loc.start.cfi, progress: pct || 0});
              }
            } else if (!isStyleChangeNavigation) {
              msg("relocated", {cfi: loc.start.cfi});
            }
          } catch(e) {}
        });

        var displayTarget = cfiToRestore;
        if (!displayTarget && percentToRestore > 0 && locationsGenerated && book.locations) {
          displayTarget = book.locations.cfiFromPercentage(percentToRestore);
        }

        rendition.display(displayTarget || undefined).then(function() {
          isStyleChangeNavigation = false;
          var finalCfi = displayTarget;
          var finalPercent = percentToRestore;
          if (rendition.location && rendition.location.start) {
            finalCfi = rendition.location.start.cfi;
            if (locationsGenerated && book.locations) {
              finalPercent = book.locations.percentageFromCfi(finalCfi) || percentToRestore;
            }
          }
          lastKnownCfi = finalCfi;
          lastKnownPercent = finalPercent;
          log('setFontSize complete: CFI=' + finalCfi + ' percent=' + finalPercent);
          msg("styleChangeComplete", {cfi: finalCfi, progress: finalPercent});
        }).catch(function(e) {
          log('setFontSize display error: ' + e.message);
          isStyleChangeNavigation = false;
          if (percentToRestore > 0 && locationsGenerated && book.locations) {
            var fallbackCfi = book.locations.cfiFromPercentage(percentToRestore);
            if (fallbackCfi) {
              rendition.display(fallbackCfi).then(function() {
                lastKnownCfi = fallbackCfi;
                lastKnownPercent = percentToRestore;
                msg("styleChangeComplete", {cfi: fallbackCfi, progress: percentToRestore});
              }).catch(function() {
                msg("styleChangeComplete", {cfi: cfiToRestore, progress: percentToRestore});
              });
              return;
            }
          }
          msg("styleChangeComplete", {cfi: cfiToRestore, progress: percentToRestore});
        });

      } catch(e) {
        log('setFontSize error: ' + e.message);
        msg("styleChangeComplete", {});
      }
    }

    function setFontSizeWithProgress(size, progressToRestore, bg, text) {
      try {
        currentFontSize = size;
        if(!book) { msg("styleChangeComplete", {}); return; }

        var actualProgress = progressToRestore;
        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            if (locationsGenerated && book.locations) {
              var pct = book.locations.percentageFromCfi(currentLoc.start.cfi);
              if (pct !== undefined && pct > 0) {
                actualProgress = pct;
              }
            }
          }
        }
        if (!actualProgress && lastKnownPercent > 0) {
          actualProgress = lastKnownPercent;
        }

        log('setFontSizeWithProgress: size=' + size + ' actualProgress=' + actualProgress + ' (passed=' + progressToRestore + ')');

        if (rendition) {
          rendition.destroy();
        }

        document.body.style.background = bg;

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
            }
          } catch(e) {}
        });

        rendition.display().then(function() {
          log('setFontSizeWithProgress: rendition displayed, regenerating locations...');
          locationsGenerated = false;
          book.locations.generate(1500).then(function() {
            log('setFontSizeWithProgress: locations regenerated (' + book.locations.length() + '), navigating to ' + (actualProgress * 100) + '%');
            locationsGenerated = true;
            if (actualProgress > 0) {
              var targetCfi = book.locations.cfiFromPercentage(actualProgress);
              if (targetCfi) {
                rendition.display(targetCfi).then(function() {
                  lastKnownCfi = targetCfi;
                  lastKnownPercent = actualProgress;
                  log('setFontSizeWithProgress complete at ' + (actualProgress * 100) + '%');
                  msg("styleChangeComplete", {cfi: targetCfi, progress: actualProgress});
                }).catch(function(e) {
                  log('setFontSizeWithProgress nav error: ' + e.message);
                  msg("styleChangeComplete", {progress: actualProgress});
                });
              } else {
                msg("styleChangeComplete", {progress: actualProgress});
              }
            } else {
              msg("styleChangeComplete", {progress: 0});
            }
          }).catch(function(e) {
            log('setFontSizeWithProgress locations error: ' + e.message);
            msg("styleChangeComplete", {});
          });
        }).catch(function(e) {
          log('setFontSizeWithProgress display error: ' + e.message);
          msg("styleChangeComplete", {});
        });

      } catch(e) {
        log('setFontSizeWithProgress error: ' + e.message);
        msg("styleChangeComplete", {});
      }
    }

    function setReaderThemeWithProgress(bg, text, progressToRestore) {
      try {
        if(!book) { msg("styleChangeComplete", {}); return; }

        var actualProgress = progressToRestore;
        if (rendition) {
          var currentLoc = rendition.currentLocation();
          if (currentLoc && currentLoc.start && currentLoc.start.cfi) {
            if (locationsGenerated && book.locations) {
              var pct = book.locations.percentageFromCfi(currentLoc.start.cfi);
              if (pct !== undefined && pct > 0) {
                actualProgress = pct;
              }
            }
          }
        }
        if (!actualProgress && lastKnownPercent > 0) {
          actualProgress = lastKnownPercent;
        }

        log('setReaderThemeWithProgress: actualProgress=' + actualProgress + ' (passed=' + progressToRestore + ')');

        if (rendition) {
          rendition.destroy();
        }

        document.body.style.background = bg;

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
            }
          } catch(e) {}
        });

        rendition.display().then(function() {
          log('setReaderThemeWithProgress: rendition displayed, regenerating locations...');
          locationsGenerated = false;
          book.locations.generate(1500).then(function() {
            log('setReaderThemeWithProgress: locations regenerated (' + book.locations.length() + '), navigating to ' + (actualProgress * 100) + '%');
            locationsGenerated = true;
            if (actualProgress > 0) {
              var targetCfi = book.locations.cfiFromPercentage(actualProgress);
              if (targetCfi) {
                rendition.display(targetCfi).then(function() {
                  lastKnownCfi = targetCfi;
                  lastKnownPercent = actualProgress;
                  log('setReaderThemeWithProgress complete at ' + (actualProgress * 100) + '%');
                  msg("styleChangeComplete", {cfi: targetCfi, progress: actualProgress});
                }).catch(function(e) {
                  log('setReaderThemeWithProgress nav error: ' + e.message);
                  msg("styleChangeComplete", {progress: actualProgress});
                });
              } else {
                msg("styleChangeComplete", {progress: actualProgress});
              }
            } else {
              msg("styleChangeComplete", {progress: 0});
            }
          }).catch(function(e) {
            log('setReaderThemeWithProgress locations error: ' + e.message);
            msg("styleChangeComplete", {});
          });
        }).catch(function(e) {
          log('setReaderThemeWithProgress display error: ' + e.message);
          msg("styleChangeComplete", {});
        });

      } catch(e) {
        log('setReaderThemeWithProgress error: ' + e.message);
        msg("styleChangeComplete", {});
      }
    }

    function setFontSizeAndMaintainPosition(size, cfi) {
      try {
        currentFontSize = size;
        if(rendition) {
          rendition.themes.fontSize(size + "%");
          setTimeout(function() {
            if (cfi) {
              rendition.display(cfi);
            }
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

    var touchStartX=0, touchStartY=0, touchStartTime=0, longPressTimer=null;
    document.addEventListener("touchstart", function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function() {
        checkTextSelection();
      }, 500);
    }, {passive:true});

    document.addEventListener("touchmove", function(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, {passive:true});

    document.addEventListener("touchend", function(e) {
      try {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        var dt = Date.now() - touchStartTime;

        if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 500) {
          log('Swipe detected: ' + (dx > 0 ? 'right (prev)' : 'left (next)'));
          dx > 0 ? prevPage() : nextPage();
        } else if(Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 300) {
          msg("tap", {});
        }
      } catch(e) { log('Touch error: ' + e.message); }
    }, {passive:true});

    function checkTextSelection() {
      try {
        if (!rendition) return;
        var contents = rendition.getContents();
        if (!contents || contents.length === 0) return;
        var doc = contents[0].document;
        var selection = doc.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
        var text = selection.toString().trim();
        if (text.length < 2) return;
        var range = selection.getRangeAt(0);
        var cfiRange = contents[0].cfiFromRange(range);
        if (cfiRange) {
          log('Text selected: ' + text.substring(0, 50) + '...');
          msg('textSelected', { cfiRange: cfiRange, text: text });
          selection.removeAllRanges();
        }
      } catch(e) {
        log('checkTextSelection error: ' + e.message);
      }
    }

    document.addEventListener('selectionchange', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(function() {
          checkTextSelection();
        }, 300);
      }
    });
  </script>
</body>
</html>
  `;
}
