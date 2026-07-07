import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { sanitizeInput } from '@/utils/security';

export default function EditProfileScreen() {
  const { userProfile, user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name: cleanFirst, last_name: cleanLast })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Optionally update password
      if (newPassword) {
        if (newPassword.length < 12) {
          setError('Password must be at least 12 characters.');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) {
          // Gracefully handle "same password" error
          if (pwError.message.includes('different from the old password') || pwError.message.includes('same password')) {
            setSuccess('Profile updated! (Password unchanged — same as current.)');
            setLoading(false);
            return;
          }
          throw pwError;
        }
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Edit Profile', headerShadowVisible: false }} />
      <View style={styles.container}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Update your account name and manage your web access password.
        </Text>

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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Web Password</Text>
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            Leave blank if you don&apos;t want to change your password.
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Min 12 characters"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
            />
            {confirmPassword.length > 0 && (
              <Text style={{ color: newPassword === confirmPassword ? theme.success : theme.danger, fontSize: Typography.fontSize.xs, marginTop: 4, fontFamily: Typography.fontFamily.medium }}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </Text>
            )}
          </View>
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
  description: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.lg,
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
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  buttonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
