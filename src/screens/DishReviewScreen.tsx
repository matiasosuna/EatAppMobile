import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, ActivityIndicator, Animated, PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmDishes } from '../services/api';

const ORANGE = '#FF6B35';
const GREEN = '#16a34a';
const RED = '#dc2626';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

const TAG_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', gluten_free: 'Gluten free',
  halal: 'Halal', kosher: 'Kosher', dairy_free: 'Dairy free',
  nut_free: 'Nut free', low_carb: 'Low carb', keto: 'Keto',
  paleo: 'Paleo', spicy: 'Spicy', raw: 'Raw',
};
const formatTag = (t: string) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');

interface Dish {
  name: string;
  description: string | null;
  price: number | null;
  section: string | null;
  dietary_tags: string[];
  allergen_tags: string[];
  cuisine_tags: string[];
  included: boolean;
  editing: boolean;
}

// ─── List item ────────────────────────────────────────────────────────────────
function DishItem({ dish, index, onChange, onToggle }: {
  dish: Dish; index: number;
  onChange: (i: number, f: string, v: any) => void;
  onToggle: (i: number) => void;
}) {
  return (
    <View style={[styles.dishCard, !dish.included && styles.dishCardExcluded]}>
      <View style={styles.dishHeader}>
        <TouchableOpacity
          style={[styles.checkbox, dish.included && styles.checkboxOn]}
          onPress={() => onToggle(index)}
        >
          {dish.included && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.dishHeaderText}>
          {dish.editing ? (
            <TextInput
              style={styles.editInput}
              value={dish.name}
              onChangeText={(v) => onChange(index, 'name', v)}
              placeholder="Dish name"
              autoFocus
            />
          ) : (
            <Text style={[styles.dishName, !dish.included && styles.dishNameExcluded]}>
              {dish.name}
            </Text>
          )}
        </View>
        {dish.included && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onChange(index, 'editing', !dish.editing)}
          >
            <Text style={styles.editBtnText}>{dish.editing ? 'Done' : '✏️'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {dish.included && dish.editing && (
        <View style={styles.editFields}>
          <View style={styles.editRow}>
            <Text style={styles.editLabel}>Price</Text>
            <TextInput
              style={styles.editInputSmall}
              value={dish.price != null ? String(dish.price) : ''}
              onChangeText={(v) => onChange(index, 'price', v ? parseFloat(v) : null)}
              keyboardType="decimal-pad"
              placeholder="—"
            />
          </View>
          <View style={styles.editRow}>
            <Text style={styles.editLabel}>Section</Text>
            <TextInput
              style={styles.editInputSmall}
              value={dish.section || ''}
              onChangeText={(v) => onChange(index, 'section', v || null)}
              placeholder="E.g.: Starters"
            />
          </View>
          <View style={styles.editRow}>
            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={[styles.editInputSmall, { flex: 1 }]}
              value={dish.description || ''}
              onChangeText={(v) => onChange(index, 'description', v || null)}
              placeholder="—"
              multiline
            />
          </View>
        </View>
      )}

      {dish.included && !dish.editing && (
        <View style={styles.dishPreview}>
          {dish.description ? (
            <Text style={styles.dishDesc} numberOfLines={1}>{dish.description}</Text>
          ) : null}
          <View style={styles.dishMeta}>
            {dish.price != null && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>${Number(dish.price).toFixed(0)}</Text>
              </View>
            )}
            {dish.section && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionText}>{dish.section}</Text>
              </View>
            )}
            {dish.dietary_tags?.slice(0, 2).map(t => (
              <View key={t} style={styles.dietBadge}>
                <Text style={styles.dietText}>{formatTag(t)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Swipe card ───────────────────────────────────────────────────────────────
function SwipeCard({ dish, onSwipe, onEdit, onChange, cardIndex, total }: {
  dish: Dish; cardIndex: number; total: number;
  onSwipe: (included: boolean) => void;
  onEdit: () => void;
  onChange: (field: string, value: any) => void;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const [editing, setEditing] = useState(false);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !editing,
    onMoveShouldSetPanResponder: (_, g) => !editing && Math.abs(g.dx) > 5,
    onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy * 0.2 }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: SCREEN_WIDTH * 1.5, y: g.dy },
          duration: 250, useNativeDriver: true,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onSwipe(true); });
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: -SCREEN_WIDTH * 1.5, y: g.dy },
          duration: 250, useNativeDriver: true,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onSwipe(false); });
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 }, useNativeDriver: true,
        }).start();
      }
    },
  })).current;

  const handleSwipeBtn = (included: boolean) => {
    Animated.timing(position, {
      toValue: { x: included ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250, useNativeDriver: true,
    }).start(() => { position.setValue({ x: 0, y: 0 }); onSwipe(included); });
  };

  return (
    <View style={styles.swipeArea}>
      {/* Progress */}
      <Text style={styles.swipeProgress}>{cardIndex + 1} / {total}</Text>

      <Animated.View
        style={[styles.swipeCard, { transform: [...position.getTranslateTransform(), { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {/* LIKE / NOPE badges */}
        <Animated.View style={[styles.swipeBadge, styles.swipeBadgeLike, { opacity: likeOpacity }]}>
          <Text style={styles.swipeBadgeText}>✓ KEEP</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeBadge, styles.swipeBadgeNope, { opacity: nopeOpacity }]}>
          <Text style={styles.swipeBadgeText}>✕ SKIP</Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.swipeCardContent}>
          {dish.section ? (
            <View style={styles.swipeSectionBadge}>
              <Text style={styles.swipeSectionText}>{dish.section}</Text>
            </View>
          ) : null}

          {editing ? (
            <TextInput
              style={styles.swipeNameInput}
              value={dish.name}
              onChangeText={(v) => onChange('name', v)}
              autoFocus
            />
          ) : (
            <Text style={styles.swipeName}>{dish.name}</Text>
          )}

          {dish.description ? (
            <Text style={styles.swipeDesc}>{dish.description}</Text>
          ) : null}

          <View style={styles.swipeMeta}>
            {dish.price != null && (
              <View style={styles.swipePriceBadge}>
                <Text style={styles.swipePriceText}>${Number(dish.price).toFixed(0)}</Text>
              </View>
            )}
            {dish.dietary_tags?.map(t => (
              <View key={t} style={styles.swipeDietBadge}>
                <Text style={styles.swipeDietText}>{formatTag(t)}</Text>
              </View>
            ))}
          </View>

          {editing && (
            <View style={styles.swipeEditFields}>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Price</Text>
                <TextInput
                  style={styles.editInputSmall}
                  value={dish.price != null ? String(dish.price) : ''}
                  onChangeText={(v) => onChange('price', v ? parseFloat(v) : null)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Section</Text>
                <TextInput
                  style={styles.editInputSmall}
                  value={dish.section || ''}
                  onChangeText={(v) => onChange('section', v || null)}
                  placeholder="E.g.: Starters"
                />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Description</Text>
                <TextInput
                  style={[styles.editInputSmall, { flex: 1 }]}
                  value={dish.description || ''}
                  onChangeText={(v) => onChange('description', v || null)}
                  placeholder="—"
                  multiline
                />
              </View>
            </View>
          )}
        </View>

        {/* Edit toggle */}
        <TouchableOpacity
          style={styles.swipeEditBtn}
          onPress={() => setEditing(e => !e)}
        >
          <Text style={styles.swipeEditBtnText}>{editing ? '✓ Done' : '✏️ Edit'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.swipeActions}>
        <TouchableOpacity style={styles.swipeNopeBtn} onPress={() => handleSwipeBtn(false)}>
          <Text style={styles.swipeNopeBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.swipeKeepBtn} onPress={() => handleSwipeBtn(true)}>
          <Text style={styles.swipeKeepBtnText}>✓</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.swipeHint}>Swipe right to keep · left to skip</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function DishReviewScreen({ route, navigation }: any) {
  const { jobId, restaurant, extractedDishes } = route.params;
  const [dishes, setDishes] = useState<Dish[]>(
    extractedDishes.map((d: any) => ({ ...d, included: false, editing: false }))
  );
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const [swipeIndex, setSwipeIndex] = useState(0);

  const includedCount = dishes.filter(d => d.included).length;
  const swipeDone = swipeIndex >= dishes.length;

  const handleToggle = (index: number) => {
    setDishes(prev => prev.map((d, i) => i === index ? { ...d, included: !d.included, editing: false } : d));
  };

  const handleChange = (index: number, field: string, value: any) => {
    setDishes(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSwipeChange = (field: string, value: any) => {
    handleChange(swipeIndex, field, value);
  };

  const handleSwipe = (included: boolean) => {
    setDishes(prev => prev.map((d, i) => i === swipeIndex ? { ...d, included } : d));
    setSwipeIndex(i => i + 1);
  };

  const handleConfirm = async () => {
    const toSave = dishes.filter(d => d.included).map(({ included, editing, ...rest }) => rest);
    if (toSave.length === 0) {
      Alert.alert('Please select at least one dish');
      return;
    }
    setSaving(true);
    try {
      await confirmDishes(jobId, toSave);
      navigation.navigate('RestaurantDetail', { restaurant, refresh: Date.now() });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review dishes</Text>
          <Text style={styles.headerSub}>
            {viewMode === 'swipe' && !swipeDone
              ? `${swipeIndex} reviewed · ${includedCount} kept`
              : `${includedCount} of ${dishes.length} selected`}
          </Text>
        </View>
        {/* View toggle */}
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(v => v === 'swipe' ? 'list' : 'swipe')}
        >
          <Text style={styles.viewToggleText}>{viewMode === 'swipe' ? '☰' : '🃏'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {viewMode === 'swipe' ? (
        swipeDone ? (
          <View style={styles.swipeDone}>
            <Text style={styles.swipeDoneIcon}>🎉</Text>
            <Text style={styles.swipeDoneTitle}>All done!</Text>
            <Text style={styles.swipeDoneSub}>{includedCount} dishes selected</Text>
            <TouchableOpacity style={styles.swipeDoneReview} onPress={() => setViewMode('list')}>
              <Text style={styles.swipeDoneReviewText}>Review list</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SwipeCard
            dish={dishes[swipeIndex]}
            cardIndex={swipeIndex}
            total={dishes.length}
            onSwipe={handleSwipe}
            onEdit={() => {}}
            onChange={handleSwipeChange}
          />
        )
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <DishItem
              dish={item}
              index={index}
              onChange={handleChange}
              onToggle={handleToggle}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, (saving || includedCount === 0) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={saving || includedCount === 0}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmBtnText}>
                {includedCount === 0 ? 'No dishes selected' : `Save ${includedCount} dish${includedCount > 1 ? 'es' : ''}`}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, padding: 4 },
  backText: { fontSize: 32, color: ORANGE, lineHeight: 36 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#999', marginTop: 1 },
  viewToggle: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: 10 },
  viewToggleText: { fontSize: 18 },

  // List view
  list: { padding: 12, paddingBottom: 100 },
  dishCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  dishCardExcluded: { opacity: 0.45 },
  dishHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2,
    borderColor: '#ddd', alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dishHeaderText: { flex: 1 },
  dishName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  dishNameExcluded: { textDecorationLine: 'line-through', color: '#aaa' },
  editBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f3f4f6', borderRadius: 8 },
  editBtnText: { fontSize: 13, color: '#555' },
  dishPreview: { marginTop: 8, paddingLeft: 34 },
  dishDesc: { fontSize: 13, color: '#888', marginBottom: 6 },
  dishMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  priceBadge: { backgroundColor: '#fff5f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  priceText: { fontSize: 13, fontWeight: '700', color: ORANGE },
  sectionBadge: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sectionText: { fontSize: 12, color: '#666' },
  dietBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dietText: { fontSize: 11, color: GREEN, fontWeight: '500' },
  editFields: { marginTop: 10, paddingLeft: 34, gap: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editLabel: { fontSize: 12, color: '#999', width: 80 },
  editInput: {
    flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a',
    borderBottomWidth: 1.5, borderBottomColor: ORANGE, paddingBottom: 2,
  },
  editInputSmall: {
    fontSize: 14, color: '#1a1a1a', borderBottomWidth: 1,
    borderBottomColor: '#eee', paddingBottom: 2, paddingHorizontal: 4, minWidth: 80, flex: 1,
  },

  // Swipe view
  swipeArea: { flex: 1, alignItems: 'center', paddingTop: 12 },
  swipeProgress: { fontSize: 13, color: '#aaa', marginBottom: 8 },
  swipeCard: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
    overflow: 'hidden',
  },
  swipeBadge: {
    position: 'absolute', top: 20, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 3,
  },
  swipeBadgeLike: { right: 20, borderColor: GREEN, backgroundColor: 'rgba(220,252,231,0.9)' },
  swipeBadgeNope: { left: 20, borderColor: RED, backgroundColor: 'rgba(254,226,226,0.9)' },
  swipeBadgeText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  swipeCardContent: { padding: 24, paddingBottom: 12, minHeight: 260 },
  swipeSectionBadge: {
    alignSelf: 'flex-start', backgroundColor: '#f3f4f6',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  swipeSectionText: { fontSize: 12, color: '#666', fontWeight: '600' },
  swipeName: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 10, lineHeight: 30 },
  swipeNameInput: {
    fontSize: 22, fontWeight: '700', color: '#1a1a1a',
    borderBottomWidth: 2, borderBottomColor: ORANGE, marginBottom: 10, paddingBottom: 4,
  },
  swipeDesc: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 16 },
  swipeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  swipePriceBadge: { backgroundColor: '#fff5f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  swipePriceText: { fontSize: 16, fontWeight: '800', color: ORANGE },
  swipeDietBadge: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  swipeDietText: { fontSize: 13, color: GREEN, fontWeight: '600' },
  swipeEditFields: { marginTop: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  swipeEditBtn: {
    margin: 16, marginTop: 0, padding: 10, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  swipeEditBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  swipeActions: { flexDirection: 'row', gap: 32, marginTop: 20 },
  swipeNopeBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: RED,
    shadowColor: RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  swipeNopeBtnText: { fontSize: 26, color: RED, fontWeight: '700' },
  swipeKeepBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: GREEN,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  swipeKeepBtnText: { fontSize: 26, color: GREEN, fontWeight: '700' },
  swipeHint: { marginTop: 12, fontSize: 12, color: '#ccc' },

  // Swipe done state
  swipeDone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  swipeDoneIcon: { fontSize: 52 },
  swipeDoneTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  swipeDoneSub: { fontSize: 15, color: '#888' },
  swipeDoneReview: {
    marginTop: 12, borderWidth: 1.5, borderColor: ORANGE,
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
  },
  swipeDoneReviewText: { color: ORANGE, fontWeight: '700', fontSize: 15 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  confirmBtn: {
    backgroundColor: ORANGE, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
