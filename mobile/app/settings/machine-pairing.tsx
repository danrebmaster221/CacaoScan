import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

export default function MachinePairingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const router = useRouter();

  const [machineId, setMachineId] = useState('');
  const [pin, setPin] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkedMachine, setLinkedMachine] = useState<string | null>(
    user?.user_metadata?.linked_machine_id || null
  );

  const handlePairMachine = async () => {
    if (!machineId.trim() || !pin.trim()) {
      Alert.alert('Missing Info', 'Please enter both the Machine ID and Master PIN.');
      return;
    }

    setIsLinking(true);
    try {
      // Very basic validation logic referencing the machines table
      const { data, error } = await supabase
        .from('machines')
        .select('machine_id, master_pin')
        .eq('machine_id', machineId.trim())
        .single();

      if (error || !data) {
        Alert.alert('Not Found', 'No machine found with that ID.');
        setIsLinking(false);
        return;
      }

      if (data.master_pin !== pin.trim()) {
        Alert.alert('Access Denied', 'Invalid Master PIN. Please check the hardware manual.');
        setIsLinking(false);
        return;
      }

      // Update Profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          linked_machine_id: data.machine_id,
          // Conditionally update if farm location is provided in this onboarding flow
          ...(farmLocation.trim() ? { farm_location: farmLocation.trim() } : {})
        })
        .eq('id', user!.id);

      if (profileError) {
        throw profileError;
      }

      // Also mark machine as owned by this user
      await supabase
        .from('machines')
        .update({ owner_id: user!.id })
        .eq('machine_id', data.machine_id);
      
      setLinkedMachine(data.machine_id);
      Alert.alert('Success', `Machine ${data.machine_id} securely linked to your account!`);
      
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkMachine = async () => {
    Alert.alert('Unlink Machine', 'Are you sure you want to decouple this machine from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Unlink', 
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await supabase
              .from('profiles')
              .update({ linked_machine_id: null })
              .eq('id', user.id);
              
            await supabase
              .from('machines')
              .update({ owner_id: null })
              .eq('machine_id', linkedMachine);
              
            setLinkedMachine(null);
          } catch {
            Alert.alert('Error', 'Could not unlink machine.');
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen 
        options={{ 
          title: 'Machine Pairing', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerShown: false,
        }} 
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: theme.accent }}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Farm Config</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Pair your mobile account with a physical CacaoScan ESP32 processing unit to claim ownership and view live statistics.
          </Text>
        </View>

        {linkedMachine ? (
          <View style={[styles.linkedCard, { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }]}>
            <Text style={[styles.linkedTitle, { color: theme.success }]}>ACTIVE CONNECTION</Text>
            <Text style={[styles.machineIdLabel, { color: theme.success }]}>{linkedMachine}</Text>
            <Text style={[styles.linkedSubtitle, { color: theme.success }]}>
              Telemetry streaming allowed.
            </Text>
            
            <TouchableOpacity 
              style={[styles.unlinkBtn, { backgroundColor: theme.dangerBg }]}
              onPress={unlinkMachine}
            >
              <Text style={[styles.unlinkBtnText, { color: theme.danger }]}>Unlink Hardware</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.formCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>MACHINE ID</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TextInput
                style={[
                  styles.input, 
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, flex: 1 }
                ]}
                placeholder="e.g. CS-ZAM-001"
                placeholderTextColor={theme.textSecondary}
                value={machineId}
                onChangeText={setMachineId}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={[styles.qrBtn, { backgroundColor: theme.primary }]}
                onPress={() => Alert.alert('Scanner Initializing', 'Hold your device steady while the CacaoScan QR code is framed.')}
              >
                <Ionicons name="qr-code-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>MASTER PIN</Text>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }
              ]}
              placeholder="Enter 6-digit hardware pin"
              placeholderTextColor={theme.textSecondary}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>FARM LOCATION</Text>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }
              ]}
              placeholder="e.g. Local Coop #1, Zamboanga"
              placeholderTextColor={theme.textSecondary}
              value={farmLocation}
              onChangeText={setFarmLocation}
            />

            <TouchableOpacity 
              style={[
                styles.linkBtn, 
                { backgroundColor: theme.primary },
                (isLinking || !machineId || !pin || !farmLocation) && { opacity: 0.6 }
              ]}
              onPress={handlePairMachine}
              disabled={isLinking || !machineId || !pin || !farmLocation}
            >
              <Text style={styles.linkBtnText}>
                {isLinking ? 'Verifying...' : 'Link New Machine'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    paddingTop: Spacing.xl,
    marginBottom: Spacing.xl,
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
  linkedCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  linkedTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  machineIdLabel: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  linkedSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xl,
  },
  unlinkBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  unlinkBtnText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.medium,
  },
  qrBtn: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: {
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  linkBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  }
});
