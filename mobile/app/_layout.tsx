import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';


import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/context/ThemeContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom navigation themes using Cacao Earth palette
const CacaoLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.danger,
  },
};

const CacaoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.danger,
  },
};

function RootLayoutNav() {
  const { session, isLoading, pendingMFA } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === ('(auth)' as string);

    if (!session && !inAuthGroup) {
      // Not signed in → redirect to login
      router.replace('/(auth)/login' as any);
    } else if (session && inAuthGroup && !pendingMFA) {
      // Signed in and MFA complete → redirect to main tabs
      router.replace('/(tabs)' as any);
    }
  }, [session, isLoading, segments, pendingMFA, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="manual-override"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}

function ThemeConsumer() {
  const { activeTheme } = useThemeContext();
  const themeValue = activeTheme === 'dark' ? CacaoDarkTheme : CacaoLightTheme;
  
  return (
    <ThemeProvider value={themeValue}>
      <RootLayoutNav />
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <ThemeConsumer />
      </AuthProvider>
    </AppThemeProvider>
  );
}
