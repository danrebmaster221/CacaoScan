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

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isValidEmail } from '@/utils/security';
import { LockIcon, MailIcon, ShieldLockIcon } from '@/components/auth/AuthIcons';
import { AuthRecoveryFrame } from '@/components/auth/AuthRecoveryFrame';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const submitLockRef = useRef(false);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (submitLockRef.current) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    submitLockRef.current = true;
    setEmail(cleanEmail);
    setLoading(true);
    try {
      await requestPasswordReset(cleanEmail);
      setSent(true);
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  function goToLoginFromHeader() {
    router.replace('/(auth)/login' as any);
  }

  function goToLoginFromSuccess() {
    router.replace('/(auth)/login' as any);
  }

  return (
    <AuthRecoveryFrame backgroundColor={theme.background}>
      <TouchableOpacity
        onPress={goToLoginFromHeader}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back to Login"
      >
        <Ionicons name="chevron-back" size={20} color={theme.accent} />
        <Text style={[styles.backText, { color: theme.accent }]}>Back to Login</Text>
      </TouchableOpacity>

      <View style={[styles.iconContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <LockIcon size={32} color={theme.primary} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>

      {!sent ? (
        <>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your registered email address. We&apos;ll send you a secure link to reset your password.
          </Text>

          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="farmer@example.com"
              placeholderTextColor={theme.disabled}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
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
          <View style={[styles.successCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.successIconWrap, { backgroundColor: theme.background }]}>
              <MailIcon size={32} color={theme.primary} />
            </View>
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
            onPress={goToLoginFromSuccess}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>Return to Login</Text>
          </TouchableOpacity>
        </>
      )}

      <View
        style={[
          styles.securityBadge,
          {
            backgroundColor: theme.successBg,
            borderColor: colorScheme === 'dark' ? '#2D4A2D' : '#D4E4D6',
          },
        ]}
      >
        <ShieldLockIcon size={12} color={theme.textSecondary} accent={theme.success} />
        <Text style={[styles.securityText, { color: theme.success }]}>
          Secured with TLS encryption
        </Text>
      </View>
    </AuthRecoveryFrame>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: Spacing.lg,
  },
  backText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
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
    marginBottom: Spacing.lg,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
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
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
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
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  securityText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },
});
