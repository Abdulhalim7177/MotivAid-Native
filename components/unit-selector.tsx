import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Modal, FlatList } from 'react-native';
import { useUnits } from '@/context/unit';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius } from '@/constants/theme';

export default function UnitSelector() {
  const { activeUnit, availableUnits, setActiveUnit } = useUnits();
  const [modalVisible, setModalVisible] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'overlay');

  if (!activeUnit) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.selector, { borderColor }]}
        onPress={() => {
          if (availableUnits.length > 1) {
            setModalVisible(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
      >
        <IconSymbol name="home-outline" size={16} color={tint} />
        <View style={styles.textContainer}>
          <ThemedText type="overline">{activeUnit.facilities.name}</ThemedText>
          <ThemedText type="labelLg">{activeUnit.name}</ThemedText>
        </View>
        {availableUnits.length > 1 && (
          <IconSymbol name="chevron-forward-outline" size={14} color={textColor} style={{ transform: [{ rotate: '90deg' }] }} />
        )}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: overlayColor }]}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="headingSm">Select Unit</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <IconSymbol name="close" size={24} color={textColor} />
              </Pressable>
            </View>

            <FlatList
              data={availableUnits}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.unitItem,
                    { borderColor },
                    activeUnit.id === item.id && { backgroundColor: tint + '10', borderColor: tint }
                  ]}
                  onPress={() => {
                    setActiveUnit(item);
                    setModalVisible(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <View>
                    <ThemedText type="labelLg">{item.name}</ThemedText>
                    <ThemedText type="caption" color="secondary">{item.facilities.name}</ThemedText>
                  </View>
                  {activeUnit.id === item.id && (
                    <IconSymbol name="checkmark" size={20} color={tint} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.mdl,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.smd,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.smd,
  },
  textContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.smd,
  },
});
