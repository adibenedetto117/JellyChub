/**
 * Mobile PDF Reader Component
 * Touch-optimized UI for reading PDFs on mobile devices
 */
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type PdfReaderCore } from '@/hooks';

interface MobilePdfReaderProps {
  core: PdfReaderCore;
}

export function MobilePdfReader({ core }: MobilePdfReaderProps) {
  const insets = useSafeAreaInsets();
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
    getPdfHtml,
    accentColor,
  } = core;

  if (status === 'downloading') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
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
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load PDF</Text>
          <Text style={styles.errorSubtext}>{errorMsg}</Text>
          <Pressable onPress={handleClose} style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={handleClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item?.Name ?? 'PDF'}
        </Text>
        <Pressable
          onPress={handleDownload}
          disabled={!!downloaded || isDownloading}
          style={styles.headerBtn}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : downloaded ? (
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      <View style={styles.readerContainer}>
        {pdfBase64 && (
          <WebView
            key={`pdf-${itemId}`}
            ref={webViewRef}
            source={{ html: getPdfHtml() }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowFileAccess
            allowUniversalAccessFromFileURLs
            onMessage={handleMessage}
            onError={(e) => console.error('WebView error:', e.nativeEvent.description)}
          />
        )}

        {isLoading && pdfBase64 && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Loading PDF...</Text>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{progressPercent}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
          </View>
        </View>
        <View style={styles.pageRow}>
          <Pressable
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={[styles.navButton, currentPage <= 1 && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={24} color={currentPage <= 1 ? '#666' : '#fff'} />
          </Pressable>
          <Text style={styles.pageText}>
            {currentPage} / {totalPages || '...'}
          </Text>
          <Pressable
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={[styles.navButton, currentPage >= totalPages && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={24} color={currentPage >= totalPages ? '#666' : '#fff'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#888' },
  debugText: { marginTop: 8, fontSize: 12, color: '#555' },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#fff' },
  errorSubtext: { marginTop: 8, fontSize: 14, color: '#888', textAlign: 'center' },
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff', marginHorizontal: 4 },

  readerContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#121212' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressText: { fontSize: 13, fontWeight: '500', color: '#fff', width: 40 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginLeft: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  pageText: { fontSize: 15, color: '#fff', fontWeight: '500', minWidth: 80, textAlign: 'center' },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  navButtonDisabled: { opacity: 0.5 },
});
