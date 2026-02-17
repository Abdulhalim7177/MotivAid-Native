
import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAppTheme } from '../../context/theme';

interface Props extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  leftIcon,
  rightIcon,
  error,
  containerStyle,
  style,
  ...props
}: Props) {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        {
          borderColor: error ? themeColors.error : themeColors.inputBorder,
          backgroundColor: themeColors.inputBackground
        }
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={themeColors.placeholder}
          style={[
            styles.input,
            { color: themeColors.text },
            style
          ]}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {!!error && <Text style={[styles.error, { color: themeColors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    ...Typography.labelMd,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg, // More rounded as per design
    height: 56,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    ...Typography.bodyMd,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  error: {
    marginTop: Spacing.xs,
    ...Typography.caption,
  },
});
