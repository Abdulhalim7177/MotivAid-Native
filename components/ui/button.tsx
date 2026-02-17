import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius, Typography, Shadows } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
}

const SIZE_MAP = { sm: 40, md: 48, lg: 56 } as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  haptic = true,
}: ButtonProps) {
  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const errorColor = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const height = SIZE_MAP[size];
  const typo = size === 'lg' ? Typography.buttonLg : size === 'md' ? Typography.buttonMd : Typography.buttonSm;

  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: tint,
          text: buttonTextColor,
          border: 'transparent',
          borderWidth: 0,
          shadow: Shadows.tinted(tint),
        };
      case 'secondary':
        return {
          bg: tint + '15',
          text: tint,
          border: 'transparent',
          borderWidth: 0,
          shadow: {},
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: tint,
          border: tint + '40',
          borderWidth: 1,
          shadow: {},
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: textColor,
          border: 'transparent',
          borderWidth: 0,
          shadow: {},
        };
      case 'danger':
        return {
          bg: errorColor,
          text: '#FFFFFF',
          border: 'transparent',
          borderWidth: 0,
          shadow: Shadows.tinted(errorColor),
        };
    }
  };

  const s = getStyles();

  return (
    <AnimatedPressable
      style={[
        animatedStyle,
        styles.base,
        {
          height,
          backgroundColor: s.bg,
          borderColor: s.border,
          borderWidth: s.borderWidth,
          ...s.shadow,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={s.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <ThemedText style={[typo, { color: s.text }]}>{title}</ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
