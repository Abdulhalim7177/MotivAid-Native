import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

interface StatBoxProps {
  label: string;
  value: string | number;
}

export function StatBox({ label, value }: StatBoxProps) {
  return (
    <Card variant="default" padding="md" style={styles.container}>
      <ThemedText type="statMd">{value}</ThemedText>
      <ThemedText type="caption" color="secondary" style={styles.label}>{label}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    marginTop: Spacing.xs,
  },
});
