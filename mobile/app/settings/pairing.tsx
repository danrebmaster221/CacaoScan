import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Palette } from '@/constants/theme';
import {
  StickyHeader,
  Card,
  FieldLabel,
  FieldInput,
  BrownButton,
} from '@/components/redesign/ui';

export default function MachinePairingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;
  const meta = user?.user_metadata;

  const [machineId, setMachineId] = useState(meta?.paired_machine || '');
  const [masterPin, setMasterPin] = useState('');
  const [farmName, setFarmName] = useState(meta?.farm_location || 'Zamboanga Peninsula, 7000, Philippines');
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
      // Prefer secure RPC (does not expose master_pin)
      const { data: ok, error: rpcError } = await supabase.rpc('pair_machine', {
        p_machine_id: machineId.trim(),
        p_pin: masterPin,
      });

      if (!rpcError && ok === true) {
        await supabase.auth.updateUser({
          data: {
            ...meta,
            paired_machine: machineId.trim().toUpperCase(),
            farm_location: farmName.trim(),
          },
        });
        setIsPaired(true);
        setSuccess(`Successfully paired with ${machineId.trim().toUpperCase()}!`);
        setMasterPin('');
        return;
      }

      // Fallback: metadata-only pairing (dev / before machines seeded)
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...meta,
          paired_machine: machineId.trim().toUpperCase(),
          farm_location: farmName.trim(),
        },
      });
      if (updateError) throw updateError;

      setIsPaired(true);
      setSuccess(`Paired with ${machineId.trim().toUpperCase()} (local claim).`);
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
        data: { ...meta, paired_machine: null },
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView>
        <Stack.Screen options={{ headerShown: false }} />
        <StickyHeader
          title="Machine Pairing"
          subtitle="Claim ownership of a physical CacaoScan unit. Scan the QR code on the machine or enter the Machine ID and Master PIN manually."
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <Card>
            <Text style={styles.cardTitle}>Entry Form</Text>
            <FieldLabel>Machine ID</FieldLabel>
            <View style={styles.idRow}>
              <FieldInput
                value={machineId}
                onChangeText={setMachineId}
                placeholder="e.g. CS-4821-AXB"
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
              <TouchableOpacity style={styles.qrBtn} onPress={() => setError('QR scan coming soon — enter ID manually.')}>
                <Ionicons name="qr-code-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <FieldLabel>Master PIN</FieldLabel>
            <FieldInput
              value={masterPin}
              onChangeText={setMasterPin}
              placeholder="6-digit PIN on hardware"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <FieldLabel>Farm Name / Location</FieldLabel>
            <FieldInput value={farmName} onChangeText={setFarmName} placeholder="Farm location" />
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}
          {success && <Text style={styles.ok}>{success}</Text>}

          <View style={{ marginTop: Spacing.lg }}>
            {loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : isPaired ? (
              <BrownButton title="Unpair Machine" onPress={handleUnpair} icon="link-outline" />
            ) : (
              <BrownButton title="Pair Machine" onPress={handlePair} icon="link-outline" />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  cardTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  idRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  qrBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Palette.chocolate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: 12, color: Colors.light.danger, fontFamily: Typography.fontFamily.medium },
  ok: { marginTop: 12, color: Colors.light.success, fontFamily: Typography.fontFamily.medium },
});
