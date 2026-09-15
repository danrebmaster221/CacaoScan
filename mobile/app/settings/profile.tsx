import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Palette } from '@/constants/theme';
import { sanitizeInput } from '@/utils/security';
import {
  StickyHeader,
  Card,
  FieldLabel,
  FieldInput,
  BrownButton,
} from '@/components/redesign/ui';

export default function EditProfileScreen() {
  const { userProfile, user, signOut } = useAuth();
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
      if (updateError) throw updateError;

      try {
        await supabase.from('profiles').upsert(
          { id: user?.id, first_name: cleanFirst, last_name: cleanLast },
          { onConflict: 'id' }
        );
      } catch {
        // ignore
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Logout of All Devices?',
      'This will revoke sessions. You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StickyHeader
        title="Edit Profile"
        subtitle="Manage your account credentials, update your password, and control your active sessions."
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        <Card>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <FieldLabel>First Name</FieldLabel>
          <FieldInput value={firstName} onChangeText={setFirstName} />
          <FieldLabel>Last Name</FieldLabel>
          <FieldInput value={lastName} onChangeText={setLastName} />
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.cardTitle}>Change Password</Text>
          <Text style={styles.hint}>Leave blank if you don&apos;t want to change your password.</Text>
          <FieldLabel>New Password</FieldLabel>
          <View style={styles.pwWrap}>
            <FieldInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPw}
              placeholder="Enter a new password"
              style={{ paddingRight: 48 }}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowNewPw((s) => !s)}>
              <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Palette.disabled} />
            </TouchableOpacity>
          </View>
          <FieldLabel>Confirm Password</FieldLabel>
          <View style={styles.pwWrap}>
            <FieldInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPw}
              placeholder="Re-enter new password"
              style={{ paddingRight: 48 }}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowConfirmPw((s) => !s)}>
              <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Palette.disabled} />
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.cardTitle}>Security</Text>
          <TouchableOpacity style={styles.logoutAll} onPress={handleLogoutAll}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.logoutTitle}>Logout of All Devices</Text>
              <Text style={styles.hint}>Revoke all active sessions for this account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.disabled} />
          </TouchableOpacity>
        </Card>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.ok}>{success}</Text>}

        <View style={{ marginTop: Spacing.lg }}>
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <BrownButton title="Save Changes" onPress={handleSaveProfile} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  cardTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  hint: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  pwWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 14, top: 14 },
  logoutAll: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  logoutTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.light.danger },
  error: { marginTop: 12, color: Colors.light.danger },
  ok: { marginTop: 12, color: Colors.light.success },
});
