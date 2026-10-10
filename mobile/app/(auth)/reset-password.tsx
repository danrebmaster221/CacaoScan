import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PASSWORD_RULES, validatePassword } from '@/utils/password-validator';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { passwordRecovery, recoveryExchangePending, updateRecoveredPassword } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const canSave = passwordValidation.isValid && password === confirmPassword && !loading;

  async function handleSave() {
    if (!passwordRecovery || loading) return;
    setError(null);
    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await updateRecoveredPassword(password);
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
    router.replace('/(auth)/login' as any);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.keyboardContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={64}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Choose a new password</Text>

          {recoveryExchangePending && !passwordRecovery ? (
            <ActivityIndicator color={theme.primary} style={styles.spinner} />
          ) : !passwordRecovery ? (
            <>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                This reset link is invalid or has expired.
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={() => router.replace('/(auth)/forgot-password' as any)}
              >
                <Text style={styles.buttonText}>Forgot Password</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Use a password that meets every requirement below.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
              <View style={styles.fieldWrap}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  placeholder="New password"
                  placeholderTextColor={theme.disabled}
                />
                <TouchableOpacity style={styles.eye} onPress={() => setShowPassword((current) => !current)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>
              <View style={styles.fieldWrap}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.disabled}
                />
                <TouchableOpacity style={styles.eye} onPress={() => setShowConfirmPassword((current) => !current)}>
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.rules}>
                {PASSWORD_RULES.map((rule) => {
                  const passed = passwordValidation.passedRules.includes(rule.id);
                  return (
                    <Text key={rule.id} style={{ color: passed ? theme.success : theme.textSecondary, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs }}>
                      {passed ? '✓' : '○'} {rule.label}
                    </Text>
                  );
                })}
                {confirmPassword.length > 0 && (
                  <Text style={{ color: password === confirmPassword ? theme.success : theme.danger, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
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
              >
                {loading ? <ActivityIndicator color="#FFF8F0" /> : <Text style={styles.buttonText}>Update Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  keyboardContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  spinner: { marginTop: Spacing.xl },
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
    paddingRight: 48,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
  },
  eye: { position: 'absolute', right: 16, height: 52, justifyContent: 'center' },
  rules: { gap: 4, marginBottom: Spacing.lg },
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
