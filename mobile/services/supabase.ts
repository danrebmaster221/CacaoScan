import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web-safe storage: AsyncStorage doesn't work during SSR (no `window`).
// On native, use AsyncStorage. On web, use localStorage wrapper.
function getStorage() {
  if (Platform.OS === 'web') {
    // Return a localStorage-based adapter that's SSR-safe
    return {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    };
  }

  // Native: use AsyncStorage (lazy import to avoid SSR crash)
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
