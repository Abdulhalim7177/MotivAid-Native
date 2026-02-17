import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Typography } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  variant?: 'overline' | 'heading';
}

export function SectionHeader({
  title,
  action,
  variant = 'overline',
}: SectionHeaderProps) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      <ThemedText
        style={[
          variant === 'overline' ? Typography.caption : Typography.headingSm,
          variant === 'overline' && { color: textSecondary },
        ]}
      >
        {title}
      </ThemedText>
      {action && (
        <Pressable onPress={action.onPress}>
          <ThemedText style={[Typography.labelMd, { color: tint }]}>
            {action.label}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
