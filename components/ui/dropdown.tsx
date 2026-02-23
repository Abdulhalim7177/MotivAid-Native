import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DropdownOption {
  label: string;
  value: string;
  count?: number;
}

interface DropdownProps {
  label?: string;
  value: string | null;
  options: DropdownOption[];
  onSelect: (value: string | null) => void;
  placeholder?: string;
  icon?: string;
  allLabel?: string;
}

export function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select option',
  icon = 'filter-outline',
  allLabel = 'All',
}: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : allLabel;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{label || placeholder}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[{ label: allLabel, value: null }, ...options]}
                keyExtractor={(item) => String(item.value)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.border },
                      value === item.value && { backgroundColor: colors.primary + '10' }
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText, 
                      { color: value === item.value ? colors.primary : colors.text }
                    ]}>
                      {item.label}
                    </Text>
                    {item.count !== undefined && (
                      <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.countText, { color: colors.textSecondary }]}>{item.count}</Text>
                      </View>
                    )}
                    {value === item.value && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    ...Typography.overline,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  triggerText: {
    flex: 1,
    ...Typography.bodyMd,
    fontWeight: '600',
  },
  safeArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.headingSm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  optionText: {
    flex: 1,
    ...Typography.bodyMd,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countText: {
    ...Typography.overline,
    fontSize: 10,
  },
});
