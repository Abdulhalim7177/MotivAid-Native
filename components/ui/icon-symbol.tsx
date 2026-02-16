// Fallback for using Ionicons on Android and web.
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof Ionicons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'paper-plane',
  'chevron.left.forwardslash.chevron.right': 'code-slash',
  'chevron.right': 'chevron-forward',
  'heart.fill': 'heart',
  'lock.fill': 'lock-closed',
  'person.badge.plus.fill': 'person-add',
  'envelope.fill': 'mail',
  'person.fill': 'person',
  'clock.fill': 'time',
  'at': 'at',
  'plus': 'add',
  'calendar': 'calendar',
  'person.2.fill': 'people',
  'doc.text.fill': 'document-text',
  'gearshape.fill': 'settings',
  'shield.fill': 'shield-checkmark',
  'camera.fill': 'camera',
  'moon.fill': 'moon',
  'sun.max.fill': 'sunny',
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
