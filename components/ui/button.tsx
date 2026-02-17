
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAppTheme } from '../../context/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style
}: Props) {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.container, style]}
      >
        <LinearGradient
          colors={['#EB4D88', '#9B51E0']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.gradient,
            styles[size],
            disabled && styles.disabled
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.content}>
              {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
              <Text style={[styles.textPrimary, styles[`text${size}`]]}>{title}</Text>
              {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getBackgroundColor = () => {
    switch (variant) {
      case 'secondary': return themeColors.card;
      case 'ghost': return 'transparent';
      default: return 'transparent';
    }
  };

  const getBorderWidth = () => (variant === 'outline' ? 1 : 0);
  const getTextColor = () => {
    if (disabled) return themeColors.textSecondary;
    if (variant === 'outline' || variant === 'ghost') return themeColors.primary;
    return themeColors.text;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        styles.base,
        styles[size],
        {
          backgroundColor: getBackgroundColor(),
          borderColor: themeColors.border,
          borderWidth: getBorderWidth(),
        },
        disabled && { opacity: 0.6 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.primary} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[
            styles.textBase,
            styles[`text${size}`],
            { color: getTextColor() }
          ]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  // Sizes
  sm: {
    height: 36,
    paddingHorizontal: Spacing.md,
  },
  md: {
    height: 48,
    paddingHorizontal: Spacing.lg,
  },
  lg: {
    height: 56,
    paddingHorizontal: Spacing.xl,
  },
  // Text Styles
  textBase: {
    ...Typography.buttonMd,
  },
  textPrimary: {
    color: '#FFF',
    ...Typography.buttonLg,
  },
  textsm: {
    ...Typography.buttonSm,
  },
  textmd: {
    ...Typography.buttonMd,
  },
  textlg: {
    ...Typography.buttonLg,
  },
});
