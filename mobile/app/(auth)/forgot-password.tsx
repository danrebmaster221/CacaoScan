/**
 * ISO 27001 Control #12 — Password Reset Security
 *
 * Implements identity verification before password reset:
 * - User enters email → Supabase sends expiring reset link
 * - Generic success message regardless of email existence (Control #8)
 * - Audit log entry created for reset requests (Control #7)
 *
 * Security Test: Verified that non-existent emails show same
 * success message as existing emails (no enumeration).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isValidEmail, sanitizeInput } from '@/utils/security';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    const cleanEmail = sanitizeInput(email).trim();

    if (!cleanEmail) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    await requestPasswordReset(cleanEmail);
    setLoading(false);
    setSent(true);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.accent }]}>← Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔑</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>

          {!sent ? (
            <>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter your registered email address. We&apos;ll send you a secure link to reset your password.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="farmer@example.com"
                  placeholderTextColor={theme.disabled}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: theme.primary },
                  loading && styles.resetButtonDisabled,
                ]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF8F0" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.successCard, { backgroundColor: theme.surface }]}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={[styles.successTitle, { color: theme.text }]}>Check Your Email</Text>
                <Text style={[styles.successText, { color: theme.textSecondary }]}>
                  If an account exists with that email, we&apos;ve sent a password reset link. The link will expire in 1 hour.
                </Text>
                <Text style={[styles.successHint, { color: theme.textSecondary }]}>
                  Don&apos;t forget to check your spam folder.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: theme.primary }]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.resetButtonText}>Return to Login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Security Badge */}
          <View style={[styles.securityBadge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.securityText, { color: theme.textSecondary }]}>
              🔒 Secured with TLS encryption • Expiring reset links
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  backButton: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  iconContainer: { alignItems: 'center', marginBottom: Spacing.md },
  icon: { fontSize: 56 },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  inputGroup: { marginBottom: Spacing.lg },
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
  resetButton: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  resetButtonDisabled: { opacity: 0.7 },
  resetButtonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  successCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successIcon: { fontSize: 48, marginBottom: Spacing.md },
  successTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  successHint: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  securityBadge: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  securityText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular },
});
