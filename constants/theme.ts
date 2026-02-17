/**
 * MotivAid Healthcare Color System
 *
 * Primary: Calm Teal — clinical, trustworthy (surgical scrubs, hospital accents)
 * Neutrals: Slate palette — warm, professional
 * Dark mode: Deep navy — warmer than pure black
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2937', // Gray-900
    textSecondary: '#6B7280', // Gray-500
    background: '#FFFFFF',

    // Brand Colors
    primary: '#9B51E0', // Main Purple
    secondary: '#EB4D88', // Pink
    accent: '#300863', // Deep Purple

    // UI Colors
    tint: '#9B51E0',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#9B51E0',

    // Components
    card: '#FFFFFF',
    border: '#E5E7EB',
    cardBorder: 'transparent',

    // Feedback
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',

    // Inputs
    inputBackground: '#F9FAFB',
    inputBorder: '#E5E7EB',
    placeholder: '#9CA3AF',

    buttonText: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.4)',
    shadow: '#9B51E0',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#1F2937',

    primary: '#A78BFA',
    secondary: '#F472B6',
    accent: '#4C1D95',

    tint: '#A78BFA',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#A78BFA',

    card: '#374151',
    border: '#4B5563',
    cardBorder: '#4B5563',

    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',

    inputBackground: '#374151',
    inputBorder: '#4B5563',
    placeholder: '#6B7280',

    buttonText: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.7)',
    shadow: '#A78BFA',
  },
};

/** 8-point spacing grid with common intermediates. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mdl: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/** Border radius scale. */
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

/** Typography scale for healthcare-grade readability. */
export const Typography = {
  displayLg: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const, letterSpacing: 0.5 },
  displaySm: { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },

  headingLg: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  headingMd: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  headingSm: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },

  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  bodyMd: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },

  labelLg: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  labelMd: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelSm: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },

  caption: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
  overline: { fontSize: 10, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },

  buttonLg: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
  buttonMd: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  buttonSm: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },

  statLg: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  statMd: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
} as const;

/** Platform-aware shadow presets. */
export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
    android: { elevation: 6 },
    default: {},
  }),
  tinted: (tintColor: string) => Platform.select({
    ios: { shadowColor: tintColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    android: { elevation: 4 },
    default: {},
  }),
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
