import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const SIGN_OUT_BROWN = '#4A2C1A';
const PILL = 999;

interface SettingsItemProps {
  icon: IoniconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  theme: typeof Colors.light;
}

function SettingsItem({ icon, label, subtitle, onPress, theme }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.settingsIconWrap, { backgroundColor: theme.background }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, { color: theme.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

interface SignOutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  theme: typeof Colors.light;
}

function SignOutModal({ visible, onCancel, onConfirm, theme }: SignOutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.modalCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <View style={[styles.modalIconWrap, { backgroundColor: theme.background }]}>
            <Ionicons name="log-out-outline" size={28} color={SIGN_OUT_BROWN} />
          </View>

          <Text style={[styles.modalTitle, { color: theme.text }]}>Sign out?</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
            You will need to sign in again to access your CacaoScan account.
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: theme.border }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSignOutBtn}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSignOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, userRole, signOut } = useAuth();
  const router = useRouter();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const displayName = user?.user_metadata?.full_name || 'Farmer';
  const farmLocation = user?.user_metadata?.farm_location || 'Not set';

  async function handleSignOutConfirm() {
    setShowSignOutModal(false);
    try {
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
              {user?.email || 'No email'}
            </Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: userRole === 'admin' ? theme.infoBg : theme.successBg },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: userRole === 'admin' ? theme.info : theme.success },
                ]}
              >
                {userRole === 'admin' ? 'Admin' : 'Farmer'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>FARM</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="location-outline"
            label="Farm Location"
            subtitle={farmLocation}
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="person-outline"
            label="Edit Profile"
            subtitle="Name, contact details"
            onPress={() => {}}
            theme={theme}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MACHINE</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="construct-outline"
            label="Manual Override"
            subtitle="Servo control, conveyor speed"
            onPress={() => router.push('/manual-override' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="scan-outline"
            label="Vision Calibration"
            subtitle="Set focal point, camera settings"
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="hardware-chip-outline"
            label="Hardware Monitor"
            subtitle="ESP32 battery, Wi-Fi signal"
            onPress={() => {}}
            theme={theme}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APP</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="notifications-outline"
            label="Notifications"
            subtitle="Push alerts, thresholds"
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="information-circle-outline"
            label="About CacaoScan"
            subtitle="Version 1.0.0"
            onPress={() => {}}
            theme={theme}
          />
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => setShowSignOutModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <SignOutModal
        visible={showSignOutModal}
        onCancel={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Palette.cream,
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
  profileEmail: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: PILL,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  settingsGroup: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  settingsSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },

  signOutButton: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing['2xl'],
    height: 52,
    borderRadius: PILL,
    backgroundColor: SIGN_OUT_BROWN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.darkCacao,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    color: Palette.cream,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: Palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    zIndex: 1,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: PILL,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  modalSignOutBtn: {
    flex: 1,
    height: 48,
    borderRadius: PILL,
    backgroundColor: SIGN_OUT_BROWN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSignOutText: {
    color: Palette.cream,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
