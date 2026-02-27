import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';

export function UserDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { showToast } = useToast();
  const { profiles } = useClinical();

  // ── Analytics ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = profiles.filter(p => p.status !== 'closed');
    const closed = profiles.filter(p => p.status === 'closed');
    const highRisk = active.filter(p => p.risk_level === 'high');
    const mediumRisk = active.filter(p => p.risk_level === 'medium');
    const lowRisk = active.filter(p => p.risk_level === 'low');
    return { total: profiles.length, active, closed, highRisk, mediumRisk, lowRisk };
  }, [profiles]);

  // Recent 3 cases (any status, most recent first)
  const recentCases = useMemo(() => {
    return [...profiles]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3);
  }, [profiles]);

  // Outcomes breakdown (for closed cases)
  const outcomes = useMemo(() => {
    const normal = stats.closed.filter(p => p.outcome === 'normal').length;
    const pphResolved = stats.closed.filter(p => p.outcome === 'pph_resolved').length;
    const referred = stats.closed.filter(p => p.outcome === 'referred').length;
    return { normal, pphResolved, referred };
  }, [stats.closed]);

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pre_delivery: { label: 'Pre-Delivery', color: '#3B82F6', icon: 'time-outline' },
    active: { label: 'Active', color: '#10B981', icon: 'pulse-outline' },
    monitoring: { label: 'Monitoring', color: '#F59E0B', icon: 'eye-outline' },
    closed: { label: 'Closed', color: '#6B7280', icon: 'checkmark-circle-outline' },
  };

  const CaseCard = ({ profile }: { profile: MaternalProfile }) => {
    const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;
    const riskLabel = RISK_LABELS[profile.risk_level as RiskLevel] ?? 'Low';
    const statusConf = STATUS_CONFIG[profile.status] ?? STATUS_CONFIG.pre_delivery;

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
              Age {profile.age} · G{profile.gravida}P{profile.parity}
            </Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
            <Text style={[styles.riskText, { color: riskColors.text }]}>{riskLabel}</Text>
          </View>
        </View>
        <View style={styles.caseFooter}>
          <View style={[styles.statusChip, { backgroundColor: statusConf.color + '15' }]}>
            <Ionicons name={statusConf.icon as any} size={12} color={statusConf.color} />
            <Text style={[styles.statusChipText, { color: statusConf.color }]}>
              {statusConf.label}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
            {getTimeAgo(profile.updated_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>

      {/* ── Overview Gradient Card ──────────────────────────── */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overviewCard}
      >
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>My Cases</Text>
          <TouchableOpacity
            style={styles.newCaseBtn}
            onPress={() => router.push('/(app)/clinical/new-patient')}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.newCaseBtnText}>New Case</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.bigStat}>{stats.active.length}</Text>
        <Text style={styles.bigStatLabel}>Active Cases</Text>

        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatItem}>
            <Text style={styles.miniStatValue}>{stats.total}</Text>
            <Text style={styles.miniStatLabel}>Total</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={styles.miniStatValue}>{stats.closed.length}</Text>
            <Text style={styles.miniStatLabel}>Closed</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={styles.miniStatValue}>{stats.highRisk.length}</Text>
            <Text style={[styles.miniStatLabel, { color: '#FCA5A5' }]}>High Risk</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Risk Distribution ──────────────────────────────── */}
      {stats.active.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Risk Distribution</Text>
          <View style={styles.riskRow}>
            <RiskStatCard
              label="High"
              count={stats.highRisk.length}
              total={stats.active.length}
              color="#EF4444"
              bgColor="#FEF2F2"
              icon="warning"
              themeColors={themeColors}
            />
            <RiskStatCard
              label="Medium"
              count={stats.mediumRisk.length}
              total={stats.active.length}
              color="#F59E0B"
              bgColor="#FFFBEB"
              icon="alert-circle"
              themeColors={themeColors}
            />
            <RiskStatCard
              label="Low"
              count={stats.lowRisk.length}
              total={stats.active.length}
              color="#10B981"
              bgColor="#ECFDF5"
              icon="shield-checkmark"
              themeColors={themeColors}
            />
          </View>
        </>
      )}

      {/* ── Quick Actions ──────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Quick Actions</Text>
      <View style={[styles.actionsGrid, Platform.OS === 'web' && styles.actionsGridWeb]}>
        <ActionItem
          label="New Case"
          icon="add-circle-outline"
          color="#6366F1"
          onPress={() => router.push('/(app)/clinical/new-patient')}
        />
        <ActionItem
          label="My Cases"
          icon="people-outline"
          color="#8B5CF6"
          onPress={() => router.push('/(app)/(tabs)/clinical')}
        />
        <ActionItem
          label="Training"
          icon="book-outline"
          color="#3B82F6"
          onPress={() => showToast('Coming Soon!', 'info')}
        />
        <ActionItem
          label="Reports"
          icon="bar-chart-outline"
          color="#F59E0B"
          onPress={() => router.push('/(app)/clinical/reports')}
        />
      </View>

      {/* ── Outcomes (closed cases) ────────────────────────── */}
      {stats.closed.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Case Outcomes</Text>
          <Card style={styles.outcomesCard}>
            <View style={styles.outcomeRow}>
              <OutcomeStat label="Normal" count={outcomes.normal} color="#10B981" icon="checkmark-circle" />
              <View style={[styles.outcomeDivider, { backgroundColor: themeColors.border }]} />
              <OutcomeStat label="PPH Resolved" count={outcomes.pphResolved} color="#F59E0B" icon="medkit" />
              <View style={[styles.outcomeDivider, { backgroundColor: themeColors.border }]} />
              <OutcomeStat label="Referred" count={outcomes.referred} color="#6366F1" icon="arrow-redo" />
            </View>
          </Card>
        </>
      )}

      {/* ── Recent Cases ───────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>Recent Cases</Text>
        {profiles.length > 3 && (
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/clinical')}>
            <Text style={[styles.viewAll, { color: themeColors.primary }]}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.casesList}>
        {recentCases.length === 0 ? (
          <Card style={styles.emptyState}>
            <IconSymbol name="cross.case.fill" size={32} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No cases yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
              Tap "New Case" to create your first patient record
            </Text>
          </Card>
        ) : (
          recentCases.map(profile => (
            <CaseCard key={profile.local_id} profile={profile} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function RiskStatCard({
  label, count, total, color, bgColor, icon, themeColors,
}: {
  label: string; count: number; total: number; color: string; bgColor: string; icon: string; themeColors: any;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={[styles.riskStatCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={[styles.riskStatIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.riskStatCount, { color }]}>{count}</Text>
      <Text style={[styles.riskStatLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      {/* Mini progress bar */}
      <View style={[styles.riskBar, { backgroundColor: themeColors.border }]}>
        <View style={[styles.riskBarFill, { backgroundColor: color, width: `${Math.max(pct, 4)}%` }]} />
      </View>
      <Text style={[styles.riskStatPct, { color: themeColors.textSecondary }]}>{pct}%</Text>
    </View>
  );
}

