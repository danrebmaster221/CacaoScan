import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useThemeContext, ThemeMode } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';

interface SettingsItemProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  theme: typeof Colors.light;
}

function SettingsItem({ icon, label, subtitle, onPress, danger, theme }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsContent}>
        <Text
          style={[
            styles.settingsLabel,
            { color: danger ? theme.danger : theme.text },
          ]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, userRole, signOut } = useAuth();
  const router = useRouter();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { themeMode, setThemeMode } = useThemeContext();

  const displayName = user?.user_metadata?.full_name || 'Farmer';

  function handleSignOut() {
    setShowSignOutConfirm(true);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }, Shadows.md]}>
          {!user ? (
             <>
               <Skeleton width={56} height={56} borderRadius={28} />
               <View style={styles.profileInfo}>
                 <Skeleton width={140} height={20} style={{ marginBottom: 4 }} />
                 <Skeleton width={180} height={14} style={{ marginBottom: 8 }} />
                 <Skeleton width={60} height={18} />
               </View>
             </>
          ) : (
             <>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
                  {user?.email || 'No email'}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: userRole === 'admin' ? theme.infoBg : theme.successBg }]}>
                  <Text style={[styles.roleText, { color: userRole === 'admin' ? theme.info : theme.success }]}>
                    {userRole === 'admin' ? '🛡️ Admin' : '🌱 Farmer'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Profile & Machine Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PROFILE AND CONFIG</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="👤"
            label="Edit Profile"
            subtitle="Password Management"
            onPress={() => router.push('/settings/edit-profile' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="🔗"
            label="Machine Pairing"
            subtitle="Enter Master PIN to link hardware"
            onPress={() => router.push('/settings/machine-pairing' as any)}
            theme={theme}
          />
        </View>

        {/* Machine Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>HARDWARE MODULES</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="📶"
            label="Hardware Monitor"
            subtitle="Latency, RSSI, and Uptime"
            onPress={() => router.push('/settings/hardware-monitor' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="🎯"
            label="Vision Calibration"
            subtitle="Align physical AI tray target zones"
            onPress={() => router.push('/settings/vision-calibration' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="🔧"
            label="Manual Override"
            subtitle="Direct Servo and Actuator control"
            onPress={() => router.push('/manual-override' as any)}
            theme={theme}
          />
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface, padding: Spacing.md }, Shadows.sm]}>
          <Text style={{ fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: theme.text, marginBottom: Spacing.md }}>
            Application Theme
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: theme.background, borderRadius: Radius.sm, overflow: 'hidden' }}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
              const isActive = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.sm,
                    alignItems: 'center',
                    backgroundColor: isActive ? theme.primary : 'transparent',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: Typography.fontSize.sm,
                    fontFamily: isActive ? Typography.fontFamily.semiBold : Typography.fontFamily.medium,
                    color: isActive ? '#FFF8F0' : theme.textSecondary,
                    textTransform: 'capitalize'
                  }}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APP SYSTEM</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="🔔"
            label="Notifications"
            subtitle="Predictive thresholds and bounds"
            onPress={() => router.push('/settings/notifications' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="ℹ️"
            label="About CacaoScan"
            subtitle="System Metadata & Versioning"
            onPress={() => router.push('/settings/about' as any)}
            theme={theme}
          />
        </View>

        {/* Sign Out */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface, marginBottom: Spacing['2xl'] }, Shadows.sm]}>
          <SettingsItem
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            danger
            theme={theme}
          />
        </View>
      </ScrollView>

      {/* Cross-Platform Confirm Sign Out Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sign Out</Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Are you sure you want to sign out of the CacaoScan system?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.border }]}
                onPress={() => setShowSignOutConfirm(false)}
              >
                <Text style={{ fontFamily: Typography.fontFamily.semiBold, color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.danger }]}
                onPress={() => {
                  setShowSignOutConfirm(false);
                  signOut();
                }}
              >
                <Text style={{ fontFamily: Typography.fontFamily.semiBold, color: '#FFF' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: '#FFF8F0',
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
    borderRadius: Radius.sm,
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
  settingsIcon: {
    fontSize: 20,
    width: 32,
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
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
  },
  modalDesc: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
