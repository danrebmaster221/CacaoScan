import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  PASSWORD_RULES,
  validatePassword,
  getStrengthInfo,
} from '@/utils/password-validator';
import { sanitizeInput } from '@/utils/security';
import { useLocationSearch, LocationResult } from '@/hooks/use-location-search';
import { StepIndicator } from '@/components/StepIndicator';

export default function CompleteProfileScreen() {
  const { user, completeGoogleProfile, signOut } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Info
  const [email] = useState(user?.email || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');

  // Location API
  const { results, searchLocation, clearResults, loading: locationLoading } = useLocationSearch();
  const [showLocationResults, setShowLocationResults] = useState(false);

  // Password Setup (For Web Dashboard Access)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Attempt to prefill from Google metadata if available
    if (user?.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  // Password Validation
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const strengthInfo = useMemo(() => getStrengthInfo(passwordValidation.strength), [passwordValidation.strength]);

  const handleLocationChange = (text: string) => {
    setFarmLocation(text);
    if (text.length > 2) {
      searchLocation(text);
      setShowLocationResults(true);
    } else {
      clearResults();
      setShowLocationResults(false);
    }
  };

  const handleSelectLocation = (loc: LocationResult) => {
    setFarmLocation(loc.display_name);
    clearResults();
    setShowLocationResults(false);
  };

  const handleSubmit = async () => {
    setError(null);
    const cleanFirst = sanitizeInput(firstName).trim();
    const cleanLast = sanitizeInput(lastName).trim();
    const cleanLocation = sanitizeInput(farmLocation).trim();

    if (!cleanFirst || !cleanLast || !cleanLocation) {
      setError('Please complete all profile fields.');
      return;
    }

    // Only strictly require password if they want to access web later,
    // but the system design proposed forcing it to bridge across platforms.
    if (!password.trim()) {
      setError('Please set a web access password.');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: completeError } = await completeGoogleProfile(
      cleanFirst,
      cleanLast,
      cleanLocation,
      password
    );
    setLoading(false);

    if (completeError) {
      setError(completeError);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Profile completed! You can now log into the mobile app and web dashboard.');
        router.replace('/(tabs)' as any);
      } else {
        Alert.alert('Success', 'Profile completed! You can now log into the mobile app and web dashboard.', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)' as any) }
        ]);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.text }]}>Almost there!</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Complete your profile to finish setting up your account. Set a password below so you can also access the Web Dashboard.
          </Text>
        </View>

        {error && (
          <View style={{ backgroundColor: theme.dangerBg, padding: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.md }}>
            <Text style={{ color: theme.danger, textAlign: 'center', fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address (from Google)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#f3f4f6', color: theme.textSecondary, borderColor: theme.border }]}
              value={email}
              editable={false}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Last Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Farm Location *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Search farm location..."
              value={farmLocation}
              onChangeText={handleLocationChange}
            />
            {showLocationResults && (results.length > 0 || locationLoading) && (
              <View style={[styles.locationResults, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {locationLoading ? (
                  <ActivityIndicator style={{ padding: Spacing.sm }} color={theme.primary} />
                ) : (
                  results.map((loc) => (
                    <TouchableOpacity
                      key={loc.place_id}
                      style={[styles.locationResultItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleSelectLocation(loc)}
                    >
                      <Text style={[styles.locationResultText, { color: theme.text }]} numberOfLines={2}>
                        {loc.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Web Access Password</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: Spacing.md }}>
            Set a password for your account so you can log into the CacaoScan Web Dashboard.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Set Password *</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, paddingRight: 48 }]}
                placeholder="Minimum 12 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 16, height: 52, justifyContent: 'center' }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={styles.strengthSection}>
                <View style={[styles.strengthBarBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      { backgroundColor: strengthInfo.color, width: `${passwordValidation.strength}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                  {strengthInfo.label}
                </Text>

                <View style={styles.rulesContainer}>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = passwordValidation.passedRules.includes(rule.id);
                    return (
                      <View key={rule.id} style={styles.ruleRow}>
                        <Text style={[styles.ruleIcon, { color: passed ? theme.success : theme.disabled }]}>
                          {passed ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.ruleText, { color: passed ? theme.success : theme.textSecondary }]}>
                          {rule.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm Password *</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, paddingRight: 48 }]}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 16, height: 52, justifyContent: 'center' }}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {confirmPassword.length > 0 && (
              <Text
                style={[
                  styles.matchText,
                  { color: password === confirmPassword ? theme.success : theme.danger }
                ]}
              >
                {password === confirmPassword ? '✓ Password Matched' : '✗ Passwords do not match'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.primary },
              (loading || !passwordValidation.isValid || password !== confirmPassword || !firstName) && styles.actionButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF8F0" />
            ) : (
              <Text style={styles.actionButtonText}>Save Profile & Finish</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ marginTop: Spacing.xl, alignItems: 'center' }}
            onPress={signOut}
          >
            <Text style={{ color: theme.textSecondary, fontFamily: Typography.fontFamily.medium }}>
              Sign out and return to Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  headerSection: { marginBottom: Spacing.xl, marginTop: Spacing.lg },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },

  formSection: { flex: 1 },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: {
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

  // Location Dropdown
  locationResults: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    maxHeight: 180,
    ...Shadows.sm,
  },
  locationResultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  locationResultText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },

  // Password Strength
  strengthSection: { marginTop: Spacing.sm },
  strengthBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.sm,
  },
  rulesContainer: { gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ruleIcon: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, width: 16 },
  ruleText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular },

  matchText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginTop: Spacing.sm,
  },

  actionButton: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    color: '#374151',
    marginBottom: Spacing.xs,
  }
});
