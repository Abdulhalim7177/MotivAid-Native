import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = Radius.md,
}: SkeletonProps) {
  const inputBg = useThemeColor({}, 'inputBackground');
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(0.7, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: inputBg,
        },
      ]}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <View style={skeletonStyles.textContainer}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
          borderRadius={Radius.sm}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = 50 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={Radius.full} />;
}

export function SkeletonCard() {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');

  return (
    <View style={[skeletonStyles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={skeletonStyles.cardHeader}>
        <SkeletonAvatar />
        <View style={skeletonStyles.cardHeaderText}>
          <Skeleton width="70%" height={16} borderRadius={Radius.sm} />
          <Skeleton width="40%" height={12} borderRadius={Radius.sm} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  textContainer: {
    gap: Spacing.sm,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.sm,
  },
});
