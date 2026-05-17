import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, FlatList,
} from 'react-native';

const TAG_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', gluten_free: 'Gluten free',
  halal: 'Halal', kosher: 'Kosher', dairy_free: 'Dairy free',
  nut_free: 'Nut free', low_carb: 'Low carb', keto: 'Keto',
  paleo: 'Paleo', spicy: 'Spicy', raw: 'Raw',
};
const formatTag = (t: string) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');

function DishCard({ dish, rank }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.rank}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.dishName}>{dish.dish_name}</Text>
          <Text style={styles.restaurant}>{dish.restaurant_name}</Text>
        </View>
        {dish.dish_price != null && (
          <Text style={styles.price}>${dish.dish_price.toFixed(2)}</Text>
        )}
      </View>

      {dish.dish_description && (
        <Text style={styles.description} numberOfLines={2}>{dish.dish_description}</Text>
      )}

      {dish.recommendation_note && (
        <View style={styles.noteBox}>
          <Text style={styles.note}>💡 {dish.recommendation_note}</Text>
        </View>
      )}

      <View style={styles.tags}>
        {dish.protein_g != null && (
          <Text style={styles.tag}>🥩 {dish.protein_g}g prot</Text>
        )}
        {dish.calories != null && (
          <Text style={styles.tag}>🔥 {dish.calories} kcal</Text>
        )}
        {dish.dietary_tags?.slice(0, 2).map((t: string) => (
          <Text key={t} style={[styles.tag, styles.dietTag]}>{formatTag(t)}</Text>
        ))}
      </View>
    </View>
  );
}

function ComboCard({ combo }: any) {
  return (
    <View style={[styles.card, styles.comboCard]}>
      <Text style={styles.comboTitle}>🍱 Suggested combo</Text>
      {combo.dishes.map((d: any) => (
        <Text key={d.dish_id} style={styles.comboDish}>• {d.dish_name} — {d.restaurant_name}</Text>
      ))}
      <Text style={styles.note}>💡 {combo.note}</Text>
      <View style={styles.tags}>
        {combo.total_price != null && <Text style={styles.tag}>💰 ${combo.total_price.toFixed(2)} total</Text>}
        {combo.total_protein_g != null && <Text style={styles.tag}>🥩 {combo.total_protein_g}g prot</Text>}
        {combo.total_calories != null && <Text style={styles.tag}>🔥 {combo.total_calories} kcal</Text>}
      </View>
    </View>
  );
}

export default function ResultsScreen({ route, navigation }: any) {
  const { data } = route.params;
  const [tab, setTab] = useState<'dishes' | 'combos'>('dishes');

  const dishes = [...(data.dishes || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const combos = [...(data.combos || [])].sort((a, b) => (b.combined_score ?? 0) - (a.combined_score ?? 0));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.meta}>
          {data.total_restaurants_searched} restaurants · {data.total_dishes_found} dishes
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'dishes' && styles.activeTab]}
          onPress={() => setTab('dishes')}
        >
          <Text style={[styles.tabText, tab === 'dishes' && styles.activeTabText]}>
            Dishes ({dishes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'combos' && styles.activeTab]}
          onPress={() => setTab('combos')}
        >
          <Text style={[styles.tabText, tab === 'combos' && styles.activeTabText]}>
            Combos ({combos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'dishes' ? (
        dishes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No dishes found nearby.</Text>
            <Text style={styles.emptyHint}>Try uploading the menu of a nearby restaurant.</Text>
          </View>
        ) : (
          <FlatList
            data={dishes}
            keyExtractor={(item) => item.dish_id}
            renderItem={({ item }) => <DishCard dish={item} rank={item.rank} />}
            contentContainerStyle={{ padding: 16 }}
          />
        )
      ) : (
        combos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No suggested combos.</Text>
          </View>
        ) : (
          <FlatList
            data={combos}
            keyExtractor={(item) => item.combination_id}
            renderItem={({ item }) => <ComboCard combo={item} />}
            contentContainerStyle={{ padding: 16 }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  back: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
  meta: { color: '#999', fontSize: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF6B35' },
  tabText: { color: '#999', fontSize: 14 },
  activeTabText: { color: '#FF6B35', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  comboCard: { borderLeftWidth: 3, borderLeftColor: '#FF6B35' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  rank: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  rankText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardInfo: { flex: 1 },
  dishName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  restaurant: { fontSize: 13, color: '#888', marginTop: 2 },
  price: { fontSize: 16, fontWeight: '700', color: '#FF6B35' },
  description: { fontSize: 13, color: '#666', marginBottom: 8 },
  noteBox: { backgroundColor: '#fff9f6', borderRadius: 8, padding: 8, marginBottom: 8 },
  note: { fontSize: 13, color: '#d97706' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, color: '#555',
  },
  dietTag: { backgroundColor: '#dcfce7', color: '#16a34a' },
  comboTitle: { fontSize: 15, fontWeight: '700', color: '#FF6B35', marginBottom: 8 },
  comboDish: { fontSize: 14, color: '#333', marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#aaa', textAlign: 'center' },
});
