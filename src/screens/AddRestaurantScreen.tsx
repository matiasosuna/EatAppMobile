import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import api from '../services/api';

const CUISINE_OPTIONS = ['italian', 'japanese', 'mexican', 'vietnamese', 'chinese',
  'indian', 'american', 'thai', 'french', 'peruvian', 'arabic', 'mediterranean'];

const ORANGE = '#FF6B35';

export default function AddRestaurantScreen({ route, navigation }: any) {
  const { location } = route.params || {};
  const [tab, setTab] = useState<'maps' | 'manual'>('maps');

  // Maps URL tab
  const [mapsUrl, setMapsUrl] = useState('');
  const [mapsLoading, setMapsLoading] = useState(false);

  // Manual tab
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  const toggleCuisine = (c: string) => {
    setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleFromMapsUrl = async () => {
    if (!mapsUrl.trim()) return Alert.alert('Paste a Google Maps URL first');
    setMapsLoading(true);
    try {
      const res = await api.post('/restaurants/from-maps-url', { maps_url: mapsUrl.trim() });
      Alert.alert('Restaurant added!', `"${res.data.name}" was created. Do you want to upload the menu now?`, [
        { text: 'Later', onPress: () => navigation.goBack() },
        { text: 'Upload menu', onPress: () => navigation.replace('RestaurantDetail', { restaurant: res.data }) },
      ]);
    } catch (e: any) {
      console.error('Maps URL error:', JSON.stringify(e.response?.data), e.message);
      Alert.alert('Error', e.response?.data?.detail || e.message || 'Could not parse Google Maps URL');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Please enter the restaurant name');
    setManualLoading(true);
    try {
      const res = await api.post('/restaurants', {
        name: name.trim(),
        address: address.trim() || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        phone: phone.trim() || null,
        cuisine_tags: cuisines,
      });
      Alert.alert('Restaurant added!', 'Do you want to upload the menu now?', [
        { text: 'Later', onPress: () => navigation.goBack() },
        { text: 'Upload menu', onPress: () => navigation.replace('RestaurantDetail', { restaurant: res.data }) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not create restaurant');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add restaurant</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'maps' && styles.tabBtnActive]}
          onPress={() => setTab('maps')}
        >
          <Text style={[styles.tabBtnText, tab === 'maps' && styles.tabBtnTextActive]}>🗺️ Google Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'manual' && styles.tabBtnActive]}
          onPress={() => setTab('manual')}
        >
          <Text style={[styles.tabBtnText, tab === 'manual' && styles.tabBtnTextActive]}>✏️ Manual</Text>
        </TouchableOpacity>
      </View>

      {tab === 'maps' ? (
        <View style={styles.mapsTab}>
          <Text style={styles.mapsHint}>
            Copy the link from Google Maps (share button) and paste it here. We'll extract the name and location automatically.
          </Text>
          <Text style={styles.label}>Google Maps URL</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="https://maps.app.goo.gl/..."
            placeholderTextColor="#ccc"
            value={mapsUrl}
            onChangeText={setMapsUrl}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, (!mapsUrl.trim() || mapsLoading) && styles.btnDisabled]}
            onPress={handleFromMapsUrl}
            disabled={!mapsUrl.trim() || mapsLoading}
          >
            {mapsLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Import from Google Maps</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g.: Pho Da Nang"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g.: 123 Tran Phu, Da Nang"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+84 123 456 789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {location && (
            <View style={styles.locBadge}>
              <Text style={styles.locText}>📍 Using your current location</Text>
            </View>
          )}

          <Text style={styles.label}>Cuisine type</Text>
          <View style={styles.chips}>
            {CUISINE_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, cuisines.includes(c) && styles.chipSelected]}
                onPress={() => toggleCuisine(c)}
              >
                <Text style={[styles.chipText, cuisines.includes(c) && styles.chipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={manualLoading}>
            {manualLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add restaurant</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 24 },
  back: { color: ORANGE, fontSize: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabBtnText: { fontSize: 14, color: '#999', fontWeight: '600' },
  tabBtnTextActive: { color: '#1a1a1a' },
  mapsTab: { gap: 12 },
  mapsHint: { fontSize: 13, color: '#888', lineHeight: 19, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 15, marginBottom: 16, color: '#1a1a1a',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  locBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0',
  },
  locText: { color: '#16a34a', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipSelected: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { color: '#555', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: ORANGE, borderRadius: 14, padding: 17, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
