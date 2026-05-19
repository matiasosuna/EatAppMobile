import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRestaurants } from '../services/api';

const DEFAULT_CITY = 'Da Nang';

function RestaurantCard({ restaurant, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardLeft}>
        <Text style={styles.name}>{restaurant.name}</Text>
        {restaurant.address ? (
          <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
        ) : null}
        {restaurant.cuisine_tags?.length > 0 && (
          <View style={styles.tags}>
            {restaurant.cuisine_tags.slice(0, 3).map((t: string) => (
              <Text key={t} style={styles.tag}>{t}</Text>
            ))}
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        {restaurant.is_claimed && <Text style={styles.claimed}>✓ verified</Text>}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RestaurantsScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRestaurants(DEFAULT_CITY);
      setRestaurants(res.data);
      setFiltered(res.data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!query) { setFiltered(restaurants); return; }
    const q = query.toLowerCase();
    setFiltered(restaurants.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.address?.toLowerCase().includes(q) ||
      r.cuisine_tags?.some((t: string) => t.toLowerCase().includes(q))
    ));
  }, [query, restaurants]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurants</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddRestaurant', { location })}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurant or cuisine..."
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No restaurants nearby.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddRestaurant', { location })}>
              <Text style={styles.emptyBtnText}>Add one</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#888', marginTop: 12 },
  header: {
    backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16,
    paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '700' },
  addBtn: { backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 12, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#eee',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  address: { fontSize: 13, color: '#888', marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { fontSize: 11, color: '#FF6B35', backgroundColor: '#fff5f2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  claimed: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  arrow: { fontSize: 20, color: '#ccc', fontWeight: '300' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#999', fontSize: 15, marginBottom: 16 },
  emptyBtn: { backgroundColor: '#FF6B35', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
});
