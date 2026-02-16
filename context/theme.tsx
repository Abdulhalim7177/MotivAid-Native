import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  preference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'motivaid_theme_preference';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<'light' | 'dark'>(deviceColorScheme ?? 'light');

  useEffect(() => {
    // Load persisted preference
    const loadPreference = async () => {
      try {
        const savedPref = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedPref) {
          setPreference(savedPref as ThemePreference);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadPreference();
  }, []);

  useEffect(() => {
    // Update active theme based on preference and device settings
    const activeTheme = preference === 'system' ? (deviceColorScheme ?? 'light') : preference;
    setTheme(activeTheme);

    // On web, update the body background color to match the theme
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const bgColor = activeTheme === 'dark' ? '#0F1113' : '#F8F9FA';
      document.body.style.backgroundColor = bgColor;
    }
  }, [preference, deviceColorScheme]);

  const setThemePreference = async (pref: ThemePreference) => {
    setPreference(pref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
};
