// Fallback for using Ionicons on Android and web.
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof Ionicons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': 'home-outline',
  'paperplane.fill': 'send-outline',
  'chevron.left.forwardslash.chevron.right': 'code-slash-outline',
  'chevron.right': 'chevron-forward-outline',
  'heart.fill': 'heart-outline',
  'lock.fill': 'lock-closed-outline',
  'person.badge.plus.fill': 'person-add-outline',
  'envelope.fill': 'mail-outline',
  'person.fill': 'person-outline',
  'clock.fill': 'time-outline',
  'at': 'at-outline',
  'plus': 'add-outline',
  'calendar': 'calendar-outline',
  'person.2.fill': 'people-outline',
  'doc.text.fill': 'document-text-outline',
  'gearshape.fill': 'settings-outline',
  'shield.fill': 'shield-checkmark-outline',
  'camera.fill': 'camera-outline',
  'moon.fill': 'moon-outline',
  'sun.max.fill': 'sunny-outline',
  'finger-print-outline': 'finger-print-outline',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <Ionicons color={color} size={size} name={MAPPING[name]} style={style} />;
}
