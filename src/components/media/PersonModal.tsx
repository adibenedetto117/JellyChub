import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { memo, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSettingsStore, useAuthStore } from '@/stores';
import { getPerson, getPersonItems, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { getDisplayName, getDisplayImageUrl, navigateToDetails } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface PersonModalProps {
  personId: string | null;
  personName?: string;
  personImageTag?: string;
  visible: boolean;
  onClose: () => void;
}

export const PersonModal = memo(function PersonModal({ personId, personName, personImageTag, visible, onClose }: PersonModalProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = useAuthStore((s) => s.currentUser?.Id ?? '');

  const { data: person, isLoading: isLoadingPerson, error: personError } = useQuery({
    queryKey: ['person', personId, userId],
    queryFn: () => getPerson(personId!, userId),
    enabled: visible && !!personId && !!userId,
    staleTime: Infinity, // Cache forever - person info rarely changes
    retry: false,
  });

  const { data: personItems, isLoading: isLoadingItems, error: itemsError } = useQuery({
    queryKey: ['person-items', personId, userId],
    queryFn: () => getPersonItems(personId!, userId, { limit: 20 }),
    enabled: visible && !!personId && !!userId,
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: false,
  });

  if (!visible) return null;

  const rawImageUrl = personImageTag && personId
    ? getImageUrl(personId, 'Primary', { maxWidth: 400, tag: personImageTag })
    : person?.ImageTags?.Primary
      ? getImageUrl(personId!, 'Primary', { maxWidth: 400, tag: person.ImageTags.Primary })
      : null;
  const imageUrl = personId ? getDisplayImageUrl(personId, rawImageUrl, hideMedia, 'Primary') : null;
  const displayPersonName = person ? getDisplayName(person as any, hideMedia) : personName;

  const formatBirthInfo = useMemo(() => {
    if (!person?.PremiereDate) return null;
    const birthDate = new Date(person.PremiereDate);
    const birthYear = birthDate.getFullYear();

    if (person.EndDate) {
      const deathDate = new Date(person.EndDate);
      const deathYear = deathDate.getFullYear();
      return `${birthYear} - ${deathYear}`;
    }

    const age = new Date().getFullYear() - birthYear;
    return `Born ${birthYear} (${age} years old)`;
  }, [person?.PremiereDate, person?.EndDate]);

  const handleItemPress = useCallback((item: BaseItem) => {
    onClose();
    // Reduced delay for snappier navigation
    setTimeout(() => {
      navigateToDetails(item.Type.toLowerCase(), item.Id, '/(tabs)/home');
    }, 100);
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPersonName || 'Loading...'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Person Image and Info */}
            <View style={styles.personHeader}>
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <CachedImage
                    uri={imageUrl}
                    style={styles.personImage}
                    borderRadius={12}
                  />
                ) : (
                  <View style={[styles.personImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>
                      {(displayPersonName || '?').charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{displayPersonName}</Text>
                {formatBirthInfo && (
                  <Text style={styles.birthInfo}>{formatBirthInfo}</Text>
                )}
              </View>
            </View>

            {/* Biography */}
            {isLoadingPerson ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={accentColor} />
                <Text style={styles.emptyText}>Loading biography...</Text>
              </View>
            ) : personError ? (
              <View style={styles.bioSection}>
                <Text style={styles.emptyText}>Could not load biography</Text>
              </View>
            ) : person?.Overview ? (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Biography</Text>
                <Text style={styles.bioText}>{person.Overview}</Text>
              </View>
            ) : null}

            {/* Known For */}
            <View style={styles.knownForSection}>
              <Text style={styles.sectionTitle}>Known For ({personItems?.Items?.length ?? 0} items)</Text>
              {isLoadingItems ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={accentColor} />
                </View>
              ) : personItems && personItems.Items && personItems.Items.length > 0 ? (
                <View style={styles.itemsRow}>
                  {personItems.Items.map((item) => {
                    const rawItemImageUrl = item.ImageTags?.Primary
                      ? getImageUrl(item.Id, 'Primary', { maxWidth: 200, tag: item.ImageTags.Primary })
                      : null;
                    const itemImageUrl = getDisplayImageUrl(item.Id, rawItemImageUrl, hideMedia, 'Primary');
                    const itemDisplayName = getDisplayName(item, hideMedia);

                    return (
                      <Pressable
                        key={item.Id}
                        style={styles.itemCard}
                        onPress={() => handleItemPress(item)}
                      >
                        <View style={styles.itemImageContainer}>
                          {itemImageUrl ? (
                            <CachedImage
                              uri={itemImageUrl}
                              style={styles.itemImage}
                              borderRadius={8}
                            />
                          ) : (
                            <View style={[styles.itemImage, styles.itemPlaceholder]}>
                              <Text style={styles.itemPlaceholderText}>
                                {itemDisplayName?.charAt(0) || '?'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {itemDisplayName}
                        </Text>
                        {item.ProductionYear && (
                          <Text style={styles.itemYear}>{item.ProductionYear}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No items found in your library</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    maxWidth: 500,
    maxHeight: '80%',
    minHeight: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  personHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    marginRight: 16,
  },
  personImage: {
    width: 100,
    height: 150,
  },
  placeholderImage: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 40,
    fontWeight: '600',
  },
  personInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  personName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  birthInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  knownForSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: 100,
  },
  itemImageContainer: {
    marginBottom: 8,
  },
  itemImage: {
    width: 100,
    height: 150,
  },
  itemPlaceholder: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 24,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  itemYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
