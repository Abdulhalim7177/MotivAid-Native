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
    text: '#111827',
    textSecondary: '#6B7280',
    background: '#F8FAFC',
    tint: '#0D9488',
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#0D9488',
    card: '#FFFFFF',
    border: '#E2E8F0',
    cardBorder: '#E2E8F0',
    error: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    link: '#0D9488',
    inputBackground: '#F1F5F9',
    inputBorder: '#CBD5E1',
    placeholder: '#94A3B8',
    buttonText: '#FFFFFF',
    overlay: 'rgba(15,23,42,0.5)',
    shadow: '#0D9488',
  },
  dark: {
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    tint: '#2DD4BF',
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#2DD4BF',
    card: '#1E293B',
    border: '#334155',
    cardBorder: '#334155',
    error: '#EF4444',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    link: '#2DD4BF',
    inputBackground: '#1E293B',
    inputBorder: '#475569',
    placeholder: '#64748B',
    buttonText: '#022C22',
    overlay: 'rgba(15,23,42,0.7)',
    shadow: '#2DD4BF',
  },
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
