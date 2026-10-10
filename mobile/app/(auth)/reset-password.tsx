import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PASSWORD_RULES, validatePassword } from '@/utils/password-validator';
import { AlertCircleIcon, LockIcon } from '@/components/auth/AuthIcons';
import { AuthRecoveryFrame } from '@/components/auth/AuthRecoveryFrame';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { passwordRecovery, recoveryExchangePending, updateRecoveredPassword } = useAuth();
  const theme = Colors[useColorScheme() ?? 'light'];
  const confirmPasswordRef = useRef<TextInput>(null);
  const saveLockRef = useRef(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const canSave = passwordValidation.isValid && password === confirmPassword && !loading;

  async function handleSave() {
    if (saveLockRef.current) return;
    if (!passwordRecovery) return;
    setError(null);
    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    saveLockRef.current = true;
    setLoading(true);
    let succeeded = false;
    try {
      const result = await updateRecoveredPassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      succeeded = true;
      setPassword('');
      setConfirmPassword('');
      router.replace('/(auth)/login' as any);
    } finally {
      if (!succeeded) {
        setLoading(false);
        saveLockRef.current = false;
      }
    }
  }

  return (
    <AuthRecoveryFrame backgroundColor={theme.background}>
      {recoveryExchangePending && !passwordRecovery ? (
        <ActivityIndicator color={theme.primary} style={styles.spinner} />
      ) : !passwordRecovery ? (
        <View style={styles.stateBlock}>
          <View style={[styles.iconContainer, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
            <AlertCircleIcon size={32} color={theme.danger} accent={theme.danger} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Reset link expired</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            This reset link is invalid or has expired.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={() => {
              router.replace('/(auth)/forgot-password' as any);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Request another reset link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={() => {
              router.replace('/(auth)/login' as any);
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.iconContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <LockIcon size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Choose a new password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Use a password that meets every requirement below.
          </Text>

          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                placeholder="New password"
                placeholderTextColor={theme.disabled}
              />
              <TouchableOpacity
                style={styles.eye}
                onPress={() => setShowPassword((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>
            <View style={styles.fieldWrap}>
              <TextInput
                ref={confirmPasswordRef}
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="Confirm new password"
                placeholderTextColor={theme.disabled}
              />
              <TouchableOpacity
                style={styles.eye}
                onPress={() => setShowConfirmPassword((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rules}>
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
            {confirmPassword.length > 0 && (
              <Text style={[styles.matchText, { color: password === confirmPassword ? theme.success : theme.danger }]}>
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            )}
          </View>

          {error && (
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, !canSave && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: loading }}
          >
            {loading ? <ActivityIndicator color="#FFF8F0" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </TouchableOpacity>
        </>
      )}
    </AuthRecoveryFrame>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: Spacing.xl },
  stateBlock: { flexGrow: 1, justifyContent: 'center' },
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
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  fieldWrap: { marginBottom: Spacing.md },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingRight: 56,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
  },
  eye: {
    position: 'absolute',
    right: 4,
    top: 2,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rules: { gap: 4, marginBottom: Spacing.lg },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ruleIcon: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, width: 16 },
  ruleText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, flex: 1 },
  matchText: {
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
  error: {
    textAlign: 'center',
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
  },
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  secondaryButton: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
