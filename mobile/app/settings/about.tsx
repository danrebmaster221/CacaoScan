import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SystemInformationScreen() {
  const router = useRouter();
  const theme = Colors.light;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>About CacaoScan</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          View application version details, AI framework specifications, and regulatory compliance information.
        </Text>

        {/* App Identity Header */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
              <Text style={styles.logoText}>CS</Text>
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>CacaoScan</Text>
            <Text style={[styles.version, { color: theme.textSecondary }]}>v1.0.0</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          </View>
          <Text style={[styles.projectDesc, { color: theme.textSecondary }]}>
            An AI-powered cacao bean quality grading and sorting system that integrates computer vision with IoT hardware for automated classification based on Philippine National Standards (PNS/BAFS 58:2019). Built to support Filipino cacao farmers with real-time sorting, batch management, and predictive analytics.
          </Text>
        </View>

        {/* AI Engine Specs */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="rocket-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Engine Specs</Text>
          </View>
          <InfoRow label="Model A (Detector)" value="YOLOv8n Custom" />
          <InfoRow label="Model B (Classifier)" value="YOLOv8-cls Custom" />
          <InfoRow label="Framework" value="Ultralytics + ONNX" />
          <InfoRow label="Inference Backend" value="FastAPI (Hugging Face)" />
          <InfoRow label="Last Trained" value="June 2026" />
        </View>

        {/* Regulatory Compliance */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.success} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Regulatory Compliance</Text>
          </View>
          <InfoRow label="Quality Standard" value="PNS/BAFS 58:2019" />
          <InfoRow label="Data Security" value="ISO 27001 Aligned" />
          <InfoRow label="Authentication" value="MFA + Lockout" />
          <InfoRow label="Audit Logging" value="Enabled" />
          <InfoRow label="Session Policy" value="15min Timeout" />
        </View>

        {/* Research & Development Team */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Research and Development Team</Text>
          </View>

          <View style={styles.teamList}>
            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.memberInitial}>F</Text>
              </View>
              <Text style={[styles.memberName, { color: theme.text }]}>Felixandra P. Malicay</Text>
            </View>
            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.memberInitial}>A</Text>
              </View>
              <Text style={[styles.memberName, { color: theme.text }]}>Alshaik M. Hassan</Text>
            </View>
            <View style={styles.teamMember}>
              <View style={[styles.memberAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.memberInitial}>A</Text>
              </View>
              <Text style={[styles.memberName, { color: theme.text }]}>Alfahad L. Adian</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          &copy; 2026 CacaoScan. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  header: { paddingTop: 64, paddingBottom: Spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  backText: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.medium },
  description: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.lg, lineHeight: 20 },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  logoSection: { alignItems: 'center', marginBottom: Spacing.lg },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  logoText: { color: '#FFF8F0', fontSize: 28, fontFamily: Typography.fontFamily.bold },
  appName: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  version: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  projectDesc: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, flex: 1 },
  infoValue: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold, textAlign: 'right' },
  teamList: { gap: Spacing.md },
  teamMember: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  memberName: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  linkText: { flex: 1, fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  footer: { textAlign: 'center', fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
