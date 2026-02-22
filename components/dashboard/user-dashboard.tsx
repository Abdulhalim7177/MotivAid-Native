import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useAppTheme } from '@/context/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function UserDashboard() {
  const tint = useThemeColor({}, 'tint');
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { profiles } = useClinical();

  const activeCases = profiles.filter(p => p.status !== 'closed').length;
  const highRiskCases = profiles.filter(p => p.risk_level === 'high' && p.status !== 'closed').length;

  return (
    <View style={styles.container}>
      {/* Hero Card */}
      <Card style={styles.heroCard}>
        <View style={[styles.iconCircle, { backgroundColor: tint + '15' }]}>
          <IconSymbol size={48} name="cross.case.fill" color={tint} />
        </View>
        <ThemedText type="headingSm" style={styles.cardTitle}>Start Clinical Mode</ThemedText>
        <ThemedText color="secondary" style={styles.cardDescription}>
          Begin an E-MOTIVE clinical session immediately.
        </ThemedText>
        <Button
          title="New Case"
          onPress={() => router.push('/(app)/clinical/new-patient')}
        />
      </Card>

      {/* Quick Stats */}
      {activeCases > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(app)/(tabs)/clinical')}
        >
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.primary }]}>{activeCases}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Active Cases</Text>
              </View>
              {highRiskCases > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#C62828' }]}>{highRiskCases}</Text>
                    <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>High Risk</Text>
                  </View>
                </>
              )}
            </View>
            <View style={styles.viewCasesRow}>
              <Text style={[styles.viewCasesText, { color: themeColors.primary }]}>View all cases →</Text>
            </View>
          </Card>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  heroCard: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: Spacing.md,
  },
  cardDescription: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
  },
  viewCasesRow: {
    marginTop: Spacing.smd,
    alignItems: 'center',
  },
  viewCasesText: {
    ...Typography.labelSm,
  },
});
