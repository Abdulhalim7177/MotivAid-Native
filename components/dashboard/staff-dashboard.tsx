import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';

export function StaffDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { profiles } = useClinical();
  const [showReport, setShowReport] = useState(false);

  // ── Analytics ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = profiles.filter(p => p.status !== 'closed');
    const closed = profiles.filter(p => p.status === 'closed');
    const highRisk = active.filter(p => p.risk_level === 'high');
    const mediumRisk = active.filter(p => p.risk_level === 'medium');
    const lowRisk = active.filter(p => p.risk_level === 'low');
    return { total: profiles.length, active, closed, highRisk, mediumRisk, lowRisk };
  }, [profiles]);

  // Most recent 5 cases (any status) sorted by updated_at
  const recentCases = useMemo(() => {
    return [...profiles]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [profiles]);

  // Highlight cases: high-risk or recently updated active cases
  const highlightCases = useMemo(() => {
    return profiles
      .filter(p => p.status !== 'closed' && (p.risk_level === 'high' || p.risk_level === 'medium'))
      .sort((a, b) => {
        // High risk first, then by update time
        if (a.risk_level === 'high' && b.risk_level !== 'high') return -1;
        if (a.risk_level !== 'high' && b.risk_level === 'high') return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 3);
  }, [profiles]);

  // Outcomes breakdown
  const outcomes = useMemo(() => {
    const normal = stats.closed.filter(p => p.outcome === 'normal').length;
    const pphResolved = stats.closed.filter(p => p.outcome === 'pph_resolved').length;
    const referred = stats.closed.filter(p => p.outcome === 'referred').length;
    return { normal, pphResolved, referred };
  }, [stats.closed]);

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pre_delivery: { label: 'Pre-Delivery', color: '#3B82F6', icon: 'time-outline' },
    active: { label: 'Active', color: '#10B981', icon: 'pulse-outline' },
    monitoring: { label: 'Monitoring', color: '#F59E0B', icon: 'eye-outline' },
    closed: { label: 'Closed', color: '#6B7280', icon: 'checkmark-circle-outline' },
  };

  const RecentCaseCard = ({ profile }: { profile: MaternalProfile }) => {
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
            {getTimeAgo(profile.updated_at)} ago
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Highlight Card ─────────────────────────────────────────
  const HighlightCard = ({ profile }: { profile: MaternalProfile }) => {
    const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;
    const isHigh = profile.risk_level === 'high';

    return (
      <TouchableOpacity
        style={[styles.highlightCard, {
          backgroundColor: isHigh ? '#FEF2F2' : '#FFFBEB',
          borderColor: isHigh ? '#FECACA' : '#FDE68A',
        }]}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/(app)/clinical/patient-detail',
          params: { localId: profile.local_id },
        })}
      >
        <View style={[styles.highlightIcon, { backgroundColor: riskColors.bg }]}>
          <Ionicons
            name={isHigh ? 'warning' : 'alert-circle'}
            size={16}
            color={riskColors.text}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.highlightName, { color: isHigh ? '#991B1B' : '#92400E' }]}>
            {profile.patient_id || 'Patient'} · Age {profile.age}
          </Text>
          <Text style={[styles.highlightSub, { color: isHigh ? '#B91C1C' : '#B45309' }]}>
            {isHigh ? 'High Risk' : 'Medium Risk'} · {getTimeAgo(profile.updated_at)} ago
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={isHigh ? '#DC2626' : '#D97706'} />
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

      {/* ── Case Highlights ────────────────────────────────── */}
      {highlightCases.length > 0 && (
        <>
          <SectionHeader title="Attention Required" variant="heading" />
          <View style={styles.highlightList}>
            {highlightCases.map(p => (
              <HighlightCard key={p.local_id} profile={p} />
            ))}
          </View>
        </>
      )}

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
          label="Cases"
          icon="people-outline"
          color={themeColors.primary}
          onPress={() => router.push('/(app)/(tabs)/clinical')}
        />
        <ActionItem
          label="Reports"
          icon="bar-chart-outline"
          color="#F59E0B"
          onPress={() => setShowReport(true)}
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
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No cases yet</Text>
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

      {/* ── Reports Modal ──────────────────────────────────── */}
      <Modal visible={showReport} transparent animationType="fade" onRequestClose={() => setShowReport(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReport(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Case Reports</Text>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary Row */}
              <View style={styles.reportSummary}>
                <View style={[styles.reportStatCard, { backgroundColor: '#6366F1' + '12' }]}>
                  <Text style={[styles.reportStatNum, { color: '#6366F1' }]}>{stats.total}</Text>
                  <Text style={[styles.reportStatLabel, { color: themeColors.textSecondary }]}>Total</Text>
                </View>
                <View style={[styles.reportStatCard, { backgroundColor: '#10B981' + '12' }]}>
                  <Text style={[styles.reportStatNum, { color: '#10B981' }]}>{stats.active.length}</Text>
                  <Text style={[styles.reportStatLabel, { color: themeColors.textSecondary }]}>Active</Text>
                </View>
                <View style={[styles.reportStatCard, { backgroundColor: '#6B7280' + '12' }]}>
                  <Text style={[styles.reportStatNum, { color: '#6B7280' }]}>{stats.closed.length}</Text>
                  <Text style={[styles.reportStatLabel, { color: themeColors.textSecondary }]}>Closed</Text>
                </View>
              </View>

              {/* Risk Distribution */}
              <Text style={[styles.reportSection, { color: themeColors.text }]}>Risk Distribution</Text>
              <View style={styles.reportBarGroup}>
                <ReportBar label="High" count={stats.highRisk.length} total={stats.active.length} color="#EF4444" themeColors={themeColors} />
                <ReportBar label="Medium" count={stats.mediumRisk.length} total={stats.active.length} color="#F59E0B" themeColors={themeColors} />
                <ReportBar label="Low" count={stats.lowRisk.length} total={stats.active.length} color="#10B981" themeColors={themeColors} />
              </View>

              {/* Outcomes */}
              {stats.closed.length > 0 && (
                <>
                  <Text style={[styles.reportSection, { color: themeColors.text }]}>Case Outcomes</Text>
                  <View style={styles.outcomesRow}>
                    <OutcomeStat label="Normal" count={outcomes.normal} color="#10B981" icon="checkmark-circle" />
                    <View style={[styles.outcomeDivider, { backgroundColor: themeColors.border }]} />
                    <OutcomeStat label="PPH Resolved" count={outcomes.pphResolved} color="#F59E0B" icon="medkit" />
                    <View style={[styles.outcomeDivider, { backgroundColor: themeColors.border }]} />
                    <OutcomeStat label="Referred" count={outcomes.referred} color="#6366F1" icon="arrow-redo" />
                  </View>
                </>
              )}

              {/* Recent Activity */}
              <Text style={[styles.reportSection, { color: themeColors.text }]}>Recent Activity</Text>
              {recentCases.slice(0, 5).map(p => {
                const statusConf = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pre_delivery;
                const riskColors = RISK_COLORS[p.risk_level as RiskLevel] ?? RISK_COLORS.low;
                return (
                  <View key={p.local_id} style={[styles.reportCaseRow, { borderBottomColor: themeColors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reportCaseName, { color: themeColors.text }]}>
                        {p.patient_id || 'Patient'} · Age {p.age}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <View style={[styles.miniChip, { backgroundColor: statusConf.color + '15' }]}>
                          <Text style={[styles.miniChipText, { color: statusConf.color }]}>{statusConf.label}</Text>
                        </View>
                        <View style={[styles.miniChip, { backgroundColor: riskColors.bg }]}>
                          <Text style={[styles.miniChipText, { color: riskColors.text }]}>{RISK_LABELS[p.risk_level as RiskLevel] ?? 'Low'}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.reportCaseTime, { color: themeColors.textSecondary }]}>
                      {getTimeAgo(p.updated_at)} ago
                    </Text>
                  </View>
                );
              })}

              {recentCases.length === 0 && (
                <Text style={[styles.reportEmpty, { color: themeColors.textSecondary }]}>No cases recorded yet</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ReportBar({ label, count, total, color, themeColors }: {
  label: string; count: number; total: number; color: string; themeColors: any;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.reportBarRow}>
      <Text style={[styles.reportBarLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      <View style={[styles.reportBar, { backgroundColor: themeColors.border }]}>
        <View style={[styles.reportBarFill, { backgroundColor: color, width: `${Math.max(pct, 2)}%` }]} />
      </View>
      <Text style={[styles.reportBarCount, { color }]}>{count}</Text>
      <Text style={[styles.reportBarPct, { color: themeColors.textSecondary }]}>{pct}%</Text>
    </View>
  );
}

function OutcomeStat({ label, count, color, icon }: {
  label: string; count: number; color: string; icon: string;
}) {
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
  // Gradient card
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

  // Highlights
  highlightList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.smd,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightName: {
    ...Typography.labelSm,
    fontSize: 13,
  },
  highlightSub: {
    ...Typography.bodySm,
    fontSize: 11,
    marginTop: 1,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.smd,
  },
  actionsGridWeb: {
    gap: Spacing.md,
  },

  // Section
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

  // ── Reports Modal ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.headingMd,
  },

  // Report stats
  reportSummary: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reportStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.smd,
    borderRadius: Radius.lg,
  },
  reportStatNum: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  reportStatLabel: {
    ...Typography.bodySm,
    fontSize: 11,
    marginTop: 2,
  },
  reportSection: {
    ...Typography.labelMd,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Bar chart
  reportBarGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reportBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reportBarLabel: {
    width: 55,
    ...Typography.bodySm,
    fontSize: 12,
  },
  reportBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  reportBarFill: {
    height: 8,
    borderRadius: 4,
  },
  reportBarCount: {
    width: 20,
    ...Typography.labelSm,
    textAlign: 'right',
  },
  reportBarPct: {
    width: 30,
    ...Typography.bodySm,
    fontSize: 11,
    textAlign: 'right',
  },

  // Outcomes
  outcomesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  outcomeStat: {
    flex: 1,
    alignItems: 'center',
  },
  outcomeIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  outcomeCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  outcomeLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  outcomeDivider: {
    width: 1,
    height: 36,
  },

  // Recent activity in report
  reportCaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reportCaseName: {
    ...Typography.labelSm,
    fontSize: 13,
  },
  reportCaseTime: {
    ...Typography.bodySm,
    fontSize: 11,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  miniChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  reportEmpty: {
    ...Typography.bodySm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
