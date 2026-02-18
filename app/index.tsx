import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const { session, isLoading } = useAuth();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    // Sequence: Logo opacity/scale -> Text opacity/translate
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Text starts after 800ms (when logo finishes fading in)
    textOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));
    textTranslateY.value = withDelay(800, withSpring(0, { damping: 14, stiffness: 120 }));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (session) {
          router.replace('/(app)/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [session, isLoading]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <LinearGradient
      colors={['#EB4D88', '#9B51E0']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/assets/images/motivaid-light.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View style={[textStyle, styles.textContainer]}>
          <Text style={styles.title}>MotivAid</Text>
          <Text style={styles.subtitle}>Maternal Health Support System</Text>
          <Text style={styles.tagline}>Empowering midwives with E-MOTIVE guidelines</Text>
        </Animated.View>
      </View>

      <View style={styles.pagination}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </LinearGradient>
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
    // Removed negative margin to ensure true center
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeDot: {
    backgroundColor: '#FFF',
    width: 12,
  },
});
