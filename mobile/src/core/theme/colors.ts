/**
 * สีทั้งหมดของ SaveEats
 *
 * *** ห้ามเขียนโค้ดสีตรง ๆ (เช่น '#16A34A') ในหน้าจอเด็ดขาด ***
 * ให้ import จากไฟล์นี้เท่านั้น เวลาปรับธีมจะได้แก้ที่เดียว
 *
 * ชุดสีนี้ใช้ร่วมกับ admin-web/src/styles/theme.css
 * ถ้าแก้ที่นี่ ต้องไปแก้ที่นั่นให้ตรงกันด้วย ธีมจะได้ไปในทิศทางเดียวกัน
 *
 * แนวคิดของธีม
 *   เขียว  = อาหารที่ถูกช่วยไว้ ความสดใหม่ สิ่งแวดล้อม (สีหลักของแบรนด์)
 *   ส้ม    = ความอร่อย ความเร่งด่วน ใช้เน้นส่วนลดและเวลาที่เหลือ
 */
import type { ReservationStatus, StoreStatus } from '@shared/index';

export const colors = {
  // ---- สีหลักของแบรนด์ ----
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#DCFCE7',
  primarySurface: '#F0FDF4',

  // ---- สีรอง (ใช้เน้นราคาลดและเวลา) ----
  accent: '#F97316',
  accentDark: '#EA580C',
  accentLight: '#FFEDD5',

  // ---- พื้นหลังและพื้นผิว ----
  background: '#F7F9F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',

  // ---- ตัวหนังสือ ----
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // ---- เส้นขอบและเงา ----
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  shadow: 'rgba(16, 24, 40, 0.08)',
  overlay: 'rgba(17, 24, 39, 0.55)',

  // ---- สีบอกสถานะ ----
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',

  // ---- สีอื่น ----
  star: '#FBBF24',
  disabled: '#D1D5DB',
  transparent: 'transparent',
} as const;

/** หน้าตาของชุดสีประจำสถานะ */
export interface StatusColor {
  bg: string;
  text: string;
}

/**
 * สีประจำสถานะการจอง
 *
 * *** ใช้ Record<ReservationStatus, StatusColor> ***
 * ถ้าเพิ่มสถานะใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มสีที่นี่
 * TypeScript จะฟ้องทันที ไม่มีทางลืม
 */
export const reservationStatusColors: Record<ReservationStatus, StatusColor> = {
  confirmed: { bg: colors.infoBg, text: colors.info },
  waiting: { bg: colors.warningBg, text: colors.warningText },
  completed: { bg: colors.successBg, text: colors.success },
  expired: { bg: colors.surfaceAlt, text: colors.textMuted },
  cancelled: { bg: colors.errorBg, text: colors.error },
};

/** สีประจำสถานะร้าน */
export const storeStatusColors: Record<StoreStatus, StatusColor> = {
  pending: { bg: colors.warningBg, text: colors.warningText },
  approved: { bg: colors.successBg, text: colors.success },
  rejected: { bg: colors.errorBg, text: colors.error },
  suspended: { bg: colors.surfaceAlt, text: colors.textMuted },
};

export default colors;
