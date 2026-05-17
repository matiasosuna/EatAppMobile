import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://eatapp-api-zyfv.onrender.com/api/v1';

const api = axios.create({ baseURL: BASE_URL });

let _navRef: any = null;
export function setNavigationRef(ref: any) {
  _navRef = ref;
}

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = (globalThis as any).__eatapp_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear session and redirect to Login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearSession();
      if (_navRef?.isReady()) {
        _navRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    return Promise.reject(error);
  }
);

export async function setToken(token: string) {
  (globalThis as any).__eatapp_token = token;
  await AsyncStorage.setItem('auth_token', token);
}

export async function setAdmin(isAdmin: boolean) {
  (globalThis as any).__eatapp_is_admin = isAdmin;
  await AsyncStorage.setItem('is_admin', isAdmin ? '1' : '0');
}

export function isAdmin(): boolean {
  return !!(globalThis as any).__eatapp_is_admin;
}

export async function loadSession(): Promise<boolean> {
  const token = await AsyncStorage.getItem('auth_token');
  const admin = await AsyncStorage.getItem('is_admin');
  if (token) {
    (globalThis as any).__eatapp_token = token;
    (globalThis as any).__eatapp_is_admin = admin === '1';
    return true;
  }
  return false;
}

export async function clearSession() {
  (globalThis as any).__eatapp_token = null;
  (globalThis as any).__eatapp_is_admin = false;
  await AsyncStorage.multiRemove(['auth_token', 'is_admin']);
}

// Auth
export const register = (email: string, password: string, full_name?: string) =>
  api.post('/auth/register', { email, password, full_name });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

// Search
export interface SearchParams {
  free_text?: string;
  budget_max?: number;
  latitude: number;
  longitude: number;
  radius_km?: number;
  macros?: { calories?: number; protein_g?: number };
  dietary_restrictions?: string[];
}

export const search = (params: SearchParams) =>
  api.post('/search', params);

// Restaurants
export const getRestaurants = (city?: string) =>
  api.get('/restaurants', { params: city ? { city } : {} });

export const triggerScrape = (lat: number, lng: number) =>
  api.post('/restaurants/scrape', null, { params: { lat, lng } });

// Ingestion
export const uploadMenuPhoto = (restaurantId: string, imageUri: string) => {
  const form = new FormData();
  form.append('restaurant_id', restaurantId);
  form.append('file', { uri: imageUri, name: 'menu.jpg', type: 'image/jpeg' } as any);
  return api.post('/ingestion/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getJobStatus = (jobId: string) =>
  api.get(`/ingestion/jobs/${jobId}`);

export const confirmDishes = (jobId: string, dishes: any[]) =>
  api.post(`/ingestion/jobs/${jobId}/confirm`, { dishes });

export const createFromMapsUrl = (mapsUrl: string) =>
  api.post('/restaurants/from-maps-url', { maps_url: mapsUrl });

export default api;