function OutcomeStat({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) {
  return (
    <View style={styles.outcomeStat}>
      <View style={[styles.outcomeIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.outcomeCount, { color }]}>{count}</Text>
      <Text style={styles.outcomeLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overview gradient card
  overviewCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  overviewTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  newCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.smd,
    paddingVertical: 6,
    borderRadius: Radius.md,
    gap: 4,
  },
  newCaseBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bigStat: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
  },
  bigStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.smd,
  },
  miniStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  miniStatLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 2,
  },
  miniStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Section
  sectionTitle: {
    ...Typography.labelLg,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  viewAll: {
    ...Typography.labelSm,
  },

  // Risk distribution
  riskRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  riskStatCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.smd,
    alignItems: 'center',
    ...Shadows.sm,
  },
  riskStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  riskStatCount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  riskStatLabel: {
    ...Typography.bodySm,
    fontSize: 11,
    marginTop: 2,
  },
  riskBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.xs,
  },
  riskBarFill: {
    height: 4,
    borderRadius: 2,
  },
  riskStatPct: {
    ...Typography.labelSm,
    fontSize: 10,
    marginTop: 2,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.smd,
    marginBottom: Spacing.lg,
  },
  actionsGridWeb: {
    gap: Spacing.md,
  },

  // Outcomes
  outcomesCard: {
    marginBottom: Spacing.lg,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeStat: {
    flex: 1,
    alignItems: 'center',
  },
  outcomeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  outcomeCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  outcomeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  outcomeDivider: {
    width: 1,
    height: 40,
  },

  // Recent cases
  casesList: {
    gap: Spacing.sm,
  },
  caseCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  patientName: {
    ...Typography.labelMd,
  },
  patientInfo: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  riskText: {
    ...Typography.labelSm,
    fontSize: 10,
  },
  caseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusChipText: {
    ...Typography.labelSm,
    fontSize: 10,
  },
  timeText: {
    ...Typography.bodySm,
    fontSize: 11,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyText: {
    ...Typography.labelMd,
  },
  emptySubtext: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
});
