import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  PASSWORD_RULES,
  validatePassword,
  getStrengthInfo,
} from '@/utils/password-validator';
import { sanitizeInput, isValidEmail } from '@/utils/security';
import { useLocationSearch, LocationResult } from '@/hooks/use-location-search';
import { StepIndicator } from '@/components/StepIndicator';

export default function RegisterWizardScreen() {
  const { signUp, verifySignupOTP, resendOTP, signInWithGoogle } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpArray, setOtpArray] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCountdown > 0) {
      interval = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  
  // Location API
  const { results, searchLocation, clearResults, loading: locationLoading } = useLocationSearch();
  const [showLocationResults, setShowLocationResults] = useState(false);

  // Step 2: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Validation
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const strengthInfo = useMemo(() => getStrengthInfo(passwordValidation.strength), [passwordValidation.strength]);

  // Handlers
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

  const handleNextStep = () => {
    setError(null);
    const cleanFirst = sanitizeInput(firstName).trim();
    const cleanLast = sanitizeInput(lastName).trim();
    const cleanLocation = sanitizeInput(farmLocation).trim();

    if (!cleanFirst || !cleanLast || !cleanLocation) {
      setError('Please complete all fields before continuing.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    setError(null);
    const cleanFirst = sanitizeInput(firstName).trim();
    const cleanLast = sanitizeInput(lastName).trim();
    const cleanEmail = email.trim();
    const cleanLocation = sanitizeInput(farmLocation).trim();

    if (!cleanEmail || !password.trim()) {
      setError('Please complete all credential fields.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
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
    const { error: signUpError } = await signUp(cleanEmail, password, cleanFirst, cleanLast, cleanLocation);
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
    } else {
      setStep(3);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otpArray];
    newOtp[index] = text.replace(/[^0-9]/g, '').slice(-1);
    setOtpArray(newOtp);

    // Auto-advance focus
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendCountdown(30);
    const { error: resendErr } = await resendOTP(email.trim());
    if (resendErr) {
      setError(resendErr);
      setResendCountdown(0);
    }
  };

  const handleVerifyOTP = async () => {
    setError(null);
    const otpValue = otpArray.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit code exactly as shown in your email.');
      return;
    }

    setLoading(true);
    const { error: verifyError } = await verifySignupOTP(email.trim(), otpValue);
    setLoading(false);

    if (verifyError) {
      setError(verifyError);
    } else {
      // Success! Auto-auth will pick up the session, but forcefully route just in case
      router.replace('/(tabs)' as any);
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
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/login' as any)} 
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: theme.accent }]}>← Back to Login</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            {step === 1 ? 'Personal Info' : step === 2 ? 'Account Credentials' : 'Email Verification'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Step {step} of 3
          </Text>
        </View>

        {/* Step Progress Indicator */}
        <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.md }}>
          <StepIndicator 
            currentStep={step} 
            totalSteps={3} 
            activeColor={theme.accent} 
            inactiveColor={theme.border} 
            labels={['Personal Info', 'Credentials', 'Verification']}
          />
        </View>

        {/* Global Error Banner */}
        {error && (
          <View style={{ backgroundColor: theme.dangerBg, padding: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.md }}>
            <Text style={{ color: theme.danger, textAlign: 'center', fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
              {error}
            </Text>
          </View>
        )}

        {/* Form Wizard */}
        {step === 1 ? (
          // ─── STEP 1 ──────────────────────────────────────────────
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Juan"
                placeholderTextColor={theme.disabled}
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="name-given"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Last Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Dela Cruz"
                placeholderTextColor={theme.disabled}
                value={lastName}
                onChangeText={setLastName}
                autoComplete="name-family"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Farm Location *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Search farm location..."
                placeholderTextColor={theme.disabled}
                value={farmLocation}
                onChangeText={handleLocationChange}
              />
              {/* Location Autocomplete Results */}
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

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={handleNextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Next Step</Text>
            </TouchableOpacity>
          </View>
        ) : step === 2 ? (
          // ─── STEP 2 ──────────────────────────────────────────────
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="juan@example.com"
                placeholderTextColor={theme.disabled}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password *</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, paddingRight: 48 }]}
                  placeholder="Minimum 12 characters"
                  placeholderTextColor={theme.disabled}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm Password *</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, paddingRight: 48 }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.disabled}
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
              
            {/* Positive/Negative Match Indicator */}
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

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.previousButton, { borderColor: theme.primary }]}
              onPress={() => setStep(1)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Previous Step</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.primary, flex: 1 },
                (loading || !passwordValidation.isValid || password !== confirmPassword) && styles.actionButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF8F0" />
              ) : (
                <Text style={styles.actionButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          </View>
        ) : (
          // ─── STEP 3 ──────────────────────────────────────────────
          <View style={[styles.formSection, { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['2xl'] }]}>
            <Ionicons name="mail-open-outline" size={72} color={theme.accent} style={{ marginBottom: Spacing.xl }} />
            <Text style={[styles.title, { color: theme.text, textAlign: 'center', marginBottom: Spacing.md }]}>Verify Your Email</Text>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.regular, lineHeight: 22 }}>
              We&apos;ve sent a 6-digit confirmation code to {email}. Enter it below to secure your account.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, width: '100%', justifyContent: 'center' }}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <TextInput
                  key={index}
                  ref={(r) => { otpRefs.current[index] = r; }}
                  style={{
                    width: 48,
                    height: 56,
                    backgroundColor: theme.surface,
                    borderColor: otpArray[index] ? theme.primary : theme.border,
                    borderWidth: 2,
                    borderRadius: Radius.md,
                    fontSize: 24,
                    textAlign: 'center',
                    fontFamily: Typography.fontFamily.bold,
                    color: theme.text,
                  }}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={otpArray[index]}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                />
              ))}
            </View>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary, width: '100%' }, loading && styles.actionButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading || otpArray.join('').length < 6}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF8F0" />
              ) : (
                <Text style={styles.actionButtonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'transparent', width: '100%', borderColor: theme.border, borderWidth: 1, marginTop: Spacing.md, height: 52 }]}
              onPress={handleResend}
              disabled={resendCountdown > 0 || loading}
            >
              <Text style={{ color: resendCountdown > 0 ? theme.textSecondary : theme.text, fontFamily: Typography.fontFamily.medium }}>
                {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : 'Resend Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: Spacing.xl }}
              onPress={() => router.replace('/(auth)/login' as any)}
            >
              <Text style={{ color: theme.textSecondary, fontFamily: Typography.fontFamily.medium }}>
                Cancel and return to Login
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Global Google OAuth Section */}
        {step !== 3 && (
          <View style={{ marginTop: Spacing.xl, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, width: '100%' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <Text style={{ marginHorizontal: Spacing.md, color: theme.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium }}>
              OR SIGN UP WITH
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <TouchableOpacity
            style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={signInWithGoogle}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        )}
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
  headerSection: { marginBottom: Spacing.md, marginTop: Spacing.lg },
  backButton: { marginBottom: Spacing.md },
  backText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.xs,
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  previousButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  oauthButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.xl,
  },
});
