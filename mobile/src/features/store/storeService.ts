/**
 * storeService (ฝั่งลูกค้า) - ดูข้อมูลร้านของคนอื่น
 *
 * *** อย่าสับสนกับ src/seller/services/storeService.ts ***
 *   ไฟล์นี้        = ลูกค้าดูร้าน (อ่านอย่างเดียว)
 *   ไฟล์ฝั่ง seller = ร้านแก้ข้อมูลร้านตัวเอง (แก้ไขได้)
 */
import type { ApiResponse, StoreDetailPayload, StoreWithDistance } from '@shared/index';
import { apiGet } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const storeService = {
  /**
   * รายละเอียดร้าน + โพสต์ที่กำลังขายอยู่ของร้านนั้น ในครั้งเดียว
   * Backend จะคืน 404 ถ้าร้านยังไม่อนุมัติหรือถูกระงับ
   */
  async getDetail(storeId: number): Promise<StoreDetailPayload> {
    const res = await apiGet<ApiResponse<StoreDetailPayload>>(ENDPOINTS.STORE_DETAIL(storeId));
    return res.data;
  },

  /**
   * ร้านใกล้เคียง ใช้ในหน้าแผนที่
   *
   * @param radius รัศมีเป็นกิโลเมตร ไม่ส่งมาจะใช้ค่าเริ่มต้นที่ตั้งไว้ใน backend/.env
   *
   * ข้อมูลที่ได้เรียงจากใกล้ไปไกลมาให้แล้ว ไม่ต้องเรียงเองอีก
   */
  async getNearby(lat: number, lng: number, radius?: number): Promise<StoreWithDistance[]> {
    const res = await apiGet<ApiResponse<StoreWithDistance[]>>(ENDPOINTS.STORES_NEARBY, {
      params: radius === undefined ? { lat, lng } : { lat, lng, radius },
    });
    return res.data;
  },
};

export default storeService;
