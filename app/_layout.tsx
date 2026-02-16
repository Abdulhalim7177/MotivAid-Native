import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth';
import { ToastProvider } from '@/context/toast';
import { ThemeProvider as AppThemeProvider } from '@/context/theme';
import { UnitProvider } from '@/context/unit';

export const unstable_settings = {
  anchor: '(app)/(tabs)',
};

function RootLayoutNav() {
  const { isOfflineAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isSplash = segments.length === 0 || segments[0] === 'index';

    if (isSplash) return; 

    if (!isOfflineAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isOfflineAuthenticated && inAuthGroup) {
      router.replace('/(app)/(tabs)');
    }
  }, [isOfflineAuthenticated, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <UnitProvider>
            <RootLayoutNav />
          </UnitProvider>
        </AuthProvider>
      </ToastProvider>
    </AppThemeProvider>
  );
}
