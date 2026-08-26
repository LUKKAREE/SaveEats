/**
 * app.config.ts - ตัวปรับค่าตั้งของแอปตอนเปิด
 *
 * *** ทำไมต้องมีไฟล์นี้ทั้งที่มี app.json อยู่แล้ว ***
 *
 * app.json เป็นไฟล์ธรรมดา ใส่ค่าตายตัวได้อย่างเดียว
 * แต่ Google Maps API Key เป็น "ความลับ" ห้ามขึ้น GitHub (กฎเหล็กข้อ 6)
 * ถ้าใส่ตรง ๆ ใน app.json แล้ว commit ขึ้นไป ใครก็เอาคีย์เราไปใช้ได้
 * และ Google อาจเรียกเก็บเงินจากเจ้าของคีย์
 *
 * ไฟล์นี้เป็นโค้ด จึงอ่านค่าจากไฟล์ .env ได้
 * Expo จะอ่านไฟล์นี้แทน app.json แล้วเอาค่าใน app.json มาเป็นฐานให้อัตโนมัติ
 *
 * *** สรุปสั้น ๆ ***
 *   app.json        = ค่าตั้งทั่วไปที่ขึ้น git ได้
 *   .env            = คีย์ลับ ไม่ขึ้น git
 *   app.config.ts   = เอาสองอันมารวมกันตอนเปิดแอป
 *
 * วิธีใส่คีย์ : ดูขั้นตอนละเอียดในไฟล์ docs/02_วิธีติดตั้งและรัน.txt หัวข้อ 5
 */
import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * อ่านคีย์จากไฟล์ .env
 *
 * Expo SDK 51 อ่านไฟล์ .env ให้เองอัตโนมัติก่อนจะรันไฟล์นี้
 * ไม่ต้องติดตั้ง dotenv เพิ่ม
 *
 * ถ้ายังไม่ได้ใส่คีย์ จะได้ข้อความว่างกลับมา ซึ่งไม่ทำให้แอปพัง
 * แค่หน้าแผนที่จะเป็นจอเทาเท่านั้น ส่วนอื่นใช้งานได้ปกติ
 */
const googleMapsApiKey = process.env['GOOGLE_MAPS_API_KEY'] ?? '';

export default ({ config }: ConfigContext): ExpoConfig => {
  // เตือนตอนเปิดแอป ถ้ายังไม่ได้ใส่คีย์ จะได้ไม่งงว่าทำไมแผนที่เป็นจอเทา
  if (googleMapsApiKey === '') {
    console.warn(
      '\n[SaveEats] ยังไม่ได้ใส่ GOOGLE_MAPS_API_KEY ในไฟล์ mobile/.env' +
        '\n           หน้าแผนที่จะเป็นจอเทา ส่วนอื่นของแอปใช้งานได้ปกติ' +
        '\n           วิธีขอคีย์ : ดู docs/02_วิธีติดตั้งและรัน.txt หัวข้อ 5\n'
    );
  }

  return {
    // เอาค่าทั้งหมดจาก app.json มาเป็นฐาน
    ...config,
    name: config.name ?? 'SaveEats',
    slug: config.slug ?? 'saveeats',

    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },

    ios: {
      ...config.ios,
      // iOS ใช้ Apple Maps อยู่แล้ว จึงไม่ต้องมีคีย์ก็เห็นแผนที่
      // ใส่ไว้เผื่อวันหนึ่งอยากเปลี่ยนไปใช้ Google Maps บน iOS ด้วย
      ...(googleMapsApiKey !== '' ? { config: { googleMapsApiKey } } : {}),
    },
  };
};
