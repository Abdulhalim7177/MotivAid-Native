import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardHeaderProps {
  displayName: string;
  roleBadge: string;
  avatarUrl: string | null;
  isOffline: boolean;
}

export function DashboardHeader({ displayName, roleBadge, avatarUrl, isOffline }: DashboardHeaderProps) {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  return (
    <View style={styles.header}>
      <View style={styles.textContainer}>
        <Text style={[styles.greeting, { color: themeColors.text }]}>Hello, {displayName.split(' ')[0]}</Text>
        <Text style={[styles.subtext, { color: themeColors.textSecondary }]}>
          {roleBadge.charAt(0).toUpperCase() + roleBadge.slice(1).toLowerCase()} • City Hospital
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: themeColors.card }]}>
          <IconSymbol name="bell" size={20} color={themeColors.text} />
          <View style={styles.badge} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
          <View style={[styles.avatarContainer, { backgroundColor: themeColors.primary + '20' }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.primary }}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    ...Typography.headingLg,
    fontWeight: 'bold',
  },
  subtext: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.secondary,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
