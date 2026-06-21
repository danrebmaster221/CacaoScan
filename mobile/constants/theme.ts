/**
 * CacaoScan Design System — "Cacao Earth (Eye-Comfort Edition)"
 * Shared color tokens, typography, spacing, and radius for the mobile app.
 *
 * Usage:
 *   import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
 *   style={{ backgroundColor: Colors.light.background, padding: Spacing.md }}
 */

// ─── Color Palette ──────────────────────────────────────────────────────────

export const Palette = {
  // Brand
  chocolate:    '#6D4C41',   // Primary — soft chocolate brown
  terracotta:   '#A1887F',   // Secondary — muted terracotta
  gold:         '#FFB74D',   // Accent — warm gold
  darkCacao:    '#3E2723',   // Text on light backgrounds

  // Backgrounds
  cream:        '#FFF8F0',   // Light mode background
  linen:        '#FAF0E6',   // Card / surface background
  espresso:     '#2C1F1A',   // Dark mode background
  espressoCard: '#3A2A22',   // Dark mode card/surface

  // Text
  textDark:     '#3E2723',   // Primary text (light mode)
  textMuted:    '#8D6E63',   // Secondary/muted text (light mode)
  textLight:    '#F5EDE4',   // Primary text (dark mode)
  textLightMuted: '#BCAAA4', // Secondary/muted text (dark mode)

  // Semantic
  success:      '#4CAF50',   // Export-Grade / Good
  successBg:    '#E8F5E9',   // Success background tint
  warning:      '#FFA726',   // Needs Drying / Caution
  warningBg:    '#FFF3E0',   // Warning background tint
  danger:       '#E53935',   // Rejected / Error
  dangerBg:     '#FFEBEE',   // Danger background tint
  info:         '#42A5F5',   // Informational
  infoBg:       '#E3F2FD',   // Info background tint

  // Neutral
  border:       '#D7CCC8',   // Borders (light mode)
  borderDark:   '#4E342E',   // Borders (dark mode)
  disabled:     '#BCAAA4',   // Disabled elements
  overlay:      'rgba(44, 31, 26, 0.5)', // Modal overlay
};

export const Colors = {
  light: {
    // Surfaces
    background:   Palette.cream,
    surface:      Palette.linen,
    card:         Palette.cream,

    // Text
    text:         Palette.textDark,
    textSecondary: Palette.textMuted,

    // Brand
    primary:      Palette.chocolate,
    secondary:    Palette.terracotta,
    accent:       Palette.gold,

    // Semantic
    success:      Palette.success,
    successBg:    Palette.successBg,
    warning:      Palette.warning,
    warningBg:    Palette.warningBg,
    danger:       Palette.danger,
    dangerBg:     Palette.dangerBg,
    info:         Palette.info,
    infoBg:       Palette.infoBg,

    // UI
    border:       Palette.border,
    disabled:     Palette.disabled,
    overlay:      Palette.overlay,
    tint:         Palette.chocolate,
    icon:         Palette.textMuted,
    tabIconDefault:  Palette.disabled,
    tabIconSelected: Palette.chocolate,
  },
  dark: {
    // Surfaces
    background:   Palette.espresso,
    surface:      Palette.espressoCard,
    card:         Palette.espressoCard,

    // Text
    text:         Palette.textLight,
    textSecondary: Palette.textLightMuted,

    // Brand
    primary:      Palette.gold,
    secondary:    Palette.terracotta,
    accent:       Palette.gold,

    // Semantic
    success:      Palette.success,
    successBg:    '#1B3A1B',
    warning:      Palette.warning,
    warningBg:    '#3A2A10',
    danger:       Palette.danger,
    dangerBg:     '#3A1515',
    info:         Palette.info,
    infoBg:       '#152A3A',

    // UI
    border:       Palette.borderDark,
    disabled:     Palette.disabled,
    overlay:      Palette.overlay,
    tint:         Palette.gold,
    icon:         Palette.textLightMuted,
    tabIconDefault:  Palette.textLightMuted,
    tabIconSelected: Palette.gold,
  },
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const Typography = {
  fontFamily: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },
  fontSize: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,
    lg:    20,
    xl:    24,
    '2xl': 30,
    '3xl': 36,
  },
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const Radius = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: Palette.darkCacao,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Palette.darkCacao,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: Palette.darkCacao,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
