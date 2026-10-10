import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
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
import { ESP32Provider } from '@/context/ESP32Context';

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
  const { profilePhase, pendingMFA, passwordRecovery, refreshProfile } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const loading = profilePhase === 'restoring' || profilePhase === 'loadingProfile';

  const inAuthGroup = segments[0] === ('(auth)' as string);
  const isCompleteProfileRoute = inAuthGroup && segments[1] === 'complete-profile';
  const onLogin = inAuthGroup && segments[1] === 'login';
  const onResetPassword = inAuthGroup && segments[1] === 'reset-password';
  const onTabs = segments[0] === ('(tabs)' as string);
  const showSignOutCover = profilePhase === 'signedOut' && !onLogin && (!inAuthGroup || isCompleteProfileRoute);

  useEffect(() => {
    if (passwordRecovery) {
      if (!onResetPassword) router.replace('/(auth)/reset-password' as any);
      return;
    }
    if (loading) return;

    if (profilePhase === 'signedOut') {
      if (!inAuthGroup || isCompleteProfileRoute) {
        router.replace('/(auth)/login' as any);
      }
    } else if (profilePhase === 'incomplete') {
      if (!isCompleteProfileRoute) {
        router.replace('/(auth)/complete-profile' as any);
      }
    } else if (profilePhase === 'ready') {
      if (inAuthGroup && !pendingMFA) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [passwordRecovery, onResetPassword, profilePhase, loading, inAuthGroup, isCompleteProfileRoute, pendingMFA, router]);

  const routeSettled =
    (passwordRecovery && onResetPassword) ||
    (profilePhase === 'signedOut' && inAuthGroup && !isCompleteProfileRoute) ||
    (profilePhase === 'incomplete' && isCompleteProfileRoute) ||
    (profilePhase === 'ready' && onTabs) ||
    profilePhase === 'profileError';

  useEffect(() => {
    if (fontsLoaded && !loading && routeSettled) {
      const timer = setTimeout(() => SplashScreen.hideAsync(), 100);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, loading, routeSettled]);

  async function handleProfileRetry() {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  }

  const showProfileGate = profilePhase === 'profileError' || retrying;

  return (
    <View style={styles.navRoot}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Protected guard={profilePhase === 'ready' && !passwordRecovery}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="manual-override"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack.Protected>
      </Stack>
      {showSignOutCover && (
        <View style={styles.profileGate}>
          <ActivityIndicator color="#6B3F2A" size="large" />
        </View>
      )}
      {showProfileGate && (
        <View style={styles.profileGate}>
          <Text style={styles.profileGateTitle}>Profile unavailable</Text>
          <Text style={styles.profileGateBody}>
            The account profile could not be loaded. The app stays here until that read succeeds.
          </Text>
          <TouchableOpacity
            style={styles.profileGateButton}
            onPress={handleProfileRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color="#FFF8F0" />
            ) : (
              <Text style={styles.profileGateButtonText}>Retry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function RootApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ESP32Provider>
        <ThemeProvider value={colorScheme === 'dark' ? CacaoDarkTheme : CacaoLightTheme}>
          <RootLayoutNav fontsLoaded={fontsLoaded} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ESP32Provider>
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
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
        <CacaoThemeProvider>
          <RootApp fontsLoaded={fontsLoaded} />
        </CacaoThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navRoot: { flex: 1 },
  profileGate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F6F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  profileGateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 8,
  },
  profileGateBody: {
    fontSize: 15,
    color: '#5C4A3A',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileGateButton: {
    backgroundColor: '#6B3F2A',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  profileGateButtonText: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '600',
  },
});

