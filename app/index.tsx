import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

export default function SplashScreen() {
  const { session, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const tint = useThemeColor({}, 'tint');

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const titleTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const dotOpacity = useSharedValue(0.3);

  const logo = colorScheme === 'dark'
    ? require('@/assets/images/motivaid-dark.png')
    : require('@/assets/images/motivaid-light.png');

  useEffect(() => {
    // Staggered entrance
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 120 }));

    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));

    // Pulse dot
    dotOpacity.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      -1,
      true
    ));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (session) {
          router.replace('/(app)/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [session, isLoading]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={logoStyle}>
          <Image
            source={logo}
            style={styles.logo}
            contentFit="contain"
            transition={300}
          />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <ThemedText type="title" style={styles.title}>MotivAid</ThemedText>
        </Animated.View>
        <Animated.View style={subtitleStyle}>
          <ThemedText color="secondary" style={styles.subtitle}>Your Journey, Better.</ThemedText>
        </Animated.View>
      </View>
      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: tint }, dotStyle]} />
        <Animated.View style={[styles.dot, { backgroundColor: tint }, dotStyle, { marginHorizontal: Spacing.sm }]} />
        <Animated.View style={[styles.dot, { backgroundColor: tint }, dotStyle]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: -100,
  },
  logo: {
    width: 240,
    height: 192,
  },
  title: {
    fontSize: 32,
    marginTop: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
