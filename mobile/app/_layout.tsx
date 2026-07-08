import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { CacaoThemeProvider } from '@/context/ThemeContext';

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

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading, pendingMFA, userProfile, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === ('(auth)' as string);
    const isCompleteProfileRoute = inAuthGroup && segments[1] === 'complete-profile';

    if (!session && !inAuthGroup) {
      // Not signed in → redirect to login
      router.replace('/(auth)/login' as any);
    } else if (session) {
      // Check Boot Guard: Are they authenticated but missing profile details?
      // Primary source: user_metadata (always available, no RLS)
      const meta = user?.user_metadata;
      const hasMetaProfile = meta?.first_name && meta?.last_name && meta?.farm_location;
      const hasTableProfile = userProfile?.first_name && userProfile?.last_name && userProfile?.farm_location;
      const isMissingProfile = !hasMetaProfile && !hasTableProfile;

      if (isMissingProfile) {
        // If they are missing profile data, force them to complete-profile screen
        if (!isCompleteProfileRoute) {
          router.replace('/(auth)/complete-profile' as any);
        }
      } else if (inAuthGroup && !pendingMFA && !isCompleteProfileRoute) {
        // Signed in, complete profile, and MFA complete → redirect to main tabs
        router.replace('/(tabs)' as any);
      }
    }
  }, [session, isLoading, segments, pendingMFA, router, userProfile, user]);

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

function RootApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? CacaoDarkTheme : CacaoLightTheme}>
        <RootLayoutNav fontsLoaded={fontsLoaded} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // SplashScreen hidden in RootLayoutNav after Auth resolution

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <CacaoThemeProvider>
        <RootApp fontsLoaded={fontsLoaded} />
      </CacaoThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

