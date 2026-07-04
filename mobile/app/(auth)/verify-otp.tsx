/**
 * ISO 27001 Control #4 — Multi-Factor Authentication (OTP Verification)
 *
 * This screen appears after successful password authentication.
 * The user must enter a 6-digit OTP code sent to their email inbox.
 * Supabase handles OTP generation and verification server-side.
 *
 * Security Test: Verified that expired OTP codes are rejected,
 * and incorrect codes display generic error messages.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';


const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || '';
  const { verifyOTP } = useAuth();
  const theme = Colors.light;

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleCodeChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = newCode.join('');
      if (fullCode.length === OTP_LENGTH) {
        Keyboard.dismiss();
        handleVerify(fullCode);
      }
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  }

  async function handleVerify(fullCode?: string) {
    const otpCode = fullCode || code.join('');
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert('Incomplete Code', 'Please enter the full 6-digit code.');
      return;
    }

    if (countdown <= 0) {
      Alert.alert('Code Expired', 'Your verification code has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    const { error } = await verifyOTP(email, otpCode);
    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error);
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
    // Success: AuthContext listener will detect session and redirect
  }

  function handleResend() {
    // User needs to go back and re-enter credentials
    Alert.alert(
      'Resend Code',
      'Please sign in again to receive a new verification code.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login' as any) }],
    );
  }

  // Mask email: j***@example.com
  const maskedEmail = email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
    return first + '*'.repeat(Math.min(middle.length, 5)) + domain;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Verification Required</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We sent a 6-digit code to{'\n'}
          <Text style={{ fontFamily: Typography.fontFamily.semiBold }}>{maskedEmail}</Text>
        </Text>

        {/* OTP Inputs */}
        <View style={styles.codeRow}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: digit ? theme.primary : theme.border,
                  color: theme.text,
                },
              ]}
              value={digit}
              onChangeText={(val) => handleCodeChange(index, val)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              maxLength={1}
              keyboardType="number-pad"
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Countdown */}
        <View style={styles.timerRow}>
          {countdown > 0 ? (
            <Text style={[styles.timerText, { color: theme.textSecondary }]}>
              Code expires in <Text style={{ color: countdown > 60 ? theme.success : theme.danger, fontFamily: Typography.fontFamily.semiBold }}>{formatCountdown(countdown)}</Text>
            </Text>
          ) : (
            <Text style={[styles.timerText, { color: theme.danger }]}>
              Code expired
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            { backgroundColor: theme.primary },
            loading && styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={loading || countdown <= 0}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF8F0" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
          <Text style={[styles.resendText, { color: theme.accent }]}>
            Didn&apos;t receive the code? Resend
          </Text>
        </TouchableOpacity>

        {/* Security Badge */}
        <View style={[styles.securityBadge, { backgroundColor: theme.surface }]}>
          <Text style={[styles.securityText, { color: theme.textSecondary }]}>
            🔒 Multi-Factor Authentication • ISO 27001 Compliant
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
  },
  timerRow: { alignItems: 'center', marginBottom: Spacing.xl },
  timerText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular },
  verifyButton: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  resendButton: { alignItems: 'center', paddingVertical: Spacing.sm },
  resendText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
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
