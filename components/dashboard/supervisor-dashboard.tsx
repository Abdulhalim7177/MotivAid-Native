import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  const { profiles } = useClinical();

  // Real clinical stats
  const clinicalStats = useMemo(() => {
    const activeCases = profiles.filter(p => p.status !== 'closed');
    const highRiskCases = activeCases.filter(p => p.risk_level === 'high');
    const closedToday = profiles.filter(p => {
      if (p.status !== 'closed') return false;
      const closedDate = new Date(p.updated_at);
      const today = new Date();
      return closedDate.toDateString() === today.toDateString();
    });
    return { activeCases: activeCases.length, highRisk: highRiskCases.length, closedToday: closedToday.length };
  }, [profiles]);

  // Pending approvals count from Supabase
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('unit_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(count ?? 0);
    })();
  }, []);

  return (
    <View style={[isWeb && styles.webContainer]}>
      {/* Unit Overview Card — Real Data */}
      <Card>
        <View style={styles.cardHeader}>
          <ThemedText type="overline" color="secondary">Unit Overview</ThemedText>
        </View>
        <View style={styles.statsRow}>
          <StatBox label="Active Cases" value={`${clinicalStats.activeCases}`} />
          <StatBox label="High Risk" value={`${clinicalStats.highRisk}`} />
          <StatBox label="Closed Today" value={`${clinicalStats.closedToday}`} />
        </View>
      </Card>

      {/* Pending Approvals */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/approvals')}
      >
        <Card
          style={[styles.alertCard, {
            backgroundColor: pendingCount > 0 ? warningColor + '0D' : successColor + '0D',
            borderColor: pendingCount > 0 ? warningColor + '30' : successColor + '30',
          }]}
        >
          <View style={styles.alertContent}>
            <View style={[styles.alertIcon, {
              backgroundColor: pendingCount > 0 ? warningColor + '20' : successColor + '20',
            }]}>
              <IconSymbol
                name="person-add-outline"
                size={20}
                color={pendingCount > 0 ? warningColor : successColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="labelLg">
                {pendingCount > 0 ? `${pendingCount} Pending Approval${pendingCount > 1 ? 's' : ''}` : 'No Pending Approvals'}
              </ThemedText>
              <ThemedText type="caption" color="secondary">
                {pendingCount > 0 ? 'Staff awaiting unit assignment' : 'All staff assigned'}
              </ThemedText>
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
          label="Cases"
          icon="cross.case.fill"
          color="#EB4D88"
          onPress={() => router.push('/(app)/(tabs)/clinical')}
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
