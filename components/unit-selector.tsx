import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useUnits } from '@/context/unit';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';

export default function UnitSelector() {
  const { activeUnit, availableUnits, setActiveUnit } = useUnits();
  const [modalVisible, setModalVisible] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  if (!activeUnit) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
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
          <ThemedText style={styles.facilityName}>{activeUnit.facilities.name}</ThemedText>
          <ThemedText style={styles.unitName}>{activeUnit.name}</ThemedText>
        </View>
        {availableUnits.length > 1 && (
          <IconSymbol name="chevron-forward-outline" size={14} color={textColor} style={{ transform: [{ rotate: '90deg' }] }} />
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select Unit</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableUnits}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
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
                    <ThemedText style={styles.itemUnitName}>{item.name}</ThemedText>
                    <ThemedText style={styles.itemFacilityName}>{item.facilities.name}</ThemedText>
                  </View>
                  {activeUnit.id === item.id && (
                    <IconSymbol name="checkmark" size={20} color={tint} />
                  )}
                </TouchableOpacity>
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
    marginBottom: 20,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  facilityName: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemUnitName: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemFacilityName: {
    fontSize: 12,
    opacity: 0.6,
  },
});
