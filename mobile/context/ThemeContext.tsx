import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: () => {},
  activeTheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeTheme = useNativeColorScheme() ?? 'light';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@theme_mode').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeModeState(val as ThemeMode);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('@theme_mode', mode);
  };

  const activeTheme = themeMode === 'system' ? nativeTheme : themeMode;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
