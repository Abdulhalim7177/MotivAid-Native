import React, { useEffect, useRef } from 'react';
import { StyleSheet, ActivityIndicator, View, Image, Animated } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SplashScreen() {
  const { session, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const logo = colorScheme === 'dark' 
    ? require('@/assets/images/motivaid-dark.png') 
    : require('@/assets/images/motivaid-light.png');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isLoading) {
      const timer = setTimeout(() => {
        if (session) {
          router.replace('/(app)/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2000); // Slightly longer for the animation to finish
      return () => clearTimeout(timer);
    }
  }, [session, isLoading]);

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={logo} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <ThemedText type="title" style={styles.title}>MotivAid</ThemedText>
        <ThemedText style={styles.subtitle}>Your Journey, Better.</ThemedText>
      </Animated.View>
      <ActivityIndicator size="small" color="#00D2FF" style={styles.loader} />
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
    opacity: 0.6,
    marginTop: 5,
  },
  loader: {
    position: 'absolute',
    bottom: 50,
  },
});
