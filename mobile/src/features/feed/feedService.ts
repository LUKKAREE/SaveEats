/** feedService - ดึงข้อมูล Feed และหมวดหมู่จาก Backend */
import type { ApiResponse, PaginatedResponse, FeedItem, Category, FeedQuery } from '@shared/index';
import { apiGet } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const feedService = {
  /**
   * ดึง Feed
   * ตัดค่าที่เป็น undefined หรือข้อความว่างออกก่อนส่ง จะได้ URL สะอาด
   */
  async getFeed(params: FeedQuery = {}): Promise<PaginatedResponse<FeedItem>> {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    return apiGet<PaginatedResponse<FeedItem>>(ENDPOINTS.POSTS, { params: clean });
  },

  async getPost(postId: number): Promise<FeedItem> {
    const res = await apiGet<ApiResponse<FeedItem>>(ENDPOINTS.POST_DETAIL(postId));
    return res.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await apiGet<ApiResponse<Category[]>>(ENDPOINTS.CATEGORIES);
    return res.data;
  },
};

export default feedService;
