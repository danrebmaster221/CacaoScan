import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AboutScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
      <Stack.Screen 
        options={{ 
          title: 'System Metadata', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerShown: false,
        }} 
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: theme.accent }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text, alignSelf: 'flex-start', marginBottom: Spacing.md }]}>About System</Text>
        

        <Text style={[styles.title, { color: theme.text }]}>CacaoScan</Text>
        <Text style={[styles.version, { color: theme.textSecondary }]}>Version 1.0.0</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, marginBottom: Spacing.xl }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Project Overview</Text>
        <View style={styles.divider} />
        <Text style={[styles.bodyText, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
          CacaoScan is an autonomous AIoT ecosystem designed to bridge the gap between traditional manual sorting and industrial-grade automation for Zamboanga City’s cacao cooperatives. By integrating real-time Computer Vision with high-precision physical actuators, the system automates the most labor-intensive stages of post-harvest processing, ensuring consistent quality for international export.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Standards & Compliance</Text>
        <View style={styles.divider} />
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Grading Standard: </Text>
            Aligned with PNS/BAFS 58:2019 (Philippine National Standard for Cacao Beans).
          </Text>
        </View>
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Defect Logic: </Text>
            Evaluates mold, slaty color, and shriveling based on Department of Agriculture (DA-IX) quality thresholds.
          </Text>
        </View>
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Privacy: </Text>
            Compliant with RA 10173 (Data Privacy Act of 2012) regarding harvest metadata and owner logs.
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, marginTop: Spacing.lg }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Inference Engines</Text>
        <View style={styles.divider} />
        
        <View style={styles.modelRow}>
          <Text style={styles.modelIcon}>🔬</Text>
          <View style={styles.modelData}>
            <Text style={[styles.modelName, { color: theme.text }]}>Model A: Variety Classification</Text>
            <Text style={[styles.modelSpec, { color: theme.textSecondary }]}>Architecture: YOLOv8-Variety-v2.1</Text>
            <Text style={[styles.modelSpec, { color: theme.textSecondary, marginTop: 4 }]}>Purpose: Autonomously segregates genetic lineages (Criollo, Forastero, Trinitario) to protect single-origin market value.</Text>
            <Text style={[styles.modelSpec, { color: theme.success, marginTop: 4 }]}>Status: Active Edge Inference</Text>
          </View>
        </View>

        <View style={[styles.divider, { marginVertical: Spacing.md }]} />

        <View style={styles.modelRow}>
          <Text style={styles.modelIcon}>⭐</Text>
          <View style={styles.modelData}>
            <Text style={[styles.modelName, { color: theme.text }]}>Model B: Quality Grading</Text>
            <Text style={[styles.modelSpec, { color: theme.textSecondary }]}>Architecture: YOLOv8-Quality-v1.4</Text>
            <Text style={[styles.modelSpec, { color: theme.textSecondary, marginTop: 4 }]}>Purpose: Identifies visual pathogens and fermentation defects to perform 3-way physical bin routing.</Text>
            <Text style={[styles.modelSpec, { color: theme.success, marginTop: 4 }]}>Status: Active Edge Inference</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, marginTop: Spacing.lg }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>System Logic Modules</Text>
        <View style={styles.divider} />
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Batch-of-Three Staging Protocol: </Text>
            Software logic that synchronizes the conveyor motor and the IR sensors to queue exactly three beans into the vision tower for simultaneous AI analysis.
          </Text>
        </View>
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Sequential Discharge Protocol: </Text>
            Time-multiplexed actuator control that ensures all three beans in a batch are pushed into the sorting rail one-by-one, preventing physical collisions and jams.
          </Text>
        </View>
        
        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Dynamic ROI Calibration: </Text>
            Software-defined coordinate mapping that allows the operator to align the AI detection zones (Regions of Interest) precisely over the physical tray pockets through the app interface.
          </Text>
        </View>

        <View style={styles.complianceRow}>
          <Text style={styles.complianceBullet}>•</Text>
          <Text style={[styles.complianceText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Typography.fontFamily.bold, color: theme.text }}>Decision Fusion Algorithm: </Text>
            The logic that combines the output of Model A (Variety) and Model B (Quality) to determine the final 3-way sorting destination for every individual bean.
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, marginTop: Spacing.lg }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Hardware Topologies</Text>
        <View style={styles.divider} />
        <Text style={[styles.hardwareSpec, { color: theme.textSecondary }]}>• Edge Unit: ESP32-S3 WROOM-1</Text>
        <Text style={[styles.hardwareSpec, { color: theme.textSecondary }]}>• Database: Supabase Regional (Singapore)</Text>
        <Text style={[styles.hardwareSpec, { color: theme.textSecondary }]}>• API Mesh: FastAPI / ASGI</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, marginTop: Spacing.lg, marginBottom: Spacing['3xl'], alignItems: 'center' }, Shadows.sm]}>
        <Text style={[styles.creditsTitle, { color: theme.text }]}>Developed By Tech8</Text>
        <Text style={[styles.creditsSubtitle, { color: theme.textSecondary }]}>Research & Development Team</Text>
        
        <View style={[styles.divider, { width: '100%', marginVertical: Spacing.md }]} />

        <View style={styles.teamContainer}>
          <View style={styles.teamMember}>
            <Text style={[styles.teamName, { color: theme.text }]}>Alshaik M. Hassan</Text>
            <Text style={[styles.teamRole, { color: theme.textSecondary }]}>Lead Systems Programmer & AI Architect</Text>
          </View>
          <View style={styles.teamMember}>
            <Text style={[styles.teamName, { color: theme.text }]}>Felixandra P. Malicay</Text>
            <Text style={[styles.teamRole, { color: theme.textSecondary }]}>Hardware Integration & Documentation</Text>
          </View>
          <View style={styles.teamMember}>
            <Text style={[styles.teamName, { color: theme.text }]}>Alfahad L. Adian</Text>
            <Text style={[styles.teamRole, { color: theme.textSecondary }]}>UI/UX Designer & Prototyping</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  logoWrapper: {
    width: 400,
    height: 250,
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 4,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginBottom: Spacing.sm,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  complianceBullet: {
    fontSize: Typography.fontSize.md,
    marginRight: Spacing.sm,
    marginTop: -2,
    color: '#888',
  },
  complianceText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 20,
  },
  modelRow: {
    flexDirection: 'row',
  },
  modelIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  modelData: {
    flex: 1,
  },
  modelName: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
  },
  modelSpec: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 18,
  },
  hardwareSpec: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: {
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    alignItems: 'center',
  },
  creditsTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  creditsSubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xl,
  },
  teamContainer: {
    width: '100%',
  },
  teamMember: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  teamName: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  teamRole: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  }
});
