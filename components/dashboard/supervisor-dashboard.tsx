import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';
import { StatBox } from './stat-box';

const isWeb = Platform.OS === 'web';

export function SupervisorDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const { profiles, refreshProfiles } = useClinical();

  useEffect(() => {
    refreshProfiles();
  }, []);

  // Real clinical stats — monitor whole facility
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

  // Top 5 most recently updated active cases across facility
  const recentCases = useMemo(() => {
    return profiles
      .filter(p => p.status !== 'closed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [profiles]);

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

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
          label="Reports"
          icon="document-text-outline"
          color="#8B5CF6"
        />
        <ActionItem
          label="Cases"
          icon="cross.case.fill"
          color="#EB4D88"
          onPress={() => router.push('/(app)/(tabs)/clinical')}
        />
        <ActionItem
          label="Emerg. Contacts"
          icon="phone"
          color="#0EA5E9"
          onPress={() => router.push('/(app)/management/emergency-contacts')}
        />
      </View>

      {/* Recent Active Cases */}
      <View style={styles.sectionRow}>
        <ThemedText type="labelLg" style={{ flex: 1 }}>Recent Cases</ThemedText>
        <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/clinical')}>
          <Text style={[styles.viewAll, { color: themeColors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentCases.length === 0 ? (
        <Card style={styles.emptyCard}>
          <IconSymbol name="cross.case.fill" size={28} color={themeColors.textSecondary} />
          <ThemedText type="bodySm" color="secondary" style={{ marginTop: Spacing.xs }}>No active cases</ThemedText>
        </Card>
      ) : (
        <View style={styles.casesList}>
          {recentCases.map(profile => (
            <RecentCaseCard
              key={profile.local_id}
              profile={profile}
              themeColors={themeColors}
              timeAgo={getTimeAgo(profile.updated_at)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Shared case card ──────────────────────────────────────────

function RecentCaseCard({
  profile,
  themeColors,
  timeAgo,
}: {
  profile: MaternalProfile;
  themeColors: any;
  timeAgo: string;
}) {
  const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;
  return (
    <TouchableOpacity
      style={[styles.caseCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/(app)/clinical/patient-detail',
        params: { localId: profile.local_id },
      })}
    >
      <View style={styles.caseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.patientName, { color: themeColors.text }]}>
            {profile.patient_id || 'Patient'}
          </Text>
          <Text style={[styles.patientInfo, { color: themeColors.textSecondary }]}>
            {profile.age} yrs · G{profile.gravida}P{profile.parity}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColors.bg }]}>
          <Text style={[styles.riskText, { color: riskColors.text }]}>
            {RISK_LABELS[profile.risk_level as RiskLevel]}
          </Text>
        </View>
      </View>
      <View style={styles.caseFooter}>
        <View style={[styles.statusChip, {
          backgroundColor: profile.status === 'active' ? '#E8F5E9' : '#FFF3E0',
        }]}>
          <Text style={[styles.statusChipText, {
            color: profile.status === 'active' ? '#2E7D32' : '#E65100',
          }]}>
            {profile.status === 'active' ? 'Active' : profile.status === 'monitoring' ? 'Monitoring' : profile.status}
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: themeColors.textSecondary }]}>{timeAgo} ago</Text>
        <Text style={[styles.detailsLink, { color: themeColors.primary }]}>Details →</Text>
      </View>
    </TouchableOpacity>
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  viewAll: { ...Typography.labelSm },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  casesList: { gap: Spacing.sm },
  caseCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  patientName: { ...Typography.labelMd },
  patientInfo: { ...Typography.bodySm, fontSize: 12 },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  riskText: { fontSize: 10, fontWeight: '700' },
  caseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusChipText: { fontSize: 10, fontWeight: '600' },
  timeAgo: { ...Typography.caption, flex: 1 },
  detailsLink: { ...Typography.labelSm },
});
