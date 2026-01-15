import { useState, useEffect, memo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight, FadeInUp } from 'react-native-reanimated';
import type { RadarrLookupResult, RadarrRootFolder, RadarrQualityProfile } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const RADARR_ORANGE = '#ffc230';
const RADARR_GRADIENT = ['#ffc230', '#f5a623', '#e8941f'] as const;

type AddMovieStep = 'preview' | 'settings' | 'confirm';

interface AddMovieModalProps {
  visible: boolean;
  movie: RadarrLookupResult | null;
  rootFolders: RadarrRootFolder[];
  qualityProfiles: RadarrQualityProfile[];
  onClose: () => void;
  onAdd: (opts: { qualityProfileId: number; rootFolderPath: string; searchForMovie: boolean }) => void;
  isAdding: boolean;
}

export const AddMovieModal = memo(function AddMovieModal({
  visible,
  movie,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: AddMovieModalProps) {
  const [step, setStep] = useState<AddMovieStep>('preview');
  const [quality, setQuality] = useState<number>(0);
  const [folder, setFolder] = useState<string>('');
  const [autoSearch, setAutoSearch] = useState(true);

  useEffect(() => {
    if (qualityProfiles.length > 0 && !quality) setQuality(qualityProfiles[0].id);
    if (rootFolders.length > 0 && !folder) setFolder(rootFolders[0].path);
  }, [qualityProfiles, rootFolders]);

  useEffect(() => {
    if (visible) {
      setStep('preview');
    }
  }, [visible]);

  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const fanart = movie.images.find((i) => i.coverType === 'fanart');
  const posterUrl = movie.remotePoster || poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;
  const selectedProfile = qualityProfiles.find((p) => p.id === quality);
  const selectedFolder = rootFolders.find((f) => f.path === folder);

  const stepIndex = step === 'preview' ? 0 : step === 'settings' ? 1 : 2;

  const handleNext = () => {
    if (step === 'preview') setStep('settings');
    else if (step === 'settings') setStep('confirm');
    else onAdd({ qualityProfileId: quality, rootFolderPath: folder, searchForMovie: autoSearch });
  };

  const handleBack = () => {
    if (step === 'settings') setStep('preview');
    else if (step === 'confirm') setStep('settings');
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View entering={FadeInUp.springify()} style={styles.addModal}>
          <View style={styles.addModalHeaderContainer}>
            {fanartUrl && (
              <Image source={{ uri: fanartUrl }} style={styles.addModalBg} contentFit="cover" />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', colors.background.secondary]}
              style={styles.addModalBgGradient}
            />
            <View style={styles.addModalHeader}>
              <Pressable onPress={handleBack} style={styles.addModalBackBtn}>
                <Ionicons name={step === 'preview' ? 'close' : 'arrow-back'} size={22} color="#fff" />
              </Pressable>
              <View style={styles.stepIndicator}>
                {(['preview', 'settings', 'confirm'] as const).map((s, i) => (
                  <View
                    key={s}
                    style={[
                      styles.stepDot,
                      i <= stepIndex && styles.stepDotActive,
                      i === stepIndex && styles.stepDotCurrent,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.addModalHeaderSpacer} />
            </View>
          </View>

          <ScrollView style={styles.addModalContent} showsVerticalScrollIndicator={false}>
            {step === 'preview' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.stepContent}>
                <View style={styles.addPreviewLarge}>
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.addPosterLarge} contentFit="cover" />
                  ) : (
                    <View style={[styles.addPosterLarge, styles.noPoster]}>
                      <Ionicons name="film-outline" size={48} color={colors.text.muted} />
                    </View>
                  )}
                </View>
                <Text style={styles.addPreviewTitleLarge}>{movie.title}</Text>
                <View style={styles.addPreviewMeta}>
                  <View style={styles.yearBadgeLarge}>
                    <Text style={styles.yearBadgeLargeText}>{movie.year}</Text>
                  </View>
                  {movie.runtime > 0 && (
                    <Text style={styles.runtimeText}>{movie.runtime} min</Text>
                  )}
                  {rating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={RADARR_ORANGE} />
                      <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {movie.genres.length > 0 && (
                  <View style={styles.genreRowLarge}>
                    {movie.genres.slice(0, 3).map((g) => (
                      <View key={g} style={styles.genreChipLarge}>
                        <Text style={styles.genreChipTextLarge}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {movie.overview && (
                  <Text style={styles.overviewText} numberOfLines={4}>{movie.overview}</Text>
                )}
              </Animated.View>
            )}

            {step === 'settings' && (
              <Animated.View entering={SlideInRight.duration(200)} style={styles.stepContent}>
                <Text style={styles.stepTitle}>Configure Settings</Text>
                <Text style={styles.stepSubtitle}>Choose how to add this movie</Text>

                <View style={styles.settingSection}>
                  <View style={styles.settingSectionHeader}>
                    <Ionicons name="speedometer-outline" size={18} color={RADARR_ORANGE} />
                    <Text style={styles.settingSectionTitle}>Quality Profile</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                    {qualityProfiles.map((p) => (
                      <Pressable
                        key={p.id}
                        style={[styles.optionChip, quality === p.id && styles.optionChipActive]}
                        onPress={() => setQuality(p.id)}
                      >
                        <Text style={[styles.optionChipText, quality === p.id && styles.optionChipTextActive]}>{p.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.settingSection}>
                  <View style={styles.settingSectionHeader}>
                    <Ionicons name="folder-outline" size={18} color={RADARR_ORANGE} />
                    <Text style={styles.settingSectionTitle}>Root Folder</Text>
                  </View>
                  {rootFolders.map((f) => (
                    <Pressable
                      key={f.id}
                      style={[styles.folderOption, folder === f.path && styles.folderOptionActive]}
                      onPress={() => setFolder(f.path)}
                    >
                      <View style={styles.folderRadio}>
                        <View style={[styles.radioOuter, folder === f.path && styles.radioOuterActive]}>
                          {folder === f.path && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.folderInfo}>
                          <Text style={styles.folderPath} numberOfLines={1}>{f.path}</Text>
                          <View style={styles.folderFreeRow}>
                            <View style={styles.freeSpaceBar}>
                              <View
                                style={[
                                  styles.freeSpaceFill,
                                  { width: `${Math.min(100, Math.max(10, (f.freeSpace / (f.freeSpace + 1000000000000)) * 100))}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.folderFree}>{formatBytes(f.freeSpace)} free</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.settingSection}>
                  <Pressable style={styles.toggleRow} onPress={() => setAutoSearch(!autoSearch)}>
                    <View style={styles.toggleInfo}>
                      <Ionicons name="search-outline" size={18} color={autoSearch ? RADARR_ORANGE : colors.text.muted} />
                      <View>
                        <Text style={styles.toggleLabel}>Search After Adding</Text>
                        <Text style={styles.toggleHint}>Automatically search for this movie</Text>
                      </View>
                    </View>
                    <View style={[styles.toggleSwitch, autoSearch && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleKnob, autoSearch && styles.toggleKnobActive]} />
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {step === 'confirm' && (
              <Animated.View entering={SlideInRight.duration(200)} style={styles.stepContent}>
                <Text style={styles.stepTitle}>Confirm Addition</Text>
                <Text style={styles.stepSubtitle}>Review your settings</Text>

                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    {posterUrl && (
                      <Image source={{ uri: posterUrl }} style={styles.confirmPoster} contentFit="cover" />
                    )}
                    <View style={styles.confirmInfo}>
                      <Text style={styles.confirmTitle}>{movie.title}</Text>
                      <Text style={styles.confirmYear}>{movie.year}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.confirmSummary}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="speedometer-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Quality</Text>
                    <Text style={styles.summaryValue}>{selectedProfile?.name || 'Not selected'}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="folder-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Folder</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedFolder?.path || 'Not selected'}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.summaryLabel}>Auto Search</Text>
                    <Text style={[styles.summaryValue, { color: autoSearch ? colors.status.success : colors.text.muted }]}>
                      {autoSearch ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          <View style={styles.addModalFooter}>
            <Pressable
              style={styles.addSubmitBtn}
              onPress={handleNext}
              disabled={isAdding || (step === 'settings' && (!quality || !folder))}
            >
              <LinearGradient
                colors={RADARR_GRADIENT}
                style={[
                  styles.addSubmitGradient,
                  (step === 'settings' && (!quality || !folder)) && styles.addSubmitDisabled,
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.addSubmitText}>
                      {step === 'preview' ? 'Continue' : step === 'settings' ? 'Review' : 'Add to Radarr'}
                    </Text>
                    <Ionicons
                      name={step === 'confirm' ? 'add-circle' : 'arrow-forward'}
                      size={18}
                      color="#000"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  addModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  addModalHeaderContainer: {
    height: 120,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  addModalBg: {
    ...StyleSheet.absoluteFillObject,
  },
  addModalBgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  addModalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stepDotCurrent: {
    width: 24,
    borderRadius: 4,
    backgroundColor: RADARR_ORANGE,
  },
  addModalHeaderSpacer: {
    width: 36,
  },
  addModalContent: {
    padding: spacing[4],
  },
  stepContent: {
    paddingBottom: spacing[4],
  },
  addPreviewLarge: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  addPosterLarge: {
    width: 140,
    height: 210,
    borderRadius: borderRadius.lg,
  },
  noPoster: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPreviewTitleLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  addPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  yearBadgeLarge: {
    backgroundColor: RADARR_ORANGE,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  yearBadgeLargeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  runtimeText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  genreRowLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  genreChipLarge: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  genreChipTextLarge: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  overviewText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing[4],
  },
  settingSection: {
    marginBottom: spacing[4],
  },
  settingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionScroll: {
    marginBottom: spacing[2],
  },
  optionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  optionChipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  optionChipTextActive: {
    color: RADARR_ORANGE,
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderOptionActive: {
    borderColor: RADARR_ORANGE,
    backgroundColor: `${RADARR_ORANGE}10`,
  },
  folderRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: RADARR_ORANGE,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RADARR_ORANGE,
  },
  folderInfo: {
    flex: 1,
    marginLeft: spacing[2],
  },
  folderPath: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
  },
  folderFreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  freeSpaceBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  freeSpaceFill: {
    height: '100%',
    backgroundColor: colors.status.success,
    borderRadius: 2,
  },
  folderFree: {
    fontSize: 11,
    color: colors.text.muted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  toggleHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.elevated,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: RADARR_ORANGE,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  confirmCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  confirmPoster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.md,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmYear: {
    fontSize: 14,
    color: RADARR_ORANGE,
    marginTop: 2,
  },
  confirmSummary: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.muted,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    flex: 2,
    textAlign: 'right',
  },
  addModalFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingBottom: spacing[2],
  },
  addSubmitBtn: {
    margin: spacing[4],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3.5],
  },
  addSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  addSubmitDisabled: {
    opacity: 0.5,
  },
});
