import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatBox } from './stat-box';
import { ActionItem } from './action-item';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius } from '@/constants/theme';

export function StaffDashboard() {
  const tint = useThemeColor({}, 'tint');

  return (
    <View>
      <Card>
        <ThemedText type="overline" color="secondary" style={styles.cardLabel}>Shift Overview</ThemedText>
        <View style={styles.statsRow}>
          <StatBox label="My Cases" value="8" />
          <StatBox label="Success Rate" value="100%" />
        </View>
      </Card>

      <SectionHeader title="Main Workflow" variant="heading" />
      <View style={styles.actionsGrid}>
        <ActionItem label="Clinical Mode" icon="plus" />
        <ActionItem label="Training" icon="calendar" />
        <ActionItem label="My History" icon="document-text-outline" />
      </View>

      <Card style={styles.progressCard}>
        <ThemedText type="overline" color="secondary" style={styles.cardLabel}>Training Progress</ThemedText>
        <View style={styles.progressRow}>
          <View style={[styles.progressBarBase, { backgroundColor: tint + '20' }]}>
            <View style={[styles.progressBarFill, { backgroundColor: tint, width: '65%' }]} />
          </View>
          <ThemedText type="labelSm" style={styles.progressText}>65% Complete</ThemedText>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  cardLabel: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.smd,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
  progressCard: {
    marginTop: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  progressBarBase: {
    flex: 1,
    height: 8,
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.xs,
  },
  progressText: {
    width: 85,
  },
});
