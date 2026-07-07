import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Settings',
        headerTintColor: Colors.light.text,
        headerStyle: { backgroundColor: Colors.light.background },
        headerTitleStyle: {
          fontFamily: Typography.fontFamily.semiBold,
          fontSize: Typography.fontSize.md,
        },
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    />
  );
}
