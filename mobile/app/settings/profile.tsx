import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { sanitizeInput } from '@/utils/security';

export default function EditProfileScreen() {
  const { userProfile, user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const meta = user?.user_metadata;
  const [firstName, setFirstName] = useState(meta?.first_name || userProfile?.first_name || '');
  const [lastName, setLastName] = useState(meta?.last_name || userProfile?.last_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    const cleanFirst = sanitizeInput(firstName).trim();
    const cleanLast = sanitizeInput(lastName).trim();
    if (!cleanFirst || !cleanLast) {
      setError('First name and last name are required.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 12) {
        setError('Password must be at least 12 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Save to auth user_metadata (primary — always works)
      const updatePayload: any = {
        data: {
          first_name: cleanFirst,
          last_name: cleanLast,
          farm_location: meta?.farm_location || userProfile?.farm_location,
          role: meta?.role || 'farmer',
        },
      };
      if (newPassword) updatePayload.password = newPassword;

      const { error: updateError } = await supabase.auth.updateUser(updatePayload);
      if (updateError) {
        if (updateError.message.includes('different from the old password') || updateError.message.includes('same password')) {
          // Re-attempt without password
          const { error: retryError } = await supabase.auth.updateUser({
            data: updatePayload.data,
          });
          if (retryError) throw retryError;
          setSuccess('Profile updated! (Password unchanged — same as current.)');
        } else {
          throw updateError;
        }
      } else {
        setSuccess('Profile updated successfully!');
      }

      // Fallback: also try profiles table
      try {
        await supabase.from('profiles').upsert({
          id: user?.id,
          first_name: cleanFirst,
          last_name: cleanLast,
        }, { onConflict: 'id' });
      } catch {
        // Silently ignore
      }

      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      router.replace('/(auth)/login' as any);
    } catch {
      setError('Failed to sign out of all devices.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Edit Profile', headerShadowVisible: false }} />
      <View style={styles.container}>

        {error && (
          <View style={[styles.alert, { backgroundColor: theme.dangerBg }]}>  
            <Text style={[styles.alertText, { color: theme.danger }]}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.alert, { backgroundColor: theme.successBg }]}>
            <Text style={[styles.alertText, { color: theme.success }]}>{success}</Text>
          </View>
        )}

        {/* Name Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>First Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Last Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
            />
          </View>
        </View>

        {/* Password Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            Leave blank if you don&apos;t want to change your password.
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPw}
                placeholder="Min 12 characters"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPw(!showNewPw)}>
                <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPw}
                placeholder="Re-enter new password"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPw(!showConfirmPw)}>
                <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && (
              <Text style={{ color: newPassword === confirmPassword ? theme.success : theme.danger, fontSize: Typography.fontSize.xs, marginTop: 4, fontFamily: Typography.fontFamily.medium }}>
                {newPassword === confirmPassword ? '\u2713 Passwords match' : '\u2717 Passwords do not match'}
              </Text>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Security</Text>
          <TouchableOpacity style={[styles.logoutRow, { borderBottomColor: theme.border }]} onPress={handleLogoutAllDevices}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.logoutLabel, { color: theme.danger }]}>Logout of All Devices</Text>
              <Text style={[styles.logoutDesc, { color: theme.textSecondary }]}>Revoke all active sessions for this account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
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
  section: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingRight: 48,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 13,
    padding: 4,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logoutLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  logoutDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  buttonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
