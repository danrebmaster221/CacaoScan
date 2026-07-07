import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

export default function MachinePairingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;
  const meta = user?.user_metadata;

  const [machineId, setMachineId] = useState(meta?.paired_machine || '');
  const [masterPin, setMasterPin] = useState('');
  const [farmName, setFarmName] = useState(meta?.farm_location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(!!meta?.paired_machine);

  const handlePair = async () => {
    if (!machineId.trim()) {
      setError('Machine ID is required.');
      return;
    }
    if (masterPin.length !== 6 || !/^\d{6}$/.test(masterPin)) {
      setError('Master PIN must be a 6-digit number.');
      return;
    }
    if (!farmName.trim()) {
      setError('Farm name/location is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Save pairing info to auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...meta,
          paired_machine: machineId.trim().toUpperCase(),
          farm_location: farmName.trim(),
        },
      });

      if (updateError) throw updateError;

      setIsPaired(true);
      setSuccess(`Successfully paired with ${machineId.trim().toUpperCase()}!`);
      setMasterPin('');
    } catch (err: any) {
      setError(err.message || 'Failed to pair machine.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpair = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...meta,
          paired_machine: null,
        },
      });
      if (updateError) throw updateError;
      setIsPaired(false);
      setMachineId('');
      setSuccess('Machine unpaired successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to unpair.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView>
        <Stack.Screen options={{ title: 'Machine Pairing', headerShadowVisible: false }} />
        <View style={styles.container}>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Claim ownership of a physical CacaoScan unit. Scan the QR code on the machine or enter the Machine ID and Master PIN manually.
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

          {/* Current Pairing Status */}
          {isPaired && (
            <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
              <View style={styles.pairedRow}>
                <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.pairedLabel, { color: theme.text }]}>Paired Machine</Text>
                  <Text style={[styles.pairedId, { color: theme.primary }]}>{machineId}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.unpairBtn, { borderColor: theme.danger }]} onPress={handleUnpair} disabled={loading}>
                <Text style={[styles.unpairText, { color: theme.danger }]}>Unpair Machine</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* QR Scan Button */}
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
            <TouchableOpacity style={[styles.qrButton, { backgroundColor: theme.primary }]} onPress={() => {/* Camera QR scan — expo-camera integration */}}>
              <Ionicons name="qr-code-outline" size={28} color="#FFF8F0" />
              <Text style={styles.qrButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
            <Text style={[styles.orText, { color: theme.textSecondary }]}>— or enter manually —</Text>
          </View>

          {/* Manual Entry */}
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Manual Entry</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Machine ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={machineId}
                onChangeText={(t) => setMachineId(t.toUpperCase())}
                placeholder="e.g. CS-ZAM-001"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Master PIN</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={masterPin}
                onChangeText={setMasterPin}
                placeholder="6-digit PIN on hardware"
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Farm Name / Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={farmName}
                onChangeText={setFarmName}
                placeholder="e.g. Hassan Farm, Zamboanga"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
            onPress={handlePair}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pair Machine</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.md,
  },
  pairedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pairedLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  pairedId: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 2,
  },
  unpairBtn: {
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpairText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  qrButton: {
    height: 56,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  qrButtonText: {
    color: '#FFF8F0',
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
  },
  orText: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
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
    marginBottom: Spacing.xl,
  },
  buttonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
