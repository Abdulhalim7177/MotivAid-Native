import React from 'react';
import { View, ViewProps, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius, Shadows } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CardVariant = 'default' | 'elevated' | 'outlined' | 'tinted';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  onPress?: () => void;
  padding?: keyof typeof Spacing;
  tintColor?: string;
}

export function Card({
  variant = 'default',
  onPress,
  padding = 'lg',
  tintColor,
  style,
  children,
  ...viewProps
}: CardProps) {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');
  const tint = useThemeColor({}, 'tint');

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor,
        };
      case 'elevated':
        return {
          backgroundColor: cardBg,
          borderWidth: 0,
          ...Shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor,
        };
      case 'tinted':
        return {
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor,
          borderLeftWidth: 4,
          borderLeftColor: tintColor || tint,
        };
    }
  };

  const cardStyle = [
    styles.base,
    { padding: Spacing[padding] },
    getVariantStyle(),
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        style={[animatedStyle, ...cardStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        {...viewProps}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} {...viewProps}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xxl,
  },
});
