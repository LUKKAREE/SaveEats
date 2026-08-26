/**
 * ธีมรวมของ SaveEats
 * import ที่เดียวได้ทั้ง สี ตัวหนังสือ ระยะห่าง ความโค้ง เงา
 *
 *   import { theme } from '../../core/theme/theme';
 *   ...
 *   <View style={{ padding: theme.spacing.md, borderRadius: theme.radius.lg }} />
 */
import type { ViewStyle } from 'react-native';
import colors, { reservationStatusColors, storeStatusColors } from './colors';
import textStyles, { fonts } from './textStyles';

/** ระยะห่าง ใช้ระบบทวีคูณของ 4 เพื่อให้หน้าตาสม่ำเสมอทั้งแอป */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** ความโค้งของมุม */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** เงา (แยกโค้ดระหว่าง iOS กับ Android) */
export const shadows: Record<'card' | 'floating', ViewStyle> = {
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};

/** ขนาดมาตรฐานของส่วนประกอบ (ปุ่มสูง 48 = แตะง่ายตามหลัก UX) */
export const sizes = {
  buttonHeight: 48,
  inputHeight: 48,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
  avatarSm: 32,
  avatarMd: 48,
  cardImageHeight: 180,
} as const;

export const theme = {
  colors,
  textStyles,
  fonts,
  spacing,
  radius,
  shadows,
  sizes,
  reservationStatusColors,
  storeStatusColors,
} as const;

export default theme;
export { colors, textStyles, fonts, reservationStatusColors, storeStatusColors };
