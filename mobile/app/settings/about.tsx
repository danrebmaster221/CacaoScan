import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Palette } from '@/constants/theme';
import { StickyHeader, Card } from '@/components/redesign/ui';

export default function SystemInformationScreen() {
  const router = useRouter();
  const theme = Colors.light;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const specs = [
    ['AI Architecture', 'Single-Pass YOLOv8n (5 Operational Classes)'],
    ['Framework', 'Ultralytics → TFLite INT8'],
    ['Inference Backend', 'ESP32-S3 On-Device'],
    ['Last Trained', 'June 2026'],
  ];
  const compliance = [
    ['Quality Standard', 'PNS/BAFS 58:2019'],
    ['Data Security', 'ISO 27001 Aligned'],
    ['Authentication', 'MFA + Lockout'],
    ['Audit Logging', 'Enabled'],
    ['Session Policy', '15min Timeout'],
  ];
  const team = ['Felixandra P. Malicay', 'Alshaik M. Hassan', 'Alfahad L. Adian'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StickyHeader
        title="About CacaoScan"
        subtitle="View application version details, AI framework specifications, and regulatory compliance information."
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        <Card style={styles.centerCard}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CS</Text>
          </View>
          <Text style={styles.appName}>CacaoScan</Text>
          <Text style={styles.version}>v1.0.0</Text>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.sectionHead}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Overview</Text>
          </View>
          <Text style={styles.overview}>
            An AI-powered cacao bean quality grading and sorting system that integrates computer vision with IoT hardware
            for automated classification based on Philippine National Standards (PNS/BAFS 58:2019). Built to support
            Filipino cacao farmers with real-time sorting, batch management, and predictive analytics.
          </Text>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.sectionHead}>
            <Ionicons name="rocket-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>AI Engine Specs</Text>
          </View>
          {specs.map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.sectionHead}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.success} />
            <Text style={styles.sectionTitle}>Regulatory Compliance</Text>
          </View>
          {compliance.map(([k, v]) => (
            <InfoRow key={k} label={k} value={v} />
          ))}
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.sectionHead}>
            <Ionicons name="people-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Research and Development Team</Text>
          </View>
          {team.map((name) => (
            <View key={name} style={styles.member}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name[0]}</Text>
              </View>
              <Text style={styles.memberName}>{name}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.footer}>© 2026 CacaoScan. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  centerCard: { alignItems: 'center', paddingVertical: 28 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.chocolate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 24, fontFamily: Typography.fontFamily.bold },
  appName: { marginTop: 16, fontSize: 26, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  version: { marginTop: 4, fontSize: 14, color: Colors.light.textSecondary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  overview: { fontSize: 14, lineHeight: 22, color: '#7a6555' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1e9e0',
  },
  infoLabel: { fontSize: 14, color: Colors.light.textSecondary, flex: 1 },
  infoValue: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.light.text, textAlign: 'right', flex: 1.2 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.chocolate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: 16 },
  memberName: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.light.text },
  footer: { textAlign: 'center', marginTop: Spacing.lg, fontSize: 13, color: Colors.light.textSecondary },
});
