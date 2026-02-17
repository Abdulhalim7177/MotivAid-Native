import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionItemProps {
  label: string;
  icon: any;
  onPress?: () => void;
}

export function ActionItem({ label, icon, onPress }: ActionItemProps) {
  const tint = useThemeColor({}, 'tint');
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: tint + '15' }]}>
        <IconSymbol size={24} name={icon} color={tint} />
      </View>
      <ThemedText type="labelSm" style={styles.label}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    textAlign: 'center',
  },
});
