import React from 'react';
import { StyleSheet, ScrollView, View, ViewStyle, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: ScrollViewProps;
}

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentContainerStyle,
  scrollViewProps,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');

  const paddingTop = edges.includes('top') ? insets.top + Spacing.md : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom + Spacing.xxl : Spacing.xxl;

  if (scroll) {
    return (
      <View style={[styles.flex, { backgroundColor }]}>
        <ScrollView
          contentContainerStyle={[
            {
              paddingTop,
              paddingBottom,
            },
            padded && styles.padded,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor,
          paddingTop,
          paddingBottom,
        },
        padded && styles.padded,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.lg,
  },
});
