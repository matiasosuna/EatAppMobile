import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import api, { clearSession } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher'];
const ALLERGEN_OPTIONS = ['nuts', 'dairy', 'shellfish', 'eggs', 'soy', 'gluten'];
const CUISINE_OPTIONS = ['italian', 'japanese', 'mexican', 'argentinian', 'chinese', 'indian', 'american'];

function ChipSelector({ label, options, selected, onToggle }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, selected.includes(opt) && styles.chipSelected]}
            onPress={() => onToggle(opt)}
          >
            <Text style={[styles.chipText, selected.includes(opt) && styles.chipTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [cuisineLikes, setCuisineLikes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const handleSignOut = async () => {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  useEffect(() => {
    api.get('/users/me/preferences')
      .then(res => {
        setDietary(res.data.dietary_tags || []);
        setAllergens(res.data.allergens || []);
        setCuisineLikes(res.data.cuisine_likes || []);
      })
      .catch(() => {});
  }, []);

  const toggle = (setter: any, current: string[], value: string) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
    setSaved(false);
  };

  const save = async () => {
    try {
      await api.put('/users/me/preferences', {
        dietary_tags: dietary,
        allergens,
        cuisine_likes: cuisineLikes,
        cuisine_dislikes: [],
      });
      setSaved(true);
    } catch {
      Alert.alert('Error saving preferences');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My preferences</Text>
      <Text style={styles.subtitle}>Searches automatically adapt to your preferences.</Text>

      <ChipSelector
        label="Diet"
        options={DIETARY_OPTIONS}
        selected={dietary}
        onToggle={(v: string) => toggle(setDietary, dietary, v)}
      />
      <ChipSelector
        label="Allergies / intolerances"
        options={ALLERGEN_OPTIONS}
        selected={allergens}
        onToggle={(v: string) => toggle(setAllergens, allergens, v)}
      />
      <ChipSelector
        label="Favorite cuisines"
        options={CUISINE_OPTIONS}
        selected={cuisineLikes}
        onToggle={(v: string) => toggle(setCuisineLikes, cuisineLikes, v)}
      />

      <TouchableOpacity style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>{saved ? '✓ Saved' : 'Save preferences'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelected: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  chipText: { color: '#555', fontSize: 14 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signOutBtn: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 12,
  },
  signOutText: { color: '#999', fontSize: 16 },
});
