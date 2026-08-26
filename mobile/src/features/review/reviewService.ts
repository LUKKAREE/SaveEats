/**
 * reviewService - รีวิวร้าน (ฝั่งแอป)
 * ใช้ทั้งฝั่งลูกค้า (เขียนรีวิว / ดูรีวิวของตัวเอง) และฝั่งร้าน (ดูรีวิวที่ได้รับ)
 */
import type {
  ApiResponse, PaginatedResponse, Review, RatingBreakdown, CreateReviewRequest,
} from '@shared/index';
import client, { apiGet, apiPost } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

/** ค่าเริ่มต้นตอนยังไม่มีรีวิวเลย ใช้กันไม่ให้หน้าจอพังเพราะอ่าน field ที่ไม่มี */
const EMPTY_BREAKDOWN: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export interface StoreReviews {
  items: Review[];
  total: number;
  /** จำนวนรีวิวแยกตามจำนวนดาว เอาไปวาดกราฟแท่งได้เลย */
  breakdown: RatingBreakdown;
}

/**
 * แปลงค่าจาก header X-Rating-Breakdown ให้เป็น object
 *
 * *** ทำไม breakdown ถึงมาทาง header ไม่ใช่ใน body ***
 * เพราะ endpoint นี้ใช้รูปแบบ response มาตรฐานของระบบ (data + pagination)
 * ถ้าแทรก breakdown เข้าไปใน body จะผิดรูปแบบที่ทุก endpoint ใช้ร่วมกัน
 * Backend เลยส่งมาทาง header แทน
 */
function parseBreakdown(raw: unknown): RatingBreakdown {
  if (typeof raw !== 'string' || raw === '') return EMPTY_BREAKDOWN;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, number>>;
    return {
      1: Number(parsed['1'] ?? 0),
      2: Number(parsed['2'] ?? 0),
      3: Number(parsed['3'] ?? 0),
      4: Number(parsed['4'] ?? 0),
      5: Number(parsed['5'] ?? 0),
    };
  } catch {
    // header เสียหรือรูปแบบเปลี่ยน ก็แค่ไม่โชว์กราฟ ไม่ต้องทำให้ทั้งหน้าพัง
    return EMPTY_BREAKDOWN;
  }
}

export const reviewService = {
  /**
   * รีวิวของร้านหนึ่งร้าน
   * ใช้ทั้งในหน้ารายละเอียดร้าน (ฝั่งลูกค้า) และหน้ารีวิวของร้าน (ฝั่งร้าน)
   *
   * เรียกผ่าน client ตรง ๆ แทน apiGet เพราะต้องอ่าน header ด้วย
   * (apiGet ออกแบบมาให้คืนแค่ body)
   */
  async listByStore(storeId: number, limit = 50): Promise<StoreReviews> {
    const res = await client.get<PaginatedResponse<Review>>(ENDPOINTS.STORE_REVIEWS(storeId), {
      params: { limit },
    });
    const headers = res.headers as Record<string, string | undefined>;
    return {
      items: res.data.data,
      total: res.data.pagination.total,
      breakdown: parseBreakdown(headers['x-rating-breakdown']),
    };
  },

  /**
   * รีวิวที่ตัวเองเคยเขียนไว้ เรียงจากใหม่ไปเก่า
   *
   * *** endpoint นี้ส่งเป็น ApiResponse ไม่ใช่ PaginatedResponse ***
   * คนเดียวเขียนรีวิวได้ไม่กี่สิบใบ Backend เลยส่งมาทีเดียวจบ ไม่มีการแบ่งหน้า
   * (เคยประกาศชนิดผิดเป็น PaginatedResponse ซึ่งรันได้เพราะ .data ตรงกันพอดี แต่ทำให้เข้าใจผิด)
   */
  async listMine(): Promise<Review[]> {
    const res = await apiGet<ApiResponse<Review[]>>(ENDPOINTS.MY_REVIEWS);
    return res.data;
  },

  /**
   * เขียนรีวิว
   *
   * *** Backend จะปฏิเสธถ้าเงื่อนไขไม่ครบ ***
   *   - การจองนั้นต้องเป็นของเราเอง
   *   - สถานะต้องเป็น completed (รับอาหารแล้วเท่านั้น)
   *   - รีวิวได้ครั้งเดียวต่อ 1 การจอง
   * แอปไม่ต้องเช็คเองซ้ำ แค่แสดงข้อความ error ที่ได้กลับมาก็พอ
   */
  async create(body: CreateReviewRequest): Promise<Review> {
    const res = await apiPost<ApiResponse<Review>>(ENDPOINTS.REVIEWS, body);
    return res.data;
  },
};

export default reviewService;
