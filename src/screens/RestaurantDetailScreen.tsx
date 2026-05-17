import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SectionList, Image, Alert, Animated, Modal, ScrollView,
  Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import api, { uploadMenuPhoto, getJobStatus, isAdmin } from '../services/api';

const TAG_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', gluten_free: 'Gluten free',
  halal: 'Halal', kosher: 'Kosher', dairy_free: 'Dairy free',
  nut_free: 'Nut free', low_carb: 'Low carb', keto: 'Keto',
  paleo: 'Paleo', spicy: 'Spicy', raw: 'Raw',
};
const formatTag = (t: string) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');

// ─── Dish Card ────────────────────────────────────────────────────────────────
function DishCard({ dish }: any) {
  const hasMeta = dish.calories != null || dish.protein_g != null || dish.dietary_tags?.length > 0;
  return (
    <View style={styles.dishCard}>
      <View style={styles.dishLeft}>
        <Text style={styles.dishName}>{dish.name}</Text>
        {dish.description ? (
          <Text style={styles.dishDesc} numberOfLines={2}>{dish.description}</Text>
        ) : null}
        {hasMeta && (
          <View style={styles.dishPills}>
            {dish.calories != null && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>🔥 {dish.calories} kcal</Text>
              </View>
            )}
            {dish.protein_g != null && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>🥩 {dish.protein_g}g prot</Text>
              </View>
            )}
            {dish.dietary_tags?.slice(0, 2).map((t: string) => (
              <View key={t} style={styles.pillGreen}>
                <Text style={styles.pillGreenText}>{formatTag(t)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {dish.price != null && (
        <View style={styles.dishPriceBox}>
          <Text style={styles.dishPrice}>${Number(dish.price).toFixed(0)}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count} dishes</Text>
    </View>
  );
}

// ─── Upload Modal (admin) ─────────────────────────────────────────────────────
function UploadModal({ visible, restaurant, onClose, onDone, navigation }: any) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [dishCount, setDishCount] = useState<number | null>(null);

  const reset = () => {
    setImage(null); setLoading(false);
    setJobId(null); setJobStatus(null); setDishCount(null);
  };

  const handleClose = () => { reset(); onClose(); };

  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await getJobStatus(jobId);
        setJobStatus(res.data.status);
        if (res.data.dishes_extracted != null) setDishCount(res.data.dishes_extracted);
        if (res.data.status === 'pending_review') {
          clearInterval(interval);
          const extracted: any[] = res.data.extracted_dishes || [];

          // Fetch existing dishes to detect duplicates
          let duplicates: string[] = [];
          let filtered = extracted;
          try {
            const detail = await api.get(`/restaurants/${restaurant.id}`);
            const existingNames: Set<string> = new Set(
              (detail.data.menus || []).flatMap((m: any) =>
                (m.dishes || []).map((d: any) => d.name.trim().toLowerCase())
              )
            );
            duplicates = extracted
              .filter(d => existingNames.has(d.name.trim().toLowerCase()))
              .map(d => d.name);
            filtered = extracted.filter(d => !existingNames.has(d.name.trim().toLowerCase()));
          } catch {}

          const navigate = () => {
            onClose();
            navigation.navigate('DishReview', {
              jobId,
              restaurant,
              extractedDishes: filtered,
            });
          };

          if (duplicates.length > 0) {
            Alert.alert(
              `${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} removed`,
              `These dishes already exist in the menu and were removed:\n\n• ${duplicates.join('\n• ')}`,
              [{ text: 'OK', onPress: navigate }]
            );
          } else {
            navigate();
          }
        }
        if (res.data.status === 'done') { clearInterval(interval); onDone(); }
        if (res.data.status === 'failed') clearInterval(interval);
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const pickImage = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await uploadMenuPhoto(restaurant.id, image);
      setJobId(res.data.job_id);
      setJobStatus('queued');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = jobStatus === 'queued' || jobStatus === 'processing';
  const isDone = jobStatus === 'done';
  const isFailed = jobStatus === 'failed';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Upload menu</Text>
          <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Status display */}
          {jobStatus && (
            <View style={[styles.statusBanner, isDone && styles.statusBannerDone, isFailed && styles.statusBannerFailed]}>
              {isProcessing && <ActivityIndicator color="#FF6B35" style={{ marginRight: 10 }} />}
              <View>
                <Text style={styles.statusBannerTitle}>
                  {isProcessing ? 'Processing with AI...' : isDone ? 'Menu uploaded!' : 'An error occurred'}
                </Text>
                {isDone && dishCount != null && (
                  <Text style={styles.statusBannerSub}>{dishCount} dishes added to the menu</Text>
                )}
                {isFailed && (
                  <Text style={styles.statusBannerSub}>Try again with another photo</Text>
                )}
              </View>
            </View>
          )}

          {!jobStatus && (
            <>
              <Text style={styles.modalSubtitle}>
                Take a clear photo of the full menu. AI will automatically extract all dishes.
              </Text>

              {image ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
                  <TouchableOpacity style={styles.previewRetake} onPress={() => setImage(null)}>
                    <Text style={styles.previewRetakeText}>Change photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickOptions}>
                  <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
                    <Text style={styles.pickBtnIcon}>📷</Text>
                    <Text style={styles.pickBtnLabel}>Camera</Text>
                    <Text style={styles.pickBtnSub}>Take a photo now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(false)}>
                    <Text style={styles.pickBtnIcon}>🖼️</Text>
                    <Text style={styles.pickBtnLabel}>Gallery</Text>
                    <Text style={styles.pickBtnSub}>Choose from your photos</Text>
                  </TouchableOpacity>
                </View>
              )}

              {image && (
                <TouchableOpacity
                  style={[styles.uploadCTA, loading && styles.uploadCTALoading]}
                  onPress={handleUpload}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.uploadCTAText}>Extract dishes with AI</Text>
                  }
                </TouchableOpacity>
              )}
            </>
          )}

          {isDone && (
            <TouchableOpacity style={styles.uploadCTA} onPress={handleClose}>
              <Text style={styles.uploadCTAText}>View updated menu</Text>
            </TouchableOpacity>
          )}

          {isFailed && (
            <TouchableOpacity style={styles.uploadCTASecondary} onPress={reset}>
              <Text style={styles.uploadCTASecondaryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RestaurantDetailScreen({ route, navigation }: any) {
  const { restaurant } = route.params;
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadVisible, setUploadVisible] = useState(false);
  const admin = isAdmin();

  const loadDetail = () => {
    setLoading(true);
    api.get(`/restaurants/${restaurant.id}`)
      .then(res => setDetail(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => { loadDetail(); }, []));

  const menus = detail?.menus || [];
  const currentMenu = menus[0];
  const totalDishes = detail?.total_dishes ?? 0;

  const sections = currentMenu?.dishes?.reduce((acc: any[], dish: any) => {
    const section = dish.section || 'Dishes';
    const existing = acc.find((s: any) => s.title === section);
    if (existing) existing.data.push(dish);
    else acc.push({ title: section, data: [dish] });
    return acc;
  }, []) ?? [];

  const initials = restaurant.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* ── Hero header ── */}
      <View style={styles.hero}>
        <SafeAreaView style={styles.heroSafe}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.heroContent}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{restaurant.name}</Text>
            {restaurant.address ? (
              <Text style={styles.heroAddress} numberOfLines={1}>📍 {restaurant.address}</Text>
            ) : null}
            {(restaurant.latitude && restaurant.longitude) ? (
              <TouchableOpacity
                onPress={() => {
                  const url = restaurant.website?.includes('google.com/maps') || restaurant.website?.includes('maps.app.goo.gl')
                    ? restaurant.website
                    : `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
                  Linking.openURL(url);
                }}
                style={styles.mapsBtn}
              >
                <Text style={styles.mapsBtnText}>🗺️ Open in Maps</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.heroTags}>
              {restaurant.cuisine_tags?.slice(0, 3).map((t: string) => (
                <View key={t} style={styles.heroTag}>
                  <Text style={styles.heroTagText}>{t}</Text>
                </View>
              ))}
              {restaurant.is_claimed && (
                <View style={styles.heroTagVerified}>
                  <Text style={styles.heroTagVerifiedText}>✓ verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalDishes}</Text>
            <Text style={styles.statLabel}>dishes</Text>
          </View>
          {restaurant.phone && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>📞</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{restaurant.phone}</Text>
              </View>
            </>
          )}
        </View>
      </View>


      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" size="large" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : menus.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🍽️</Text>
          <Text style={styles.emptyStateTitle}>No menu yet</Text>
          <Text style={styles.emptyStateBody}>
            This restaurant doesn't have a menu yet.
          </Text>
          {admin && (
            <TouchableOpacity style={styles.emptyStateCTA} onPress={() => setUploadVisible(true)}>
              <Text style={styles.emptyStateCTAText}>Upload menu photo</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>
            {currentMenu?.extraction_status === 'processing' ? '⏳ Extracting dishes...' : 'No dishes in this menu.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DishCard dish={item} />}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} count={section.data.length} />
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}

      {/* ── Admin FAB ── */}
      {admin && menus.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setUploadVisible(true)}>
          <Text style={styles.fabText}>+ Menu</Text>
        </TouchableOpacity>
      )}

      {/* ── Upload Modal ── */}
      <UploadModal
        visible={uploadVisible}
        restaurant={restaurant}
        navigation={navigation}
        onClose={() => setUploadVisible(false)}
        onDone={() => { setUploadVisible(false); loadDetail(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ORANGE = '#FF6B35';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  // Hero
  hero: { backgroundColor: ORANGE, paddingBottom: 0 },
  heroSafe: { paddingTop: Platform.OS === 'ios' ? 0 : 20 },
  backBtn: { padding: 12, paddingTop: Platform.OS === 'ios' ? 8 : 20, width: 48 },
  backText: { fontSize: 32, color: '#fff', lineHeight: 36 },
  heroContent: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  heroAvatar: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
  heroAddress: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  mapsBtn: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  mapsBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroTag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  heroTagVerified: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  heroTagVerifiedText: { fontSize: 12, color: ORANGE, fontWeight: '700' },

  // Stats bar
  statsBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 14, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 1 },
  statDivider: { width: 1, backgroundColor: '#eee', marginVertical: 4 },

  // Menu tabs
  menuTabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuTabsScroll: { paddingHorizontal: 16 },
  menuTab: { paddingHorizontal: 16, paddingVertical: 13, marginRight: 4 },
  menuTabActive: { borderBottomWidth: 2.5, borderBottomColor: ORANGE },
  menuTabText: { fontSize: 14, color: '#aaa', fontWeight: '500' },
  menuTabTextActive: { color: ORANGE, fontWeight: '700' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#aaa', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyStateIcon: { fontSize: 52, marginBottom: 4 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  emptyStateBody: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  emptyStateCTA: {
    marginTop: 12, backgroundColor: ORANGE, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyStateCTAText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Section header (sticky)
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f7f7f7', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#ececec',
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount: { fontSize: 12, color: '#bbb' },

  // Dish card
  listContent: { paddingBottom: 100 },
  dishCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  dishLeft: { flex: 1, marginRight: 12 },
  dishName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4, lineHeight: 20 },
  dishDesc: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 8 },
  dishPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  pill: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, color: '#555' },
  pillGreen: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillGreenText: { fontSize: 11, color: '#16a34a', fontWeight: '500' },
  dishPriceBox: {
    backgroundColor: '#fff5f2', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center',
  },
  dishPrice: { fontSize: 15, fontWeight: '800', color: ORANGE },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: ORANGE, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Upload Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: '#666' },
  modalBody: { padding: 20, gap: 16 },
  modalSubtitle: { fontSize: 14, color: '#888', lineHeight: 20 },
  pickOptions: { flexDirection: 'row', gap: 12 },
  pickBtn: {
    flex: 1, backgroundColor: '#fafafa', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#eee', padding: 20,
    alignItems: 'center', gap: 4,
  },
  pickBtnIcon: { fontSize: 32 },
  pickBtnLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  pickBtnSub: { fontSize: 12, color: '#aaa' },
  previewContainer: { gap: 8 },
  preview: { width: '100%', height: 200, borderRadius: 14 },
  previewRetake: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  previewRetakeText: { color: ORANGE, fontSize: 14, fontWeight: '600' },
  uploadCTA: {
    backgroundColor: ORANGE, borderRadius: 14,
    padding: 16, alignItems: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  uploadCTALoading: { opacity: 0.8 },
  uploadCTAText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  uploadCTASecondary: {
    borderWidth: 1.5, borderColor: ORANGE, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  uploadCTASecondaryText: { color: ORANGE, fontWeight: '700', fontSize: 15 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef3ec', borderRadius: 14, padding: 16, gap: 8,
  },
  statusBannerDone: { backgroundColor: '#dcfce7' },
  statusBannerFailed: { backgroundColor: '#fee2e2' },
  statusBannerTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  statusBannerSub: { fontSize: 13, color: '#666', marginTop: 2 },
});
