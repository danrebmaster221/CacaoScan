import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AboutCacaoScanScreen() {
  const theme = Colors.light;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'About CacaoScan', headerShadowVisible: false }} />
      <View style={styles.container}>

        {/* App Identity */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
              <Text style={styles.logoText}>CS</Text>
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>CacaoScan</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              AI-Powered Cacao Bean Quality Grading System
            </Text>
          </View>
        </View>

        {/* Version Info */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>System Information</Text>
          <InfoRow label="App Version" value="1.0.0" />
          <InfoRow label="Build" value="2026.07.07" />
          <InfoRow label="Platform" value="React Native (Expo)" />
          <InfoRow label="AI Model" value="YOLOv8 Custom" />
          <InfoRow label="Hardware" value="ESP32-CAM Module" />
        </View>

        {/* Compliance */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Compliance &amp; Standards</Text>
          <InfoRow label="Data Security" value="ISO 27001 Aligned" />
          <InfoRow label="Quality Standard" value="PNS/BAFS 58:2019" />
          <InfoRow label="Authentication" value="MFA + Lockout" />
          <InfoRow label="Audit Logging" value="Enabled" />
        </View>

        {/* Credits */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Developers</Text>
          <Text style={[styles.creditText, { color: theme.textSecondary }]}>
            CacaoScan was developed as a capstone project for Zamboanga City State Polytechnic College (ZCSPC).
          </Text>
          <Text style={[styles.creditText, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
            Designed to support Filipino cacao farmers with automated quality grading powered by computer vision and IoT.
          </Text>
        </View>

        {/* Links */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <TouchableOpacity
            style={[styles.linkRow, { borderBottomColor: theme.border }]}
            onPress={() => Linking.openURL('https://github.com/danrebmaster221/CacaoScan')}
          >
            <Ionicons name="logo-github" size={20} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>View on GitHub</Text>
            <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          &copy; 2026 CacaoScan. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    color: '#FFF8F0',
    fontSize: 28,
    fontFamily: Typography.fontFamily.bold,
  },
  appName: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  creditText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  linkText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
});
