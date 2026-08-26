/**
 * รูปแบบตัวหนังสือทั้งหมดของแอป
 * ใช้ฟอนต์ Prompt ซึ่งอ่านภาษาไทยสบายตาที่สุดในบรรดาฟอนต์ฟรี
 *
 * *** ไม่ต้องโหลดไฟล์ฟอนต์เอง ***
 * ฟอนต์มาจากแพ็กเกจ @expo-google-fonts/prompt ที่ติดตั้งผ่าน npm
 * ชื่อฟอนต์ข้างล่างต้องตรงกับชื่อที่ App.tsx ลงทะเบียนไว้เป๊ะ ๆ
 */
import type { TextStyle } from 'react-native';
import colors from './colors';

/**
 * ชื่อฟอนต์ที่ลงทะเบียนไว้ใน App.tsx
 *
 * ชื่อเหล่านี้เป็นชื่อที่แพ็กเกจ @expo-google-fonts/prompt ตั้งมาให้
 * (เลขคือน้ำหนักฟอนต์ 400 = ปกติ, 500 = กลาง, 600 = กึ่งหนา, 700 = หนา)
 */
export const fonts = {
  regular: 'Prompt_400Regular',
  medium: 'Prompt_500Medium',
  semiBold: 'Prompt_600SemiBold',
  bold: 'Prompt_700Bold',
} as const;

/**
 * ชื่อรูปแบบตัวหนังสือที่มีให้ใช้
 * ประกาศเป็น Record<..., TextStyle> เพื่อให้ TypeScript ตรวจว่า
 * ค่าที่ใส่เป็นสไตล์ที่ React Native รู้จักจริง ๆ (พิมพ์ผิดจะฟ้องทันที)
 */
export type TextStyleName =
  | 'title' | 'heading' | 'subheading' | 'body' | 'bodyMuted'
  | 'caption' | 'button' | 'price' | 'priceStrike';

export const textStyles: Record<TextStyleName, TextStyle> = {
  /** หัวข้อใหญ่สุด เช่น ชื่อหน้าจอ */
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  /** หัวข้อรอง เช่น ชื่อร้านในการ์ด */
  heading: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 27,
    color: colors.textPrimary,
  },
  /** หัวข้อย่อย */
  subheading: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  /** ตัวอักษรทั่วไป */
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  /** ตัวอักษรรอง สีจางกว่า */
  bodyMuted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  /** ตัวเล็ก เช่น เวลา ป้ายสถานะ */
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  /** ตัวหนังสือบนปุ่ม */
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  /** ราคาที่ลดแล้ว (ตัวใหญ่ สีส้ม) */
  price: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.accent,
  },
  /** ราคาปกติ (ขีดฆ่า) */
  priceStrike: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
};

export default textStyles;
