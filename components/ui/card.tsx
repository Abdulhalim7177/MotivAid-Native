
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/theme';

interface Props {
  children: React.ReactNode;
  variant?: 'default' | 'glass';
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Card({
  children,
  variant = 'default',
  style,
  fullWidth = false,
}: Props) {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  if (variant === 'glass') {
    return (
      <View style={[styles.glassContainer, !fullWidth && { width: '100%' }, style]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 30 : 100}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={styles.blur}
        >
          <View style={styles.glassContent}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: themeColors.card,
        borderColor: themeColors.cardBorder,
      },
      !fullWidth && { width: '100%' },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  glassContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.md,
  },
  blur: {
    width: '100%',
    height: '100%',
  },
  glassContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
