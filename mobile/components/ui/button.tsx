import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}: ThemedButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const buttonColors: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: theme.primary, text: '#FFF8F0' },
    secondary: { bg: 'transparent', text: theme.primary, border: theme.primary },
    danger: { bg: theme.danger, text: '#FFF8F0' },
    ghost: { bg: 'transparent', text: theme.primary },
  };

  const sizeStyles: Record<ButtonSize, { height: number; fontSize: number; paddingH: number }> = {
    sm: { height: 36, fontSize: Typography.fontSize.sm, paddingH: Spacing.sm },
    md: { height: 48, fontSize: Typography.fontSize.base, paddingH: Spacing.md },
    lg: { height: 56, fontSize: Typography.fontSize.md, paddingH: Spacing.lg },
  };

  const colors = buttonColors[variant];
  const sizeConfig = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingH,
          borderColor: colors.border || 'transparent',
          borderWidth: variant === 'secondary' ? 1.5 : 0,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: colors.text,
              fontSize: sizeConfig.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Typography.fontFamily.semiBold,
  },
});
