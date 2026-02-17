import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, Radius } from '@/constants/theme';

interface DashboardHeaderProps {
  displayName: string;
  roleBadge: string;
  avatarUrl: string | null;
  isOffline: boolean;
}

export function DashboardHeader({ displayName, roleBadge, avatarUrl, isOffline }: DashboardHeaderProps) {
  const tint = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');

  return (
    <View style={styles.header}>
      <View>
        <View style={styles.greetingRow}>
          <Image
            source={require('@/assets/images/app-logo-small.png')}
            style={styles.smallLogo}
            contentFit="contain"
          />
          <ThemedText type="overline">{roleBadge}</ThemedText>
          {isOffline && (
            <View style={[styles.offlineBadge, { backgroundColor: errorColor + '15', borderColor: errorColor }]}>
              <ThemedText style={[styles.offlineText, { color: errorColor }]}>OFFLINE</ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="displaySm">{displayName}</ThemedText>
      </View>
      <Pressable
        style={styles.profileButton}
        onPress={() => router.push('/(app)/profile')}
      >
        <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <ThemedText style={[styles.avatarText, { color: tint }]}>
              {displayName?.charAt(0).toUpperCase()}
            </ThemedText>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  smallLogo: {
    width: 20,
    height: 20,
    marginRight: -Spacing.xs,
  },
  offlineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 8,
    fontWeight: '900',
  },
  profileButton: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
