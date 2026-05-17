import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { login, register, setToken, setAdmin } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    try {
      const res = isRegister
        ? await register(email, password)
        : await login(email, password);
      await setToken(res.data.access_token);
      await setAdmin(res.data.is_admin || false);
      navigation.replace('Main');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>🍽️ EatApp</Text>
      <Text style={styles.subtitle}>Find what you want to eat</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '...' : isRegister ? 'Sign up' : 'Sign in'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.toggle}>
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { fontSize: 42, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, marginBottom: 12, fontSize: 16,
  },
  btn: {
    backgroundColor: '#FF6B35', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { textAlign: 'center', color: '#FF6B35', marginTop: 16 },
});
