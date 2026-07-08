import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useReactNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: async () => {},
  colorScheme: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function CacaoThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useReactNativeColorScheme() ?? 'light';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light'); // User requested Default to light
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedMode = await AsyncStorage.getItem('@cacaoscan_theme_mode');
        if (savedMode && ['system', 'light', 'dark'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        } else {
          // If no mode is saved yet, enforce light mode default and save it
          await AsyncStorage.setItem('@cacaoscan_theme_mode', 'light');
        }
      } catch {
        // Fallback
      } finally {
        setIsReady(true);
      }
    }
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('@cacaoscan_theme_mode', mode);
  };

  const colorScheme = themeMode === 'system' ? systemColorScheme : themeMode;

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
