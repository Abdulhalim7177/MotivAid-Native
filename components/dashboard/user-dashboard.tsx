import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius } from '@/constants/theme';

export function UserDashboard() {
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: tint + '15' }]}>
          <IconSymbol size={48} name="plus" color={tint} />
        </View>
        <ThemedText type="headingSm" style={styles.cardTitle}>Start Clinical Mode</ThemedText>
        <ThemedText color="secondary" style={styles.cardDescription}>
          Begin an E-MOTIVE clinical session immediately.
        </ThemedText>
        <Button title="Initialize Case" onPress={() => {}} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  card: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: Spacing.md,
  },
  cardDescription: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
});
