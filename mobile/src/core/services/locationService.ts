/**
 * ขอตำแหน่ง GPS จากมือถือ
 *
 * *** ไฟล์นี้ทำหน้าที่แค่ "ขอพิกัด" เท่านั้น ***
 * การคำนวณระยะทางและการค้นหาร้านใกล้เคียง ทำที่ Backend (กฎเหล็กข้อ 2)
 */
import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const locationService = {
  /** ขอสิทธิ์เข้าถึงตำแหน่ง */
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /** ดึงพิกัดปัจจุบัน คืน null ถ้าผู้ใช้ไม่อนุญาต */
  async getCurrentPosition(): Promise<Coordinates | null> {
    const granted = await locationService.requestPermission();
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  },

  /** พิกัดสำรอง (อนุสาวรีย์ชัยสมรภูมิ) ใช้ตอนผู้ใช้ไม่ยอมให้เข้าถึง GPS */
  fallbackPosition: {
    latitude: 13.7649,
    longitude: 100.5383,
  } as Coordinates,
};

export default locationService;
