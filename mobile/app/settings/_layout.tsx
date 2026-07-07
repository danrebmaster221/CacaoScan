import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Settings',
        headerTintColor: '#6B4226',
        headerStyle: { backgroundColor: '#FFF8F0' },
        headerTitleStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: '#FFF8F0' },
      }}
    />
  );
}
