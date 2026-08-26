/**
 * storeService - ข้อมูลร้านของตัวเอง (ฝั่งแอป)
 */
import type { ApiResponse, MyStorePayload, Store, UpdateStoreRequest } from '@shared/index';
import { apiGet, uploadRequest } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const storeService = {
  /** ข้อมูลร้าน + คลังเมนู + คะแนนความประพฤติ ในครั้งเดียว */
  async getMyStore(): Promise<MyStorePayload> {
    const res = await apiGet<ApiResponse<MyStorePayload>>(ENDPOINTS.MY_STORE);
    return res.data;
  },

  async updateMyStore(body: UpdateStoreRequest, image: PickedImage | null): Promise<Store> {
    const res = await uploadRequest<ApiResponse<Store>>(ENDPOINTS.MY_STORE, {
      storeName: body.storeName,
      description: body.description,
      address: body.address,
      phone: body.phone,
      latitude: body.latitude,
      longitude: body.longitude,
      openTime: body.openTime,
      closeTime: body.closeTime,
    }, image, 'put');
    return res.data;
  },
};

export default storeService;
