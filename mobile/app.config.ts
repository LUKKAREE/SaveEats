/**
 * app.config.ts - ตัวปรับค่าตั้งของแอปตอนเปิด
 *
 * *** ทำไมต้องมีไฟล์นี้ทั้งที่มี app.json อยู่แล้ว ***
 *
 * app.json เป็นไฟล์ธรรมดา ใส่ค่าตายตัวได้อย่างเดียว
 * ไฟล์นี้เป็นโค้ด จึงอ่านค่าลับจากไฟล์ .env ได้ (ค่าลับห้ามขึ้น git - กฎเหล็กข้อ 6)
 * Expo จะอ่านไฟล์นี้แทน app.json แล้วเอาค่าใน app.json มาเป็นฐานให้อัตโนมัติ
 *
 * *** เรื่องแผนที่ ***
 *
 * แอปเปลี่ยนมาใช้ OpenStreetMap (components/OsmMap.tsx) แล้ว
 * จึง **ไม่ต้องใช้ Google Maps API Key อีกต่อไป** ใครดึงโค้ดไป build ก็เห็นแผนที่ทันที
 *
 * ส่วนที่เหลือข้างล่างเก็บไว้เผื่อวันหลังอยากกลับไปใช้ Google Maps
 * ถ้าไม่ได้ใส่คีย์ใน .env ก็ไม่มีผลอะไร ระบบจะข้ามไปเฉย ๆ
 */
import type { ExpoConfig, ConfigContext } from 'expo/config';

const googleMapsApiKey = process.env['GOOGLE_MAPS_API_KEY'] ?? '';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    // เอาค่าทั้งหมดจาก app.json มาเป็นฐาน
    ...config,
    name: config.name ?? 'SaveEats',
    slug: config.slug ?? 'saveeats',

    android: {
      ...config.android,
      // ใส่คีย์ให้เฉพาะตอนที่มีจริงเท่านั้น ไม่มีก็ไม่ต้องมีบรรทัดนี้ในไฟล์ build
      ...(googleMapsApiKey !== ''
        ? { config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },

    ios: {
      ...config.ios,
      ...(googleMapsApiKey !== '' ? { config: { googleMapsApiKey } } : {}),
    },
  };
};
