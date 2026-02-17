import React, { forwardRef, useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  style,
  ...textInputProps
}, ref) => {
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tint = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
    textInputProps.onBlur?.(e);
  };

  const borderColorValue = error ? errorColor : isFocused ? tint : inputBorder;

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText style={[Typography.labelMd, styles.label]}>{label}</ThemedText>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: inputBg,
            borderColor: borderColorValue,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: textColor },
            leftIcon && { paddingLeft: 0 },
            rightIcon && { paddingRight: 0 },
            style,
          ]}
          placeholderTextColor={placeholderColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <ThemedText style={[Typography.labelSm, styles.errorText, { color: errorColor }]}>
          {error}
        </ThemedText>
      )}
      {hint && !error && (
        <ThemedText style={[Typography.labelSm, styles.hintText, { color: textSecondary }]}>
          {hint}
        </ThemedText>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    marginLeft: Spacing.xs,
  },
  inputWrapper: {
    height: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  iconLeft: {
    marginRight: Spacing.smd,
  },
  iconRight: {
    marginLeft: Spacing.smd,
  },
  errorText: {
    marginLeft: Spacing.xs,
  },
  hintText: {
    marginLeft: Spacing.xs,
  },
});
