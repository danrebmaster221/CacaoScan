import { Tabs } from 'expo-router';
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Shadows, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Outer margin from screen edges — keeps the pill centered with breathing room */
const TAB_SIDE_INSET = 28;

const TAB_META: Record<
  string,
  { title: string; icon: React.ComponentProps<typeof IconSymbol>['name'] }
> = {
  index: { title: 'Dashboard', icon: 'house.fill' },
  vision: { title: 'AI Vision', icon: 'eye.fill' },
  history: { title: 'History', icon: 'chart.bar.fill' },
  settings: { title: 'Settings', icon: 'gearshape.fill' },
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const pillWidth = Math.min(screenWidth - TAB_SIDE_INSET * 2, 400);
  const bottom = Math.max(insets.bottom, 14);

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View
        style={[
          styles.pill,
          {
            width: pillWidth,
            backgroundColor: colorScheme === 'dark' ? Palette.espressoCard : '#FFFFFFF5',
            borderColor: colorScheme === 'dark' ? theme.border : '#f0e7dd',
          },
          Shadows.lg,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            title: descriptors[route.key]?.options?.title ?? route.name,
            icon: 'house.fill' as const,
          };
          const color = focused ? theme.tabIconSelected : theme.tabIconDefault;

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
            >
              <IconSymbol size={22} name={meta.icon} color={color} />
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontFamily: focused
                      ? Typography.fontFamily.bold
                      : Typography.fontFamily.semiBold,
                  },
                ]}
              >
                {meta.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="vision" options={{ title: 'AI Vision' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 1,
  },
});
