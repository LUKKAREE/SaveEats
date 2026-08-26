/**
 * postModel - โพสต์ประกาศขายลง Feed
 *
 * 1 post = 1 food  (ร้านเลือกเมนูจากคลังมาโพสต์)
 * ราคาลด / จำนวน / ช่วงเวลารับ อยู่ที่ posts เพราะเปลี่ยนทุกรอบที่โพสต์
 */
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { FeedItem, FeedSort, PostStatus } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

/**
 * สถานะที่แท้จริงของโพสต์ ณ วินาทีที่ถาม
 *
 * *** ปัญหาที่นิพจน์นี้แก้ ***
 * คอลัมน์ posts.status เก็บสถานะสองแบบปนกันอยู่
 *   1. สิ่งที่ "ร้านตั้งใจ"      -> active , hidden
 *   2. สิ่งที่ "เกิดขึ้นเอง"     -> sold_out , expired
 *
 * แบบที่ 2 ต้องมีโค้ดสักที่ไปเขียนทับให้ ซึ่ง sold_out มีอยู่แล้ว
 * (decreaseQuantity เขียนให้ตอนของหมด เพราะตอนนั้นมีคนกดจอง = มีเหตุการณ์เกิดขึ้น)
 *
 * แต่ expired ขึ้นกับ "เวลา" ล้วน ๆ และเวลาที่เดินผ่านไปไม่ใช่เหตุการณ์
 * ไม่มีใครเรียกโค้ดอะไรตอนนาฬิกาเดินถึงเวลาปิดรับ
 * ผลคือคอลัมน์นี้ค้างเป็น active ตลอดไป ถึงจะเลยเวลารับมาข้ามวันแล้วก็ตาม
 * (หน้า Admin จึงโชว์โพสต์ของเมื่อวานว่า "กำลังขาย" ส่วนแท็บ "หมดเวลา" ว่างเปล่า)
 *
 * แก้ด้วยการคำนวณสถานะจริงตอนอ่าน แทนที่จะรอให้ใครมาเขียนทับ
 * วิธีนี้ถูกต้องทันทีเสมอ ไม่มีช่วงที่ข้อมูลเพี้ยนแม้แต่วินาทีเดียว
 *
 * *** ทำไมยังต้องมีงานเบื้องหลังไปเขียนคอลัมน์อีก ***
 * เพราะข้อมูลใน "ตัวฐานข้อมูลเอง" ก็ควรถูกต้องด้วย ไม่ใช่ถูกเฉพาะตอนอ่านผ่านโค้ดเรา
 * ใครเปิดตาราง posts ดูตรง ๆ (เช่น อาจารย์ หรือรายงานที่เขียนทีหลัง) จะได้ไม่เห็นค่าเพี้ยน
 * ดู jobs/expireReservationsJob.ts
 */
const EFFECTIVE_STATUS = `
  CASE WHEN p.status = 'active' AND p.pickup_end < NOW() THEN 'expired' ELSE p.status END
`;

/**
 * SELECT กลางที่ทุกที่ใช้ร่วมกัน จะได้หน้าตาข้อมูลเหมือนกันเสมอ
 *
 * *** ถ้าแก้รายการคอลัมน์ตรงนี้ ต้องไปแก้ interface FeedItem ***
 * *** ใน shared/src/api.ts ให้ตรงกันด้วย ***
 */
export const FEED_SELECT = `
  SELECT p.post_id, p.store_id, p.food_id, p.caption,
         p.discount_price, p.quantity_total, p.quantity_left,
         p.pickup_start, p.pickup_end, p.hold_minutes,
         ${EFFECTIVE_STATUS} AS status,
         p.created_at, p.updated_at,
         COALESCE(p.image, f.image) AS image,
         f.name AS food_name, f.description AS food_description,
         f.normal_price, f.category_id,
         c.name AS category_name, c.slug AS category_slug,
         s.store_name, s.image AS store_image, s.address AS store_address,
         s.latitude, s.longitude, s.rating AS store_rating
    FROM posts p
    JOIN foods  f ON f.food_id  = p.food_id
    JOIN stores s ON s.store_id = p.store_id
LEFT JOIN categories c ON c.category_id = f.category_id
`;

export interface CreatePostInput {
  storeId: number;
  foodId: number;
  discountPrice: number;
  quantity: number;
  pickupStart: string;
  pickupEnd: string;
  /** จองแล้วต้องมารับภายในกี่นาที ไม่ส่งมา = ใช้ค่าเริ่มต้นของตาราง (30) */
  holdMinutes?: number | undefined;
  caption?: string | undefined;
  image?: string | undefined;
}

