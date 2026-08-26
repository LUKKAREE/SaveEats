/**
 * foodService - คลังเมนูอาหารของร้าน (ฝั่งแอป)
 *
 * *** foods = เมนูตั้งต้น ยังไม่ใช่ของที่ประกาศขาย ***
 * ของที่ขายจริงอยู่ในตาราง posts (ทางเลือก A)
 */
import type { ApiResponse, Category, Food, CreateFoodRequest, UpdateFoodRequest } from '@shared/index';
import { apiGet, apiDelete, uploadRequest } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const foodService = {
  /** เมนูทั้งหมดในคลังของร้านตัวเอง */
  async listMine(): Promise<Food[]> {
    const res = await apiGet<ApiResponse<Food[]>>(ENDPOINTS.MY_FOODS);
    return res.data;
  },

  async getById(foodId: number): Promise<Food> {
    const res = await apiGet<ApiResponse<Food>>(ENDPOINTS.FOOD_DETAIL(foodId));
    return res.data;
  },

  /** หมวดหมู่อาหาร 5 หมวด (ใช้ทำตัวเลือกในฟอร์ม) */
  async getCategories(): Promise<Category[]> {
    const res = await apiGet<ApiResponse<Category[]>>(ENDPOINTS.CATEGORIES);
    return res.data;
  },

  /**
   * เพิ่มเมนูใหม่
   * ส่งแบบ multipart เพราะมีไฟล์รูปแนบไปด้วย
   */
  async create(body: CreateFoodRequest, image: PickedImage | null): Promise<Food> {
    const res = await uploadRequest<ApiResponse<Food>>(ENDPOINTS.FOODS, {
      name: body.name,
      normalPrice: body.normalPrice,
      description: body.description,
      categoryId: body.categoryId,
    }, image, 'post');
    return res.data;
  },

  async update(foodId: number, body: UpdateFoodRequest, image: PickedImage | null): Promise<Food> {
    const res = await uploadRequest<ApiResponse<Food>>(ENDPOINTS.FOOD_DETAIL(foodId), {
      name: body.name,
      normalPrice: body.normalPrice,
      description: body.description,
      categoryId: body.categoryId,
    }, image, 'put');
    return res.data;
  },

  async remove(foodId: number): Promise<void> {
    await apiDelete<ApiResponse<null>>(ENDPOINTS.FOOD_DETAIL(foodId));
  },
};

export default foodService;
