/**
 * ป้ายแสดงสถานะ (ใช้ทั้งสถานะการจองและสถานะร้าน)
 *
 * หลัก UX : ไม่ใช้สีอย่างเดียวบอกความหมาย แต่มีข้อความกำกับด้วยเสมอ
 * เพื่อให้คนตาบอดสีก็เข้าใจได้
 *
 * ข้อความภาษาไทยดึงมาจาก shared/src/labels.ts (ตัวเดียวกับที่ Admin Web ใช้)
 */
import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReservationStatus, StoreStatus } from '@shared/index';
import { RESERVATION_STATUS_LABEL, STORE_STATUS_LABEL } from '@shared/index';
import { theme } from '../core/theme/theme';

/**
 * ใช้ union type เพื่อบังคับว่า status ต้องตรงกับ type ที่เลือก
 *   type='reservation' -> status ต้องเป็นสถานะการจองเท่านั้น
 *   type='store'       -> status ต้องเป็นสถานะร้านเท่านั้น
 * สลับกันไม่ได้ TypeScript จะฟ้อง
 */
type StatusBadgeProps =
  | { type?: 'reservation'; status: ReservationStatus; style?: StyleProp<ViewStyle> }
  | { type: 'store'; status: StoreStatus; style?: StyleProp<ViewStyle> };

export default function StatusBadge(props: StatusBadgeProps): JSX.Element {
  const isStore = props.type === 'store';

  const config = isStore
    ? theme.storeStatusColors[props.status]
    : theme.reservationStatusColors[props.status];

  const label = isStore
    ? STORE_STATUS_LABEL[props.status]
    : RESERVATION_STATUS_LABEL[props.status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, props.style]}>
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  text: { ...theme.textStyles.caption, fontFamily: theme.fonts.medium },
});
