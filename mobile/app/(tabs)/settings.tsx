import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

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

  const displayName = user?.user_metadata?.full_name || 'Farmer';
  const farmLocation = user?.user_metadata?.farm_location || 'Not set';

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
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
        </View>

        {/* Farm Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>FARM</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="📍"
            label="Farm Location"
            subtitle={farmLocation}
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="👤"
            label="Edit Profile"
            subtitle="Name, contact details"
            onPress={() => {}}
            theme={theme}
          />
        </View>

        {/* Machine Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MACHINE</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="🔧"
            label="Manual Override"
            subtitle="Servo control, conveyor speed"
            onPress={() => router.push('/manual-override' as any)}
            theme={theme}
          />
          <SettingsItem
            icon="🎯"
            label="Vision Calibration"
            subtitle="Set focal point, camera settings"
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="📶"
            label="Hardware Monitor"
            subtitle="ESP32 battery, Wi-Fi signal"
            onPress={() => {}}
            theme={theme}
          />
        </View>

        {/* App Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APP</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }, Shadows.sm]}>
          <SettingsItem
            icon="🔔"
            label="Notifications"
            subtitle="Push alerts, thresholds"
            onPress={() => {}}
            theme={theme}
          />
          <SettingsItem
            icon="ℹ️"
            label="About CacaoScan"
            subtitle="Version 1.0.0"
            onPress={() => {}}
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
});
