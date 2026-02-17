import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatBox } from './stat-box';
import { ActionItem } from './action-item';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius, Typography } from '@/constants/theme';

export function SupervisorDashboard() {
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  return (
    <View>
      <Card>
        <View style={styles.cardHeader}>
          <ThemedText type="overline" color="secondary">Unit Adherence</ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: successColor + '15' }]}>
            <IconSymbol name="chevron.right" size={12} color={successColor} style={{ transform: [{ rotate: '-90deg' }] }} />
            <ThemedText style={[Typography.labelSm, { color: successColor }]}>+4%</ThemedText>
          </View>
        </View>
        <View style={styles.statsRow}>
          <StatBox label="Avg Response" value="3.2m" />
          <StatBox label="E-MOTIVE" value="92%" />
        </View>
      </Card>

      <Card
        onPress={() => router.push('/(app)/approvals')}
        style={[styles.alertCard, { backgroundColor: warningColor + '0D', borderColor: warningColor + '30' }]}
      >
        <View style={styles.alertContent}>
          <View style={[styles.alertIcon, { backgroundColor: warningColor + '20' }]}>
            <IconSymbol name="person-add-outline" size={20} color={warningColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="labelLg">Pending Approvals</ThemedText>
            <ThemedText type="caption" color="secondary">Midwives awaiting unit assignment</ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={textSecondaryColor} />
        </View>
      </Card>

      <SectionHeader title="Management" variant="heading" />
      <View style={styles.actionsGrid}>
        <ActionItem label="Team" icon="people-outline" />
        <ActionItem label="Analytics" icon="document-text-outline" />
        <ActionItem label="Units" icon="settings-outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.smd,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  alertCard: {
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
});
