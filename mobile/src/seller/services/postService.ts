/**
 * postService - โพสต์ประกาศขายของร้าน (ฝั่งแอป)
 */
import type { ApiResponse, FeedItem, CreatePostRequest, UpdatePostRequest } from '@shared/index';
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

  /**
   * แก้ไขโพสต์ที่ลงขายไปแล้ว
   *
   * *** ส่งทุกช่องไปเสมอ ไม่ได้ส่งเฉพาะช่องที่เปลี่ยน ***
   * ฝั่ง Backend ใช้ COALESCE ค่าที่ไม่ได้ส่งจะถูกมองว่า "ไม่เปลี่ยน"
   * ถ้าส่งเฉพาะช่องที่เปลี่ยน ต้องมานั่งเทียบว่าช่องไหนต่างจากเดิมบ้าง
   * ซึ่งซับซ้อนกว่าและพลาดง่ายกว่าการส่งค่าปัจจุบันของฟอร์มไปทั้งชุด
   *
   * *** caption ส่งเป็นข้อความว่างได้ ***
   * เพราะร้านอาจต้องการลบข้อความเดิมทิ้ง ถ้าส่ง null ไปฝั่ง Backend
   * จะเก็บข้อความเดิมไว้ด้วย COALESCE ทำให้ลบไม่ได้เลย
   *
   * *** ไม่ส่ง foodId ***
   * การเปลี่ยนเมนูของโพสต์ที่ลงขายไปแล้วเท่ากับเปลี่ยนสินค้าทั้งชิ้น
   * ถ้าอยากขายเมนูอื่นควรสร้างโพสต์ใหม่ ไม่ใช่แก้โพสต์เดิม
   */
  async update(
    postId: number,
    body: UpdatePostRequest,
    image: PickedImage | null
  ): Promise<FeedItem> {
    const res = await uploadRequest<ApiResponse<FeedItem>>(ENDPOINTS.POST_DETAIL(postId), {
      discountPrice: body.discountPrice,
      quantity: body.quantity,
      pickupStart: body.pickupStart,
      pickupEnd: body.pickupEnd,
      holdMinutes: body.holdMinutes,
      caption: body.caption ?? '',
    }, image, 'put');
    return res.data;
  },

  async remove(postId: number): Promise<void> {
    await apiDelete<ApiResponse<null>>(ENDPOINTS.POST_DETAIL(postId));
  },
};

export default postService;
