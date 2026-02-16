import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/auth';
import { router } from 'expo-router';

export default function SplashScreen() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (session) {
          router.replace('/(app)/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 1500); // Small delay for splash effect
      return () => clearTimeout(timer);
    }
  }, [session, isLoading]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <IconSymbol size={100} name="heart.fill" color="#A1CEDC" />
        <ThemedText type="title" style={styles.title}>MotivAid</ThemedText>
        <ThemedText style={styles.subtitle}>Your Journey, Better.</ThemedText>
      </View>
      <ActivityIndicator size="small" color="#A1CEDC" style={styles.loader} />
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
  },
  title: {
    fontSize: 32,
    marginTop: 20,
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
