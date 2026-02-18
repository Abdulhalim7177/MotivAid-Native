import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionItem } from './action-item';

export function StaffDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  const RecentCaseCard = ({ name, age, para, risk, time, status }: any) => (
    <View style={[styles.caseCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.caseHeader}>
        <View>
          <Text style={[styles.patientName, { color: themeColors.text }]}>{name}</Text>
          <Text style={[styles.patientInfo, { color: themeColors.textSecondary }]}>{age} years • {para}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: risk === 'High Risk' ? '#FEE2E2' : '#D1FAE5' }]}>
          <Text style={[styles.riskText, { color: risk === 'High Risk' ? '#EF4444' : '#10B981' }]}>{risk}</Text>
        </View>
      </View>

      <View style={styles.caseFooter}>
        <View style={styles.timeContainer}>
          <IconSymbol name="clock.fill" size={14} color={themeColors.textSecondary} />
          <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>Started {time} ago</Text>
        </View>

        <View style={styles.actionRow}>
          {status === 'Monitor' && (
            <TouchableOpacity style={[styles.monitorButton, { backgroundColor: '#FCE7F3' }]}>
              <Text style={[styles.monitorText, { color: Colors.light.secondary }]}>Monitor</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={[styles.detailsText, { color: themeColors.textSecondary }]}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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

        <Text style={styles.bigStat}>3</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>2</Text>
            <Text style={styles.breakdownLabel}>High Risk</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>1</Text>
            <Text style={styles.breakdownLabel}>Low Risk</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Management */}
      <SectionHeader title="Quick Actions" variant="heading" />
      <View style={[styles.actionsGrid, Platform.OS === 'web' && styles.actionsGridWeb]}>
        <ActionItem
          label="New Case"
          icon="add-circle-outline"
          color="#EB4D88"
          onPress={() => { }}
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
          onPress={() => { }}
        />
        <ActionItem
          label="Schedule"
          icon="calendar-outline"
          color="#10B981"
          onPress={() => { }}
        />
        <ActionItem
          label="Protocols"
          icon="document-text-outline"
          color="#8B5CF6"
          onPress={() => { }}
        />
        <ActionItem
          label="Reports"
          icon="bar-chart-outline"
          color="#F59E0B"
          onPress={() => { }}
        />
      </View>

      {/* Recent Cases Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Cases</Text>
        <TouchableOpacity>
          <Text style={[styles.viewAll, { color: Colors.light.secondary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Cases List */}
      <View style={styles.casesList}>
        <RecentCaseCard
          name="Mary Johnson"
          age="32"
          para="G3P2"
          risk="High Risk"
          time="2h"
          status="Monitor"
        />
        <RecentCaseCard
          name="Linda Smith"
          age="28"
          para="G2P1"
          risk="Low Risk"
          time="4h"
          status="Details"
        />
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
    gap: Spacing.sm,
  },
  monitorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  monitorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
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
