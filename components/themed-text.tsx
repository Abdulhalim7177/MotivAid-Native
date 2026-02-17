import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography } from '@/constants/theme';

export type ThemedTextType =
  | 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link'
  | 'displayLg' | 'displaySm'
  | 'headingLg' | 'headingMd' | 'headingSm'
  | 'bodyLg' | 'bodyMd' | 'bodySm'
  | 'labelLg' | 'labelMd' | 'labelSm'
  | 'caption' | 'overline'
  | 'buttonLg' | 'buttonMd' | 'buttonSm'
  | 'statLg' | 'statMd';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'tint';
};

const COLOR_MAP: Record<NonNullable<ThemedTextProps['color']>, string> = {
  primary: 'text',
  secondary: 'textSecondary',
  error: 'error',
  success: 'success',
  warning: 'warning',
  tint: 'tint',
};

// Map legacy types to Typography scale
const TYPE_STYLE_MAP: Record<string, any> = {
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: 'bold', lineHeight: 32 },
  subtitle: { fontSize: 20, fontWeight: 'bold' },
  link: { lineHeight: 30, fontSize: 16 },
  // Typography scale
  displayLg: Typography.displayLg,
  displaySm: Typography.displaySm,
  headingLg: Typography.headingLg,
  headingMd: Typography.headingMd,
  headingSm: Typography.headingSm,
  bodyLg: Typography.bodyLg,
  bodyMd: Typography.bodyMd,
  bodySm: Typography.bodySm,
  labelLg: Typography.labelLg,
  labelMd: Typography.labelMd,
  labelSm: Typography.labelSm,
  caption: Typography.caption,
  overline: Typography.overline,
  buttonLg: Typography.buttonLg,
  buttonMd: Typography.buttonMd,
  buttonSm: Typography.buttonSm,
  statLg: Typography.statLg,
  statMd: Typography.statMd,
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  color: colorProp,
  ...rest
}: ThemedTextProps) {
  const defaultColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'link');
  const semanticColor = useThemeColor({}, colorProp ? (COLOR_MAP[colorProp] as any) : 'text');

  const textColor = colorProp ? semanticColor : defaultColor;

  return (
    <Text
      style={[
        { color: textColor },
        TYPE_STYLE_MAP[type],
        type === 'link' ? { color: linkColor } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}
