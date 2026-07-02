import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Pocket = 'LEFT' | 'CENTER' | 'RIGHT';

interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function VisionCalibrationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [activePocket, setActivePocket] = useState<Pocket>('CENTER');
  const [coords, setCoords] = useState<Record<Pocket, Coordinates>>({
    LEFT: { x: 10, y: 30, w: 20, h: 40 },
    CENTER: { x: 40, y: 35, w: 20, h: 40 },
    RIGHT: { x: 70, y: 30, w: 20, h: 40 },
  });

  const nudge = (dx: number, dy: number) => {
    setCoords(prev => ({
      ...prev,
      [activePocket]: {
        ...prev[activePocket],
        x: Math.max(0, Math.min(100 - prev[activePocket].w, prev[activePocket].x + dx)),
        y: Math.max(0, Math.min(100 - prev[activePocket].h, prev[activePocket].y + dy)),
      }
    }));
  };

  const scaleBox = (dw: number, dh: number) => {
    setCoords(prev => ({
      ...prev,
      [activePocket]: {
        ...prev[activePocket],
        w: Math.max(5, Math.min(100 - prev[activePocket].x, prev[activePocket].w + dw)),
        h: Math.max(5, Math.min(100 - prev[activePocket].y, prev[activePocket].h + dh)),
      }
    }));
  };

  const drawBox = (pocket: Pocket) => {
    const isActive = pocket === activePocket;
    const { x, y, w, h } = coords[pocket];
    
    return (
      <View 
        style={[
          styles.targetBox, 
          { 
            left: `${x}%` as any, 
            top: `${y}%` as any,
            width: `${w}%` as any,
            height: `${h}%` as any,
            borderColor: isActive ? theme.success : 'rgba(255,255,255,0.4)',
            backgroundColor: isActive ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
            borderWidth: isActive ? 2 : 1,
            zIndex: isActive ? 10 : 1,
          }
        ]}
      >
        <Text style={[styles.boxLabel, { color: isActive ? theme.success : 'white' }]}>
          {pocket}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Vision Calibration', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerShown: false,
        }} 
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: theme.accent }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Optical Alignment</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Use the directional pad to align the AI detection zones precisely over the 3 physical sorting pockets on the machine.
        </Text>
      </View>

      {/* Live Feed Simulator */}
      <View style={styles.cameraFrame}>
        <Image 
          source={require('@/assets/images/example_image.jpg')}
          style={styles.cameraImage}
          resizeMode="cover"
        />
        <View style={styles.reticleOverlay}>
          {drawBox('LEFT')}
          {drawBox('CENTER')}
          {drawBox('RIGHT')}
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn} 
          onPress={() => Alert.alert('Refreshing', 'Fetching latest frame from camera stream...')}
        >
          <Text style={styles.refreshText}>🔄 Refresh Frame</Text>
        </TouchableOpacity>
      </View>

      {/* Pocket Selector */}
      <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>SELECT POCKET</Text>
      <View style={styles.selectorRow}>
        {(['LEFT', 'CENTER', 'RIGHT'] as Pocket[]).map(pkt => (
          <TouchableOpacity
            key={pkt}
            style={[
              styles.selectorBtn,
              { 
                backgroundColor: activePocket === pkt ? theme.successBg : theme.surface,
                borderColor: activePocket === pkt ? theme.success : theme.border,
                borderWidth: activePocket === pkt ? 2 : 1,
              },
              Shadows.sm
            ]}
            onPress={() => setActivePocket(pkt)}
          >
            <Text style={[
              styles.selectorText, 
              { color: activePocket === pkt ? theme.success : theme.text }
            ]}>
              {pkt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* D-Pad & Controls Module */}
      <View style={styles.controlsModuleRow}>
        <View style={styles.dpadSection}>
          <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>NUDGE POSITION</Text>
          <View style={styles.dpadContainer}>
            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface }]} onPress={() => nudge(0, -1)}>
              <Text style={[styles.dpadArrow, { color: theme.text }]}>▲</Text>
            </TouchableOpacity>
            
            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface }]} onPress={() => nudge(-1, 0)}>
                <Text style={[styles.dpadArrow, { color: theme.text }]}>◀</Text>
              </TouchableOpacity>
              
              <View style={styles.dpadCenter}>
                <Text style={[styles.coordText, { color: theme.textSecondary }]}>X: {coords[activePocket].x}</Text>
                <Text style={[styles.coordText, { color: theme.textSecondary }]}>Y: {coords[activePocket].y}</Text>
              </View>
              
              <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface }]} onPress={() => nudge(1, 0)}>
                <Text style={[styles.dpadArrow, { color: theme.text }]}>▶</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface }]} onPress={() => nudge(0, 1)}>
              <Text style={[styles.dpadArrow, { color: theme.text }]}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scaleSection}>
          <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>SCALE</Text>
          <View style={styles.scaleContainer}>
            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface, marginBottom: Spacing.md }]} onPress={() => scaleBox(2, 2)}>
              <Text style={[styles.dpadArrow, { color: theme.text }]}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.surface }]} onPress={() => scaleBox(-2, -2)}>
              <Text style={[styles.dpadArrow, { color: theme.text }]}>➖</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.saveBtn, 
          { backgroundColor: theme.primary },
          isSaving && { opacity: 0.7 },
          Shadows.sm
        ]}
        disabled={isSaving}
        onPress={() => {
          setIsSaving(true);
          // Simulate database sync latency to prevent duplicate inserts
          setTimeout(() => {
            setIsSaving(false);
            Alert.alert(
              'Calibration Saved', 
              `Relative pixel coordinates synced to hardware DB.\nJSON Struct updated for Edge Inference engine.\n\nL: ${coords.LEFT.x}%, ${coords.LEFT.y}%\nC: ${coords.CENTER.x}%, ${coords.CENTER.y}%\nR: ${coords.RIGHT.x}%, ${coords.RIGHT.y}%`
            );
          }, 1500);
        }}
      >
        {isSaving ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: Spacing.sm }} />
            <Text style={styles.saveBtnText}>Syncing to Cloud...</Text>
          </View>
        ) : (
          <Text style={styles.saveBtnText}>Save Calibration to Hardware</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    paddingTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },
  cameraFrame: {
    height: 250,
    width: '100%',
    backgroundColor: '#000',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  cameraImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Add grid lines or crosshairs here if needed
  },
  refreshBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  refreshText: {
    color: '#FFF',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
  },
  targetBox: {
    position: 'absolute',
    borderRadius: Radius.sm,
  },
  boxLabel: {
    position: 'absolute',
    top: -20,
    left: 0,
    fontSize: 10,
    fontFamily: Typography.fontFamily.semiBold,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
    letterSpacing: 1.5,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectorBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  selectorText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  controlsModuleRow: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  dpadSection: {
    alignItems: 'center',
  },
  scaleSection: {
    alignItems: 'center',
  },
  dpadContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  scaleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  dpadArrow: {
    fontSize: 24,
  },
  dpadCenter: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
  },
  saveBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  }
});
