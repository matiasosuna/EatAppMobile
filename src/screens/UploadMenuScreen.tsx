import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getRestaurants, uploadMenuPhoto, getJobStatus } from '../services/api';
import * as Location from 'expo-location';

export default function UploadMenuScreen() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [dishCount, setDishCount] = useState<number | null>(null);

  useEffect(() => {
    loadNearbyRestaurants();
  }, []);

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await getJobStatus(jobId);
        setJobStatus(res.data.status);
        if (res.data.dishes_extracted != null) setDishCount(res.data.dishes_extracted);
        if (res.data.status === 'done' || res.data.status === 'failed') clearInterval(interval);
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const loadNearbyRestaurants = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const res = await getRestaurants(loc.coords.latitude, loc.coords.longitude);
      setRestaurants(res.data);
    } catch { }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!selectedRestaurant) return Alert.alert('Seleccioná un restaurante');
    if (!image) return Alert.alert('Sacá una foto del menú');
    setLoading(true);
    try {
      const res = await uploadMenuPhoto(selectedRestaurant.id, image);
      setJobId(res.data.job_id);
      setJobStatus('queued');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo subir');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel: Record<string, string> = {
    queued: '⏳ En cola...',
    processing: '🔍 Extrayendo platos con IA...',
    done: '✅ ¡Listo!',
    failed: '❌ Error',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subir menú</Text>
      <Text style={styles.subtitle}>Sacá una foto del menú y la IA extrae todos los platos.</Text>

      {/* Restaurant selector */}
      <Text style={styles.label}>Restaurante</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.restScroll}>
        {restaurants.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.restChip, selectedRestaurant?.id === r.id && styles.restChipSelected]}
            onPress={() => setSelectedRestaurant(r)}
          >
            <Text style={[styles.restChipText, selectedRestaurant?.id === r.id && styles.restChipTextSelected]}>
              {r.name}
            </Text>
          </TouchableOpacity>
        ))}
        {restaurants.length === 0 && (
          <Text style={styles.noRest}>Cargando restaurantes cercanos...</Text>
        )}
      </ScrollView>

      {/* Image capture */}
      <Text style={styles.label}>Foto del menú</Text>
      {image ? (
        <View>
          <Image source={{ uri: image }} style={styles.preview} />
          <TouchableOpacity style={styles.retake} onPress={pickImage}>
            <Text style={styles.retakeText}>Volver a sacar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
            <Text style={styles.imgBtnIcon}>📷</Text>
            <Text style={styles.imgBtnText}>Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imgBtn} onPress={pickFromLibrary}>
            <Text style={styles.imgBtnIcon}>🖼️</Text>
            <Text style={styles.imgBtnText}>Galería</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload */}
      {!jobId && (
        <TouchableOpacity style={styles.btn} onPress={handleUpload} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Subir y extraer</Text>}
        </TouchableOpacity>
      )}

      {/* Job status */}
      {jobStatus && (
        <View style={[styles.statusBox, jobStatus === 'done' && styles.statusDone, jobStatus === 'failed' && styles.statusFailed]}>
          <Text style={styles.statusText}>{statusLabel[jobStatus] || jobStatus}</Text>
          {jobStatus === 'done' && dishCount != null && (
            <Text style={styles.statusSub}>{dishCount} platos agregados al menú</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6, color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 10 },
  restScroll: { marginBottom: 24 },
  restChip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  restChipSelected: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  restChipText: { color: '#555', fontSize: 14 },
  restChipTextSelected: { color: '#fff', fontWeight: '600' },
  noRest: { color: '#aaa', fontSize: 14, paddingVertical: 10 },
  imageButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  imgBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#FF6B35', borderRadius: 14,
    borderStyle: 'dashed', padding: 24, alignItems: 'center',
  },
  imgBtnIcon: { fontSize: 32, marginBottom: 6 },
  imgBtnText: { color: '#FF6B35', fontWeight: '600' },
  preview: { width: '100%', height: 220, borderRadius: 14, marginBottom: 10 },
  retake: { alignItems: 'center', marginBottom: 20 },
  retakeText: { color: '#FF6B35', fontSize: 14 },
  btn: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  statusBox: {
    marginTop: 20, borderRadius: 12, padding: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  statusDone: { backgroundColor: '#dcfce7' },
  statusFailed: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 16, fontWeight: '600', color: '#333' },
  statusSub: { fontSize: 14, color: '#555', marginTop: 4 },
});
