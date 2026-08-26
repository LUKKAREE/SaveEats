/**
 * locationService - ค้นหาร้านใกล้เคียง
 *
 * *** กฎเหล็กข้อ 2 : การคำนวณระยะทางต้องทำที่ Backend ***
 *
 * วิธีทำงาน 2 ขั้น (เพื่อความเร็ว)
 *   ขั้น 1 : ให้ MySQL กรองด้วยกรอบสี่เหลี่ยมก่อน (ใช้ index ได้ เร็วมาก)
 *   ขั้น 2 : เอาผลที่ได้มาคำนวณระยะทางจริงด้วยสูตร Haversine ใน Node
 *            แล้วตัดร้านที่อยู่นอกรัศมีวงกลมออก
 */
import env from '../config/env';
import { distanceKm, boundingBox } from '../utils/geo';
import storeModel from '../models/storeModel';
import type { StoreSummary, StoreWithDistance } from '@shared/index';

/** ร้านพร้อมระยะทาง */
/**
 * ร้านใกล้เคียง = ร้านแบบย่อ + ระยะทาง
 * ใช้ชนิดเดียวกับที่แอปมือถือใช้ (StoreWithDistance ใน shared)
 */
export type StoreNearby = StoreWithDistance;

/** อะไรก็ตามที่มีพิกัดอยู่ในตัว */
interface HasCoordinates {
  latitude: number | null;
  longitude: number | null;
}

export const locationService = {
  /**
   * @param lat ตำแหน่งลูกค้า
   * @param lng ตำแหน่งลูกค้า
   * @param radiusKm รัศมีค้นหา (กม.)
   * @returns รายการร้าน เรียงจากใกล้ไปไกล มี distance_km ติดมาด้วย
   */
  async findNearbyStores(
    lat: number,
    lng: number,
    radiusKm: number = env.DEFAULT_SEARCH_RADIUS_KM
  ): Promise<StoreNearby[]> {
    const box = boundingBox(lat, lng, radiusKm);
    const candidates = await storeModel.findInBoundingBox(box);

    return candidates
      .filter((s): s is StoreSummary & HasCoordinates =>
        s.latitude !== null && s.longitude !== null)
      .map((s) => ({
        ...s,
        distance_km: Number(distanceKm(lat, lng, Number(s.latitude), Number(s.longitude)).toFixed(2)),
      }))
      .filter((s) => s.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  },

  /** เติมระยะทางให้รายการโพสต์ (ใช้ตอนกรอง Feed ตามระยะทาง) */
  attachDistance<T extends HasCoordinates>(
    items: T[],
    lat: number,
    lng: number
  ): Array<T & { distance_km: number | null }> {
    return items.map((item) => ({
      ...item,
      distance_km:
        item.latitude === null || item.longitude === null
          ? null
          : Number(distanceKm(lat, lng, Number(item.latitude), Number(item.longitude)).toFixed(2)),
    }));
  },
};

export default locationService;
