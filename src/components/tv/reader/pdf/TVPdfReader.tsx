/**
 * TV PDF Reader Component
 * D-pad optimized UI for reading PDFs on TV devices
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
import { useTVRemoteHandler } from '@/hooks';
import { type PdfReaderCore } from '@/hooks';

interface TVPdfReaderProps {
  core: PdfReaderCore;
}

export function TVPdfReader({ core }: TVPdfReaderProps) {
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
    goToPage,
    handleClose,
    webViewRef,
    handleMessage,
    getPdfHtml,
    accentColor,
  } = core;

  // Handle TV remote controls
  useTVRemoteHandler({
    onLeft: () => {
      goToPage(currentPage - 1);
    },
    onRight: () => {
      goToPage(currentPage + 1);
    },
    onMenu: () => {
      handleClose();
    },
  });

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
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
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

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item?.Name ?? 'PDF'}
        </Text>
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* Remote hints */}
        <View style={styles.remoteHints}>
          <View style={styles.remoteHint}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
            <Text style={styles.remoteHintText}>Previous</Text>
          </View>
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageText}>
              {currentPage} / {totalPages || '...'}
            </Text>
          </View>
          <View style={styles.remoteHint}>
            <Text style={styles.remoteHintText}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{progressPercent}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  loadingText: { marginTop: 20, fontSize: 20, color: '#888' },
  debugText: { marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { marginTop: 20, fontSize: 24, fontWeight: '600', color: '#fff' },
  errorSubtext: { marginTop: 12, fontSize: 18, color: '#888', textAlign: 'center' },
  button: { marginTop: 32, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '600', color: '#fff', marginHorizontal: 16 },

  readerContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#121212' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },

  footer: {
    paddingHorizontal: 48,
    paddingTop: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  remoteHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteHintText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressText: { fontSize: 16, fontWeight: '500', color: '#fff', width: 60 },
  progressTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginLeft: 16 },
  progressFill: { height: '100%', borderRadius: 3 },
});
