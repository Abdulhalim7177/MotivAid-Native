import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const translateY = useState(new Animated.Value(-100))[0];
  const opacity = useState(new Animated.Value(0))[0];

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#222' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: Platform.OS === 'web' ? 20 : 60,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hideToast();
    }, 3000);
  }, [translateY, opacity]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [translateY, opacity]);

  const getIcon = () => {
    switch (type) {
      case 'success': return 'heart.fill';
      case 'error': return 'shield.fill';
      default: return 'paperplane.fill';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#FF4444';
      default: return tintColor;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            { 
              transform: [{ translateY }], 
              opacity,
              backgroundColor,
              borderColor: getIconColor(),
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
                android: { elevation: 6 },
                web: { boxShadow: '0px 8px 16px rgba(0,0,0,0.1)' }
              })
            }
          ]}
        >
          <View style={styles.content}>
            <IconSymbol size={24} name={getIcon() as any} color={getIconColor()} />
            <ThemedText style={styles.text}>{message}</ThemedText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
