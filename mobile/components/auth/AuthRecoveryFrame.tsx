import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';

type AuthRecoveryFrameProps = {
  backgroundColor: string;
  children: ReactNode;
};

export function AuthRecoveryFrame({ backgroundColor, children }: AuthRecoveryFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={64}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
