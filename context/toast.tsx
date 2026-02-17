import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius, Shadows } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'card');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const shadowColor = useThemeColor({}, 'shadow');

  const hideToast = useCallback(() => {
    translateY.value = withSpring(-100, { damping: 15, stiffness: 120 });
    opacity.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(0.95, { duration: 250 });
    setTimeout(() => {
      runOnJS(setVisible)(false);
    }, 300);
  }, []);

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    const targetY = Platform.OS === 'web' ? 20 : 60;

    translateY.value = withSpring(targetY, { damping: 14, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withSequence(
      withSpring(1.02, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 14, stiffness: 160 })
    );

    setTimeout(() => {
      hideToast();
    }, 3000);
  }, [hideToast]);

  const getIcon = () => {
    switch (type) {
      case 'success': return 'heart.fill';
      case 'error': return 'shield.fill';
      default: return 'paperplane.fill';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return successColor;
      case 'error': return errorColor;
      default: return tintColor;
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedStyle,
            {
              backgroundColor,
              borderColor: getIconColor(),
              ...Platform.select({
                ios: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
                android: { elevation: 6 },
                web: { boxShadow: `0px 8px 16px ${shadowColor}` } as any,
              }),
            },
          ]}
        >
          <View style={styles.content}>
            <IconSymbol size={24} name={getIcon() as any} color={getIconColor()} />
            <ThemedText type="defaultSemiBold">{message}</ThemedText>
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
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
});
