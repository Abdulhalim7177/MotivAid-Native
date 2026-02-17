import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { StatBox } from './stat-box';
import { ActionItem } from './action-item';
import { Spacing } from '@/constants/theme';

export function AdminDashboard() {
  return (
    <View>
      <Card variant="tinted">
        <ThemedText type="overline" color="secondary" style={styles.cardLabel}>Global Statistics</ThemedText>
        <View style={styles.statsRow}>
          <StatBox label="Facilities" value="24" />
          <StatBox label="Total Users" value="1.2k" />
        </View>
      </Card>

      <SectionHeader title="System Administration" variant="heading" />
      <View style={styles.actionsGrid}>
        <ActionItem label="Security" icon="shield-checkmark-outline" />
        <ActionItem label="Config" icon="settings-outline" />
        <ActionItem label="Audit Logs" icon="time-outline" />
      </View>
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
});
