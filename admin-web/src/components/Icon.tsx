/**
 * ไอคอนของเว็บแอดมิน
 *
 * *** ใช้ฟอนต์ Ionicons ตัวเดียวกับแอปมือถือ ***
 * ไฟล์ฟอนต์คือ public/fonts/Ionicons.ttf ซึ่งก๊อปมาจาก node_modules ของ mobile
 * ทำให้ไอคอนบนเว็บกับบนมือถือเป็นรูปเดียวกันเป๊ะ ธีมจึงไปในทิศทางเดียวกัน
 *
 * *** ทำไมไม่ลง react-icons หรือ font-awesome ***
 *   1. ต้องติดตั้ง package เพิ่ม ซึ่งต้องมีเน็ตตอน npm install
 *   2. รูปจะไม่ตรงกับฝั่งมือถือ เพราะคนละชุดไอคอน
 * วิธีนี้ใช้ไฟล์ที่มีอยู่แล้ว ไม่ต้องลงอะไรเพิ่มเลย
 *
 * *** ทำไมไม่ใช้ emoji แบบเดิม ***
 * emoji ถูกวาดโดยระบบปฏิบัติการ ไม่ใช่โดยเรา
 * Windows / macOS / Android จึงเห็นเป็นคนละรูป คนละสไตล์ และเปลี่ยนสีไม่ได้
 * ไอคอนจากฟอนต์เปลี่ยนสีตาม CSS ได้ และเหมือนกันทุกเครื่อง
 *
 * วิธีใช้
 *   <Icon name="storefront" />
 *   <Icon name="warning" size={18} color="var(--color-error)" />
 */

/**
 * รหัสอักขระของไอคอนแต่ละตัวในฟอนต์ Ionicons
 *
 * เพิ่มไอคอนใหม่ได้โดยเปิดดูรหัสที่
 *   mobile/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json
 */
export const ICON_GLYPHS = {
  // ---- เมนูหลัก ----
  'stats-chart': '',
  hourglass: '',
  storefront: '',
  star: '',
  people: '',
  'document-text': '',
  receipt: '',
  'chatbubble-ellipses': '',
  flag: '',
  leaf: '',
  'leaf-outline': '',

  // ---- การ์ดสรุปในแดชบอร์ด ----
  'trending-up': '',
  business: '',
  'fast-food': '',
  trash: '',
  cash: '',

  // ---- กล่องแจ้งสถานะ ----
  warning: '',
  'checkmark-circle': '',
  'alert-circle': '',
  'information-circle': '',
  bulb: '',

  // ---- อื่น ๆ ----
  // ลูกศรชี้ขวา ใช้บอกว่าการ์ดนี้กดแล้วไปหน้าอื่นต่อได้
  "chevron-forward": "\uf23b",
  refresh: '',
  'log-out': '',
  'person-circle': '',
  search: '',
} as const;

export type IconName = keyof typeof ICON_GLYPHS;

interface IconProps {
  name: IconName;
  /** ขนาดเป็น px (ค่าเริ่มต้น 18) */
  size?: number;
  /** ไม่ใส่ = ใช้สีของตัวหนังสือที่ครอบอยู่ */
  color?: string;
  className?: string;
}

export default function Icon({ name, size = 18, color, className }: IconProps) {
  return (
    <span
      className={className === undefined ? 'icon' : `icon ${className}`}
      style={{ fontSize: size, color }}
      /*
       * ไอคอนเป็นของประดับ ไม่ใช่เนื้อหา
       * ซ่อนจากโปรแกรมอ่านหน้าจอ ไม่งั้นคนตาบอดจะได้ยินอักขระประหลาด
       * ที่ไม่มีความหมายอะไรเลยแทรกอยู่กลางข้อความ
       */
      aria-hidden="true"
    >
      {ICON_GLYPHS[name]}
    </span>
  );
}
