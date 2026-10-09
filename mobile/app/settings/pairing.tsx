import React, { useEffect, useState } from 'react';
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

  const [machineId, setMachineId] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [farmName, setFarmName] = useState(meta?.farm_location || 'Zamboanga Peninsula, 7000, Philippines');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLinkedMachine() {
      if (!user?.id) {
        setIsPaired(false);
        return;
      }

      const { data, error: readError } = await supabase
        .from('profiles')
        .select('linked_machine_id')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      if (readError) {
        setIsPaired(false);
        setError('Failed to load pairing status.');
        return;
      }

      const linkedId = data?.linked_machine_id ?? null;
      if (linkedId) {
        setMachineId(linkedId);
        setIsPaired(true);
      } else {
        setIsPaired(false);
      }
    }

    loadLinkedMachine();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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

    const normalizedId = machineId.trim();

    try {
      const { data: ok, error: rpcError } = await supabase.rpc('pair_machine', {
        p_machine_id: normalizedId,
        p_pin: masterPin,
      });

      if (rpcError) {
        setError('Failed to pair machine.');
        return;
      }
      if (ok !== true) {
        setError('Failed to pair machine.');
        return;
      }

      setIsPaired(true);
      setMachineId(normalizedId);
      setSuccess(`Successfully paired with ${normalizedId}!`);
      setMasterPin('');

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          ...meta,
          paired_machine: normalizedId,
          farm_location: farmName.trim(),
        },
      });
      if (metaError) {
        console.warn('Pairing metadata update failed.');
      }
    } catch {
      setError('Failed to pair machine.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpair = async () => {
    if (!user?.id) {
      setError('Failed to unpair.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ linked_machine_id: null })
        .eq('id', user.id);

      if (dbError) {
        setError('Failed to unpair.');
        return;
      }

      setIsPaired(false);
      setMachineId('');
      setSuccess('Machine unpaired successfully.');

      const { error: metaError } = await supabase.auth.updateUser({
        data: { ...meta, paired_machine: null },
      });
      if (metaError) {
        console.warn('Unpair metadata cleanup failed.');
      }
    } catch {
      setError('Failed to unpair.');
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
