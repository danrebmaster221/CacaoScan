import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase';
import { PASSWORD_RULES, validatePassword, getStrengthInfo } from '@/utils/password-validator';

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [logoutAllDevices, setLogoutAllDevices] = useState(true);

  const passwordValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const strengthInfo = useMemo(() => getStrengthInfo(passwordValidation.strength), [passwordValidation.strength]);

  const handleUpdatePassword = async () => {
    if (!passwordValidation.isValid) {
      return Alert.alert('Error', 'Password does not meet security requirements.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'New passwords do not match.');
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert('Success', 'Password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView>
        <Stack.Screen 
          options={{ 
            title: 'Security', 
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            headerShown: false,
          }} 
        />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: theme.accent }}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Password Management</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Keep your account secure. Ensure your password is known only to authorized and trusted farm managers.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CURRENT PASSWORD</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, paddingRight: 48 }
              ]}
              placeholder="Enter your current password"
              placeholderTextColor={theme.textSecondary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 16, height: 50, justifyContent: 'center' }}
              onPress={() => setShowCurrent(!showCurrent)}
            >
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.lg }]}>NEW PASSWORD</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, paddingRight: 48 }
              ]}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 16, height: 50, justifyContent: 'center' }}
              onPress={() => setShowNew(!showNew)}
            >
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {newPassword.length > 0 && (
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

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.lg }]}>CONFIRM NEW PASSWORD</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, paddingRight: 48 }
              ]}
              placeholder="Retype new password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 16, height: 50, justifyContent: 'center' }}
              onPress={() => setShowConfirm(!showConfirm)}
            >
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && (
            <Text
              style={[
                styles.matchText,
                { color: newPassword === confirmPassword ? theme.success : theme.danger }
              ]}
            >
              {newPassword === confirmPassword ? '✓ Password Matched' : '✗ Passwords do not match'}
            </Text>
          )}

          <View style={styles.logoutRow}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[styles.logoutLabel, { color: theme.text }]}>Logout of all devices</Text>
              <Text style={[styles.logoutDesc, { color: theme.textSecondary }]}>
                End all other active sessions for this account to maintain strict access control.
              </Text>
            </View>
            <Switch
              value={logoutAllDevices}
              onValueChange={setLogoutAllDevices}
              trackColor={{ true: theme.primary, false: theme.border }}
            />
          </View>

          <TouchableOpacity 
            style={[
              styles.saveBtn, 
              { backgroundColor: theme.primary },
              (isUpdating || !passwordValidation.isValid || newPassword !== confirmPassword) && { opacity: 0.6 }
            ]}
            onPress={handleUpdatePassword}
            disabled={isUpdating || !passwordValidation.isValid || newPassword !== confirmPassword}
          >
            <Text style={styles.saveBtnText}>
              {isUpdating ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: 48,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },
  formCard: {
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.medium,
  },
  saveBtn: {
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
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
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.5)',
  },
  logoutLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 4,
  },
  logoutDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 18,
  },
});
