import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { useLocationSearch, LocationResult } from '@/hooks/use-location-search';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { sanitizeInput } from '@/utils/security';

export default function LocationSettingsScreen() {
  const { userProfile, user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const [location, setLocation] = useState(userProfile?.farm_location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { results, searchLocation, clearResults, loading: searchLoading } = useLocationSearch();
  const [showResults, setShowResults] = useState(false);

  const handleLocationChange = (text: string) => {
    setLocation(text);
    setSuccess(false);
    setError(null);
    if (text.length > 2) {
      searchLocation(text);
      setShowResults(true);
    } else {
      clearResults();
      setShowResults(false);
    }
  };

  const handleSelectLocation = (loc: LocationResult) => {
    setLocation(loc.display_name);
    clearResults();
    setShowResults(false);
  };

  const handleSave = async () => {
    const cleanLocation = sanitizeInput(location).trim();
    if (!cleanLocation) {
      setError('Location cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ farm_location: cleanLocation })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      setSuccess(true);
      
      // Optionally pop back after a moment
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to update location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ title: 'Farm Location', headerShadowVisible: false }} />
      <View style={styles.container}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Update your farm&apos;s registered address or coordinates. Operations and batch certificates will use this location for traceability.
        </Text>

        {error && (
          <View style={[styles.alert, { backgroundColor: theme.dangerBg }]}>
            <Text style={[styles.alertText, { color: theme.danger }]}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.alert, { backgroundColor: theme.successBg }]}>
            <Text style={[styles.alertText, { color: theme.success }]}>Location updated successfully!</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Farm Address / Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={location}
            onChangeText={handleLocationChange}
            placeholder="Search farm location..."
          />
          {showResults && (results.length > 0 || searchLoading) && (
            <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {searchLoading ? (
                <ActivityIndicator style={{ padding: Spacing.sm }} color={theme.primary} />
              ) : (
                results.map((loc) => (
                  <TouchableOpacity
                    key={loc.place_id}
                    style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleSelectLocation(loc)}
                  >
                    <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={2}>
                      {loc.display_name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Location</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    flex: 1,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  alert: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  alertText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
    zIndex: 10,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
  },
  dropdown: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    maxHeight: 200,
    overflow: 'hidden',
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  }
});
