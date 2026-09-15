/**
 * CacaoScan Design System — Redesign (Figma Make → Expo)
 * Warm cacao browns, white surfaces, soft green success.
 */

export const Palette = {
  // Brand (from RedesignCacaoScan)
  chocolate: '#5c4033',
  chocolateDeep: '#3a2820',
  brownText: '#4b3226',
  muted: '#8a7566',
  mutedSoft: '#9c8878',
  creamField: '#fdfaf6',
  creamCard: '#faf6f1',
  iconBg: '#f5efe8',
  borderSoft: '#eef0f3',
  borderWarm: '#e7dbcf',
  white: '#FFFFFF',

  // Accents
  green: '#3faa4f',
  greenDeep: '#2f7a3d',
  greenBg: '#e7f5e9',
  gold: '#e0a032',
  goldBg: '#fff5e6',
  danger: '#d84b3a',
  dangerBg: '#fdecec',
  orange: '#f97316',
  pinkReject: '#ec0f6c',

  // Class colors
  criollo: '#a3e635',
  forastero: '#4d9e5a',
  trinitario: '#22c55e',
  needsDrying: '#f97316',
  rejected: '#ec0f6c',

  // Dark mode
  espresso: '#2C1F1A',
  espressoCard: '#3A2A22',
  textLight: '#F5EDE4',
  textLightMuted: '#BCAAA4',
  borderDark: '#4E342E',

  overlay: 'rgba(30, 20, 15, 0.45)',
  disabled: '#c3b3a5',
};

export const Colors = {
  light: {
    background: Palette.white,
    surface: Palette.white,
    card: Palette.white,
    text: Palette.brownText,
    textSecondary: Palette.muted,
    primary: Palette.chocolate,
    secondary: Palette.muted,
    accent: Palette.green,
    success: Palette.green,
    successBg: Palette.greenBg,
    warning: Palette.gold,
    warningBg: Palette.goldBg,
    danger: Palette.danger,
    dangerBg: Palette.dangerBg,
    info: '#3a7bc2',
    infoBg: '#e5f0fb',
    border: Palette.borderSoft,
    disabled: Palette.disabled,
    overlay: Palette.overlay,
    tint: Palette.chocolate,
    icon: Palette.muted,
    tabIconDefault: '#a9998b',
    tabIconSelected: Palette.chocolate,
  },
  dark: {
    background: Palette.espresso,
    surface: Palette.espressoCard,
    card: Palette.espressoCard,
    text: Palette.textLight,
    textSecondary: Palette.textLightMuted,
    primary: Palette.gold,
    secondary: Palette.muted,
    accent: Palette.green,
    success: Palette.green,
    successBg: '#1B3A1B',
    warning: Palette.gold,
    warningBg: '#3A2A10',
    danger: Palette.danger,
    dangerBg: '#3A1515',
    info: '#42A5F5',
    infoBg: '#152A3A',
    border: Palette.borderDark,
    disabled: Palette.disabled,
    overlay: Palette.overlay,
    tint: Palette.gold,
    icon: Palette.textLightMuted,
    tabIconDefault: Palette.textLightMuted,
    tabIconSelected: Palette.gold,
  },
} as const;

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 28,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#1e1e32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: Palette.brownText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  lg: {
    shadowColor: Palette.brownText,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
    elevation: 8,
  },
} as const;

/** 5-class display tokens matching RedesignCacaoScan */
export const ClassColors = {
  Criollo: Palette.criollo,
  Forastero: Palette.forastero,
  Trinitario: Palette.trinitario,
  Needs_Drying: Palette.needsDrying,
  Rejected: Palette.rejected,
} as const;
