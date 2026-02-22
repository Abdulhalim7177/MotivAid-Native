// Fallback for using Ionicons on Android and web.
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Allow any string key to avoid "missing properties" error, but we'll restrict the input type later
type IconMapping = Record<string, ComponentProps<typeof Ionicons>['name']>;
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
  'close': 'close-outline',
  'checkmark': 'checkmark-outline',
  'person': 'person-outline',
  'envelope': 'mail-outline',
  'phone': 'call-outline',
  'building.2': 'business-outline',
  'checkmark.circle.fill': 'checkmark-circle',
  'arrow.left': 'arrow-back-outline',
  'eye': 'eye-outline',
  'eye.slash': 'eye-off-outline',
  'touchid': 'finger-print-outline',
  'bell': 'notifications-outline',
  'book.fill': 'book-outline',
  'arrow.right.square': 'log-out-outline',
  'questionmark.circle': 'help-circle-outline',
  'hand.raised.fill': 'hand-left-outline',
  // Ionicons outline icons used directly (self-mapped)
  'grid-outline': 'grid-outline',
  'people-outline': 'people-outline',
  'bar-chart-outline': 'bar-chart-outline',
  'calendar-outline': 'calendar-outline',
  'document-text-outline': 'document-text-outline',
  'settings-outline': 'settings-outline',
  'id-card-outline': 'id-card-outline',
  'person-add-outline': 'person-add-outline',
  'add-circle-outline': 'add-circle-outline',
  'book-outline': 'book-outline',
  // Common additional icons
  'pencil': 'pencil-outline',
  'trash': 'trash-outline',
  'xmark': 'close-outline',
  'xmark.circle.fill': 'close-circle',
  'square.grid.2x2.fill': 'grid-outline',
  'clock.arrow.circlepath': 'time-outline',
  'info.circle': 'information-circle-outline',
  'pause.circle': 'pause-circle-outline',
  'play.circle': 'play-circle-outline',
  // Clinical / medical
  'cross.case.fill': 'medkit-outline',
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
