/**
 * postService - โพสต์ประกาศขายของร้าน (ฝั่งแอป)
 */
import type { ApiResponse, FeedItem, CreatePostRequest } from '@shared/index';
import { apiGet, apiDelete, uploadRequest } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const postService = {
  /** โพสต์ทั้งหมดของร้านตัวเอง (เห็นทุกสถานะ) */
  async listMine(): Promise<FeedItem[]> {
    const res = await apiGet<ApiResponse<FeedItem[]>>(ENDPOINTS.MY_POSTS);
    return res.data;
  },

  /**
   * สร้างโพสต์ขายจากเมนูในคลัง
   * ถ้าไม่แนบรูป ระบบจะใช้รูปของเมนูแทนอัตโนมัติ
   */
  async create(body: CreatePostRequest, image: PickedImage | null): Promise<FeedItem> {
    const res = await uploadRequest<ApiResponse<FeedItem>>(ENDPOINTS.POSTS, {
      foodId: body.foodId,
      discountPrice: body.discountPrice,
      quantity: body.quantity,
      pickupStart: body.pickupStart,
      pickupEnd: body.pickupEnd,
      caption: body.caption,
    }, image, 'post');
    return res.data;
  },

  async remove(postId: number): Promise<void> {
    await apiDelete<ApiResponse<null>>(ENDPOINTS.POST_DETAIL(postId));
  },
};

export default postService;
