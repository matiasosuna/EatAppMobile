import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { getRestaurants, search } from '../services/api';

const DEFAULT_CITY = 'Da Nang';

const QUICK_FILTERS = [
  { label: '💰 Budget', query: 'cheap budget food' },
  { label: '🥗 Healthy', query: 'salad healthy light' },
  { label: '🍜 Fast', query: 'fast food quick' },
  { label: '🌶️ Spicy', query: 'spicy food' },
  { label: '🌿 Vegan', query: 'vegan vegetarian food' },
];

function RestaurantCard({ restaurant, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardEmoji}>
        <Text style={styles.cardEmojiText}>🍽️</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        {restaurant.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>{restaurant.address}</Text>
        ) : null}
        {restaurant.cuisine_tags?.length > 0 && (
          <View style={styles.cardTags}>
            {restaurant.cuisine_tags.slice(0, 2).map((t: string) => (
              <Text key={t} style={styles.cardTag}>{t}</Text>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const locationRef = useRef<any>(null);

  // Get location once (for search functionality)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      locationRef.current = coords;
      setLocation(coords);
    })();
  }, []);

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRestaurants(DEFAULT_CITY);
      setRestaurants(res.data);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRestaurants(); }, []);
  useFocusEffect(useCallback(() => { loadRestaurants(); }, [loadRestaurants]));

  const handleSearch = async (q: string, budgetOverride?: string) => {
    if (!q.trim() || !location) return;
    setSearching(true);
    const budgetVal = budgetOverride ?? budget;
    try {
      const res = await search({
        free_text: q.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: 3,
        budget_max: budgetVal ? parseFloat(budgetVal) : undefined,
      });
      navigation.navigate('Results', { data: res.data });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey 👋</Text>
        <Text style={styles.title}>What do you want{'\n'}to eat today?</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Pizza, sushi, something cheap..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, (!query.trim() || searching) && styles.searchBtnDisabled]}
          onPress={() => handleSearch(query)}
          disabled={!query.trim() || searching}
        >
          {searching
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchBtnText}>Search</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Budget filter */}
      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>💰 Max budget</Text>
        <View style={styles.budgetInput}>
          <Text style={styles.budgetCurrency}>$</Text>
          <TextInput
            style={styles.budgetField}
            placeholder="No limit"
            placeholderTextColor="#ccc"
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          {budget ? (
            <TouchableOpacity onPress={() => setBudget('')}>
              <Text style={styles.budgetClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Quick filters */}
      <Text style={styles.sectionLabel}>Quick search</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {QUICK_FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            style={styles.filterChip}
            onPress={() => handleSearch(f.query)}
          >
            <Text style={styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Nearby restaurants */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Nearby restaurants</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#FF6B35" style={{ marginTop: 20 }} />
      ) : restaurants.length === 0 ? (
        <Text style={styles.emptyText}>No restaurants nearby.</Text>
      ) : (
        restaurants.slice(0, 5).map(r => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: r })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: '#FF6B35', paddingTop: 60, paddingHorizontal: 20,
    paddingBottom: 28,
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34 },
  searchWrapper: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 16, marginTop: -20,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },
  searchBtn: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    paddingHorizontal: 16, justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  searchBtnDisabled: { backgroundColor: '#ffb89a' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 8,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  sectionLink: { fontSize: 13, color: '#FF6B35', fontWeight: '600' },
  filtersRow: { paddingLeft: 16, marginBottom: 4 },
  filterChip: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, marginRight: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: '#333' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardEmoji: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff5f2', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardEmojiText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  cardAddress: { fontSize: 12, color: '#999', marginBottom: 4 },
  cardTags: { flexDirection: 'row', gap: 4 },
  cardTag: { fontSize: 11, color: '#FF6B35', backgroundColor: '#fff5f2', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  cardArrow: { fontSize: 22, color: '#ddd' },
  emptyText: { textAlign: 'center', color: '#aaa', marginTop: 20, marginHorizontal: 16 },
  budgetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
  },
  budgetLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  budgetInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#eee', minWidth: 120,
  },
  budgetCurrency: { fontSize: 14, color: '#999', marginRight: 4 },
  budgetField: { fontSize: 14, color: '#1a1a1a', paddingVertical: 8, minWidth: 70 },
  budgetClear: { fontSize: 13, color: '#bbb', paddingLeft: 6 },
});
