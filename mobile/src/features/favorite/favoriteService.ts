/**
 * favoriteService (ฝั่งแอป) - คุยกับ /api/favorites
 *
 * ทำหน้าที่แค่เรียก API ไม่มี Business Logic (กฎเหล็กข้อ 2)
 */
import type { ApiResponse, StoreSummary } from '@shared/index';
import { apiGet, apiPost, apiDelete } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

/** ร้านโปรดที่อาจมีระยะทางติดมาด้วย (ถ้าส่งพิกัดไปตอนเรียก) */
export type FavoriteStore = StoreSummary & { distance_km?: number | null };

export const favoriteService = {
  /**
   * รายการร้านโปรดทั้งหมด
   * @param coords ส่งพิกัดไปด้วยจะได้ระยะทางกลับมาแสดงบนการ์ด
   */
  async list(coords?: { latitude: number; longitude: number } | null): Promise<FavoriteStore[]> {
    const params = coords ? { lat: coords.latitude, lng: coords.longitude } : undefined;
    const res = await apiGet<ApiResponse<FavoriteStore[]>>(ENDPOINTS.FAVORITES, { params });
    return res.data;
  },

  /**
   * เลขร้านที่กดหัวใจไว้ทั้งหมด
   *
   * ใช้ตอนต้องวาดหัวใจในรายการร้านหลายร้านพร้อมกัน
   * ดึงทีเดียวจบ ดีกว่ายิงถามทีละร้าน
   */
  async listIds(): Promise<number[]> {
    const res = await apiGet<ApiResponse<number[]>>(ENDPOINTS.FAVORITE_IDS);
    return res.data;
  },

  async add(storeId: number): Promise<void> {
    await apiPost<ApiResponse<unknown>>(ENDPOINTS.FAVORITE_ONE(storeId), {});
  },

  async remove(storeId: number): Promise<void> {
    await apiDelete<ApiResponse<unknown>>(ENDPOINTS.FAVORITE_ONE(storeId));
  },

  /** สลับสถานะหัวใจ คืนค่าใหม่หลังสลับ */
  async toggle(storeId: number, currentlyFavorite: boolean): Promise<boolean> {
    if (currentlyFavorite) {
      await favoriteService.remove(storeId);
      return false;
    }
    await favoriteService.add(storeId);
    return true;
  },
};

export default favoriteService;