export interface UpdatePostInput {
  caption?: string | undefined;
  image?: string | undefined;
  discountPrice?: number | undefined;
  quantity?: number | undefined;
  pickupStart?: string | undefined;
  pickupEnd?: string | undefined;
  holdMinutes?: number | undefined;
  status?: PostStatus | undefined;
}

export interface FeedFilter {
  search?: string;
  categoryId?: number | null;
  maxPrice?: number | null;
  storeId?: number | null;
  sort?: FeedSort;
  page?: number;
  limit?: number;
}

/** แปลงตัวเลือกการเรียงลำดับเป็น SQL (เขียนแบบนี้เพื่อกัน SQL injection) */
const ORDER_BY: Record<FeedSort, string> = {
  newest: 'p.created_at DESC',
  price_asc: 'p.discount_price ASC',
  price_desc: 'p.discount_price DESC',
  rating: 's.rating DESC',
  pickup: 'p.pickup_end ASC',
};

export const postModel = {
  FEED_SELECT,

  async create(input: CreatePostInput): Promise<number> {
    const result = await execute(
      `INSERT INTO posts
         (store_id, food_id, caption, image, discount_price,
          quantity_total, quantity_left, pickup_start, pickup_end, hold_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        input.storeId, input.foodId, input.caption ?? null, input.image ?? null,
        input.discountPrice, input.quantity, input.quantity,
        input.pickupStart, input.pickupEnd, input.holdMinutes ?? 30,
      ]
    );
    return result.insertId;
  },

  async findById(postId: number): Promise<FeedItem | null> {
    const rows = await query<FeedItem>(`${FEED_SELECT} WHERE p.post_id = ? LIMIT 1`, [postId]);
    return rows[0] ?? null;
  },

  /**
   * ดึง Feed พร้อมตัวกรอง (ข้อค้าง 2)
   * ตัวกรองระยะทางทำที่ service เพราะต้องคำนวณจากพิกัดลูกค้า
   */
  async listFeed({
    search = '', categoryId = null, maxPrice = null, storeId = null,
    sort = 'newest', page = 1, limit = 20,
  }: FeedFilter): Promise<{ items: FeedItem[]; total: number }> {
    const pg = paginate(page, limit);
    const like = `%${search}%`;
    const orderBy = ORDER_BY[sort] ?? ORDER_BY.newest;

    const where = `
      WHERE p.status = 'active'
        AND p.quantity_left > 0
        AND p.pickup_end > NOW()
        AND s.status = 'approved'
        AND (? = ''    OR f.name LIKE ? OR s.store_name LIKE ?)
        AND (? IS NULL OR f.category_id = ?)
        AND (? IS NULL OR p.discount_price <= ?)
        AND (? IS NULL OR p.store_id = ?)
    `;
    const params = [search, like, like, categoryId, categoryId, maxPrice, maxPrice, storeId, storeId];

    const items = await query<FeedItem>(
      `${FEED_SELECT} ${where} ORDER BY ${orderBy} ${pg.sql}`,
      params
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total
         FROM posts p
         JOIN foods f ON f.food_id = p.food_id
         JOIN stores s ON s.store_id = p.store_id
        ${where}`,
      params
    );
    return { items, total };
  },

  /**
   * รายการโพสต์ทั้งหมดสำหรับ Admin - เห็นครบทุกสถานะ
   *
   * *** ห้ามใช้ listFeed แทนอันนี้ ***
   * listFeed เป็นของฝั่งลูกค้า มันกรอง status='active' + ของยังเหลือ
   * + ยังไม่หมดเวลา + ร้านต้องอนุมัติแล้ว ทิ้งไว้ในเงื่อนไข
   * ถ้า Admin เรียกตัวนั้น โพสต์ที่ซ่อน / ขายหมด / หมดเวลา จะหายจากตารางทันที
   * แล้วจะกด "เอากลับมาแสดง" ไม่ได้อีกเลย
   */
  async listAllForAdmin({
    status = '', page = 1, limit = 20,
  }: { status?: PostStatus | ''; page?: number; limit?: number } = {}
  ): Promise<{ items: FeedItem[]; total: number }> {
    const pg = paginate(page, limit);
    /*
      ต้องกรองด้วยสถานะที่คำนวณแล้ว ไม่ใช่ p.status ดิบ ๆ
      ไม่งั้นแท็บ "หมดเวลา" จะหาอะไรไม่เจอเลย ทั้งที่ในตารางแสดงว่าหมดเวลา
      คือกรองกับแสดงใช้คนละเกณฑ์ ซึ่งผู้ใช้จะงงมากว่าของที่เห็นอยู่หายไปไหน
    */
    const where = `WHERE (? = '' OR ${EFFECTIVE_STATUS} = ?)`;
    const params = [status, status];

    const items = await query<FeedItem>(
      `${FEED_SELECT} ${where} ORDER BY p.created_at DESC ${pg.sql}`,
      params
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total
         FROM posts p
         JOIN foods  f ON f.food_id  = p.food_id
         JOIN stores s ON s.store_id = p.store_id
        ${where}`,
      params
    );
    return { items, total };
  },

  /** โพสต์ทั้งหมดของร้านตัวเอง (ฝั่ง seller เห็นทุกสถานะ) */
  async listByStore(storeId: number, { status = '' }: { status?: PostStatus | '' } = {}): Promise<FeedItem[]> {
    return query<FeedItem>(
      `${FEED_SELECT} WHERE p.store_id = ? AND (? = '' OR ${EFFECTIVE_STATUS} = ?)
        ORDER BY p.created_at DESC`,
      [storeId, status, status]
    );
  },

  async update(postId: number, fields: UpdatePostInput): Promise<FeedItem | null> {
    await execute(
      `UPDATE posts
          SET caption        = COALESCE(?, caption),
              image          = COALESCE(?, image),
              discount_price = COALESCE(?, discount_price),
              quantity_total = COALESCE(?, quantity_total),
              quantity_left  = COALESCE(?, quantity_left),
              pickup_start   = COALESCE(?, pickup_start),
              pickup_end     = COALESCE(?, pickup_end),
              hold_minutes   = COALESCE(?, hold_minutes),
              status         = COALESCE(?, status)
        WHERE post_id = ?`,
      [
        fields.caption ?? null, fields.image ?? null, fields.discountPrice ?? null,
        fields.quantity ?? null, fields.quantity ?? null,
        fields.pickupStart ?? null, fields.pickupEnd ?? null,
        fields.holdMinutes ?? null, fields.status ?? null,
        postId,
      ]
    );
    return postModel.findById(postId);
  },

  async remove(postId: number): Promise<void> {
    await execute('DELETE FROM posts WHERE post_id = ?', [postId]);
  },

  /**
   * ตัดจำนวนคงเหลือแบบปลอดภัย
   *
   * *** จุดสำคัญ : เงื่อนไข quantity_left >= ? อยู่ในตัว UPDATE เอง ***
   * ทำให้ถ้ามีคน 2 คนกดจองพร้อมกัน ฐานข้อมูลจะยอมให้สำเร็จแค่คนเดียว
   * ของจึงไม่มีทางติดลบ
   *
   * ต้องเรียกภายใน transaction เท่านั้น
   * @returns true = ตัดสำเร็จ, false = ของไม่พอ
   */
  async decreaseQuantity(conn: PoolConnection, postId: number, amount: number): Promise<boolean> {
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE posts
          SET quantity_left = quantity_left - ?,
              status = IF(quantity_left - ? <= 0, 'sold_out', status)
        WHERE post_id = ? AND quantity_left >= ?`,
      [amount, amount, postId, amount]
    );
    return result.affectedRows === 1;
  },

  /** คืนจำนวนกลับเข้าระบบ (ใช้ตอนยกเลิกหรือหมดอายุ) */
  async increaseQuantity(postId: number, amount: number): Promise<void> {
    await execute(
      `UPDATE posts
          SET quantity_left = LEAST(quantity_left + ?, quantity_total),
              status = IF(status = 'sold_out', 'active', status)
        WHERE post_id = ?`,
      [amount, postId]
    );
  },

  async countActive(): Promise<number> {
    return countOf(
      `SELECT COUNT(*) AS total FROM posts WHERE status = 'active' AND pickup_end > NOW()`
    );
  },

  /**
   * ปิดโพสต์ที่เลยเวลารับไปแล้ว (งานเบื้องหลังเรียกเป็นระยะ)
   *
   * ทำให้ค่าในฐานข้อมูลตรงกับความจริง ไม่ได้มีผลต่อสิ่งที่ผู้ใช้เห็น
   * เพราะฝั่งอ่านคำนวณสถานะจริงให้อยู่แล้ว (ดู EFFECTIVE_STATUS ที่หัวไฟล์)
   *
   * *** แตะเฉพาะ active เท่านั้น ***
   * hidden = ร้านตั้งใจซ่อนไว้เอง ถ้าไปเปลี่ยนเป็น expired ร้านจะกดเอากลับมาแสดงไม่ได้
   * sold_out = ขายหมดแล้วจริง ๆ ซึ่งเป็นข้อมูลที่มีความหมายกว่า "หมดเวลา" ควรเก็บไว้
   *
   * @returns จำนวนโพสต์ที่เพิ่งถูกปิด
   */
  async expireOverdue(): Promise<number> {
    const result = await execute(
      `UPDATE posts SET status = 'expired'
        WHERE status = 'active' AND pickup_end < NOW()`
    );
    return result.affectedRows;
  },
};

export default postModel;
