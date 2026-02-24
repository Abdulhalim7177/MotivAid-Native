import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';

export function StaffDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { profiles } = useClinical();

  // Compute stats from real data
  const stats = useMemo(() => {
    const active = profiles.filter(p => p.status !== 'closed');
    const highRisk = active.filter(p => p.risk_level === 'high');
    const mediumRisk = active.filter(p => p.risk_level === 'medium');
    const lowRisk = active.filter(p => p.risk_level === 'low');
    return { active, highRisk, mediumRisk, lowRisk };
  }, [profiles]);

  // Most recent 3 non-closed cases for the "Recent Cases" section
  const recentCases = useMemo(() => {
    return profiles
      .filter(p => p.status !== 'closed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3);
  }, [profiles]);

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const RecentCaseCard = ({ profile }: { profile: MaternalProfile }) => {
    const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;
    const riskLabel = RISK_LABELS[profile.risk_level as RiskLevel] ?? 'Low';

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
          <View>
            <Text style={[styles.patientName, { color: themeColors.text }]}>
              {profile.patient_id || `Patient`}
            </Text>
            <Text style={[styles.patientInfo, { color: themeColors.textSecondary }]}>
              {profile.age} years • G{profile.gravida}P{profile.parity}
            </Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: riskColors.bg }]}>
            <Text style={[styles.riskText, { color: riskColors.text }]}>{riskLabel}</Text>
          </View>
        </View>

        <View style={styles.caseFooter}>
          <View style={styles.timeContainer}>
            <IconSymbol name="clock.fill" size={14} color={themeColors.textSecondary} />
            <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
              {getTimeAgo(profile.created_at)} ago
            </Text>
          </View>

          <View style={styles.actionRow}>
            {(profile.status === 'active' || profile.status === 'monitoring') && (
              <View style={[styles.statusChip, { backgroundColor: profile.status === 'active' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.statusChipText, { color: profile.status === 'active' ? '#2E7D32' : '#E65100' }]}>
                  {profile.status === 'active' ? 'Active' : 'Monitoring'}
                </Text>
              </View>
            )}
            <Text style={[styles.detailsText, { color: themeColors.primary }]}>Details →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>

      {/* Active Cases Gradient Card */}
      <LinearGradient
        colors={['#EB4D88', '#9B51E0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Active Cases</Text>
          <View style={styles.teamIcon}>
            <IconSymbol name="person.2.fill" size={20} color="#FFF" />
          </View>
        </View>

        <Text style={styles.bigStat}>{stats.active.length}</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{stats.highRisk.length}</Text>
            <Text style={styles.breakdownLabel}>High Risk</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{stats.mediumRisk.length}</Text>
            <Text style={styles.breakdownLabel}>Medium Risk</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{stats.lowRisk.length}</Text>
            <Text style={styles.breakdownLabel}>Low Risk</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" variant="heading" />
      <View style={[styles.actionsGrid, Platform.OS === 'web' && styles.actionsGridWeb]}>
        <ActionItem
          label="New Case"
          icon="add-circle-outline"
          color="#EB4D88"
          onPress={() => router.push('/(app)/clinical/new-patient')}
        />
        <ActionItem
          label="Training"
          icon="book-outline"
          color="#3B82F6"
          onPress={() => { }}
        />
        <ActionItem
          label="My Patients"
          icon="people-outline"
          color={themeColors.primary}
          onPress={() => router.push('/(app)/(tabs)/clinical')}
        />
        <ActionItem
          label="Reports"
          icon="bar-chart-outline"
          color="#F59E0B"
          onPress={() => { }}
        />
      </View>

      {/* Recent Cases */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Cases</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/clinical')}>
          <Text style={[styles.viewAll, { color: Colors.light.secondary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.casesList}>
        {recentCases.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <IconSymbol name="cross.case.fill" size={32} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No active cases</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              Tap &quot;New Case&quot; to create one
            </Text>
          </View>
        ) : (
          recentCases.map(profile => (
            <RecentCaseCard key={profile.local_id} profile={profile} />
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#9B51E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  statsTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  teamIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 8,
  },
  bigStat: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  casesList: {
    gap: Spacing.md,
  },
  caseCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    height: 24,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    ...Typography.labelMd,
  },
  emptySubtext: {
    ...Typography.bodySm,
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
