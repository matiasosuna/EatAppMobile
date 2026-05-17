import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { search, triggerScrape } from '../services/api';

export default function SearchScreen({ navigation }: any) {
  const [freeText, setFreeText] = useState('');
  const [budget, setBudget] = useState('');
  const [showMacros, setShowMacros] = useState(false);
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de ubicación requerido');
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLocLoading(false);
    })();
  }, []);

  const handleSearch = async () => {
    if (!location) return Alert.alert('Esperando ubicación...');
    if (!freeText && !budget) return Alert.alert('Contanos qué querés comer o tu presupuesto');

    setLoading(true);
    try {
      // Trigger OSM scrape in background (won't block search)
      triggerScrape(location.latitude, location.longitude).catch(() => {});

      const res = await search({
        free_text: freeText || undefined,
        budget_max: budget ? parseFloat(budget) : undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: 3,
        macros: showMacros ? {
          protein_g: protein ? parseFloat(protein) : undefined,
          calories: calories ? parseInt(calories) : undefined,
        } : undefined,
      });
      navigation.navigate('Results', { data: res.data });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo buscar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>¿Qué querés comer?</Text>

      <TextInput
        style={styles.mainInput}
        placeholder="Ej: algo liviano y alto en proteína..."
        value={freeText}
        onChangeText={setFreeText}
        multiline
        numberOfLines={2}
      />

      <Text style={styles.label}>Presupuesto máximo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 15"
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
      />

      <View style={styles.row}>
        <Text style={styles.label}>Agregar macros</Text>
        <Switch value={showMacros} onValueChange={setShowMacros} trackColor={{ true: '#FF6B35' }} />
      </View>

      {showMacros && (
        <View style={styles.macrosBox}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Proteína (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Calorías"
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
          />
        </View>
      )}

      {locLoading && (
        <View style={styles.locRow}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.locText}> Obteniendo ubicación...</Text>
        </View>
      )}
      {location && !locLoading && (
        <Text style={styles.locOk}>📍 Ubicación lista</Text>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleSearch} disabled={loading || locLoading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Buscar</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: '#1a1a1a' },
  mainInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 20, minHeight: 70,
    textAlignVertical: 'top',
  },
  label: { fontSize: 14, color: '#666', marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  macrosBox: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  locText: { color: '#999', fontSize: 13 },
  locOk: { color: '#22c55e', fontSize: 13, marginBottom: 16 },
  btn: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
