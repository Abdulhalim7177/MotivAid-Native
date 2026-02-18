import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';
import { StatBox } from './stat-box';

const isWeb = Platform.OS === 'web';

export function SupervisorDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  return (
    <View style={[isWeb && styles.webContainer]}>
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

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/approvals')}
      >
        <Card
          style={[styles.alertCard, { backgroundColor: warningColor + '0D', borderColor: warningColor + '30' }]}
        >
          <View style={styles.alertContent}>
            <View style={[styles.alertIcon, { backgroundColor: warningColor + '20' }]}>
              <IconSymbol name="person-add-outline" size={20} color={warningColor} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="labelLg">Pending Approvals</ThemedText>
              <ThemedText type="caption" color="secondary">Staff awaiting unit assignment</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={textSecondaryColor} />
          </View>
        </Card>
      </TouchableOpacity>

      <SectionHeader title="Management" variant="heading" />
      <View style={[styles.actionsGrid, isWeb && styles.actionsGridWeb]}>
        <ActionItem
          label="Units"
          icon="grid-outline"
          color={themeColors.primary}
          onPress={() => router.push('/(app)/units')}
        />
        <ActionItem
          label="Team"
          icon="people-outline"
          color="#3B82F6"
        />
        <ActionItem
          label="Analytics"
          icon="bar-chart-outline"
          color={themeColors.secondary}
        />
        <ActionItem
          label="Schedule"
          icon="calendar-outline"
          color={successColor}
        />
        <ActionItem
          label="Reports"
          icon="document-text-outline"
          color="#8B5CF6"
        />
        <ActionItem
          label="Settings"
          icon="settings-outline"
          color="#6B7280"
        />
        <ActionItem
          label="Identity Info"
          icon="id-card-outline"
          color="#0EA5E9"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    maxWidth: 1200,
    alignSelf: 'center' as any,
    width: '100%',
  },
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
    flexWrap: 'wrap',
    gap: Spacing.smd,
  },
  actionsGridWeb: {
    gap: Spacing.md,
  },
});
