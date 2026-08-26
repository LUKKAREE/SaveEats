/**
 * reservationService - Logic การจองอาหาร (หัวใจของระบบ)
 *
 * *** กฎเหล็กข้อ 2 : Logic ทั้งหมดของการจองอยู่ที่ไฟล์นี้ ห้ามกระจายไปที่ UI ***
 * *** กฎเหล็กข้อ 4 : การตรวจ QR ต้องผ่าน Backend ทุกครั้ง ***
 *
 * ลำดับการทำงานตอนจอง (ตรงกับ Flow ในเอกสารแผนงานข้อ 1-9)
 *   1. ตรวจ Token ว่า login อยู่จริงไหม        <- ทำที่ authMiddleware
 *   2. ตรวจว่าโพสต์ยังมีอยู่ไหม
 *   3. ตรวจว่าร้านยัง approved อยู่ไหม
 *   4. ตรวจว่ายังอยู่ในช่วงเวลาที่จองได้ไหม
 *   5. ตรวจว่าจำนวนคงเหลือพอไหม (ตัดใน transaction กันคนจองพร้อมกัน)
 *   6. สร้าง Reservation
 *   7. ตัดจำนวนอาหาร
 *   8. สร้าง qr_token และรหัส 4 หลัก
 *   9. ส่งกลับให้ลูกค้า + แจ้งเตือนทั้งลูกค้าและร้าน
 */
import type {
  CreateReservationRequest, VerifyReservationRequest,
  ReservationDetail, ReservationStatus,
} from '@shared/index';

import env from '../config/env';
import ApiError from '../utils/ApiError';
import { withTransaction } from '../config/db';
import { addMinutes, isPast, toMysqlDate, parseMysqlDate } from '../utils/datetime';
import type { AuthUser } from '../types/express';

import postModel from '../models/postModel';
import storeModel from '../models/storeModel';
import reservationModel from '../models/reservationModel';
import type { ReservationRow, ListReservationOptions } from '../models/reservationModel';

import qrService from './qrService';
import notificationService from './notificationService';
import behaviorScoreService from './behaviorScoreService';

/** เติม qr_payload ที่ฝั่งแอปต้องใช้วาด QR */
function decorate(row: ReservationRow): ReservationDetail {
  return { ...row, qr_payload: qrService.buildQrPayload(row.qr_token) };
}

/** สถานะที่ยังยกเลิกหรือใช้งานได้อยู่ */
const OPEN_STATUSES: ReservationStatus[] = ['confirmed', 'waiting'];

export const reservationService = {
  /** ลูกค้าจองอาหาร */
  async create(customerId: number, { postId, quantity = 1 }: CreateReservationRequest): Promise<ReservationDetail> {
    const post = await postModel.findById(postId);
    if (!post) throw ApiError.notFound('ไม่พบรายการอาหารนี้');

    // --- ตรวจร้าน ---
    const store = await storeModel.findById(post.store_id);
    if (!store || store.status !== 'approved') {
      throw ApiError.badRequest('ร้านนี้ยังไม่เปิดให้บริการ');
    }

    // --- ตรวจสถานะโพสต์และเวลา ---
    if (post.status !== 'active') {
      throw ApiError.badRequest('รายการนี้ปิดการจองแล้ว');
    }
    if (isPast(post.pickup_end)) {
      throw ApiError.badRequest('เลยเวลารับอาหารของรายการนี้แล้ว');
    }

    // --- ตรวจจำนวน ---
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw ApiError.badRequest('จำนวนที่จองต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป');
    }
    if (qty > env.MAX_QUANTITY_PER_RESERVATION) {
      throw ApiError.badRequest(`จองได้สูงสุด ${env.MAX_QUANTITY_PER_RESERVATION} ชุดต่อครั้ง`);
    }
    const already = await reservationModel.countActiveByCustomerAndPost(customerId, postId);
    if (already + qty > env.MAX_QUANTITY_PER_RESERVATION) {
      throw ApiError.badRequest(
        `คุณจองรายการนี้ไปแล้ว ${already} ชุด รวมกันเกิน ${env.MAX_QUANTITY_PER_RESERVATION} ชุดไม่ได้`
      );
    }

    const { qrToken, reservationCode } = qrService.createSecrets();

    /*
     * คิวนี้หมดอายุเมื่อไหร่
     *
     * *** เดิมใช้ค่ากลางค่าเดียวทั้งระบบ (pickup_end + 30 นาที) ***
     * ตอนนี้ร้านกำหนดเองได้ตอนโพสต์ผ่าน hold_minutes
     * เพราะของแต่ละอย่างรอได้ไม่เท่ากัน ของทอดกับขนมปังคนละเรื่อง
     *
     * วิธีคิด
     *   1. เริ่มนับจาก "ตอนนี้" หรือ "เวลาที่ร้านเปิดให้รับ" แล้วแต่อันไหนมาทีหลัง
     *      (จองล่วงหน้าไว้ ไม่ควรโดนนับเวลาตั้งแต่ยังไปรับไม่ได้)
     *   2. บวกจำนวนนาทีที่ร้านให้
     *   3. แต่ห้ามเลยเวลาปิดรับของโพสต์ เพราะร้านปิดไปแล้วก็รับไม่ได้อยู่ดี
     */
    const holdMinutes = post.hold_minutes > 0
      ? post.hold_minutes
      : env.RESERVATION_GRACE_MINUTES;

    const now = toMysqlDate(new Date());
    const countFrom = parseMysqlDate(post.pickup_start).getTime() > Date.now()
      ? post.pickup_start
      : now;

    const holdUntil = addMinutes(countFrom, holdMinutes);
    const expiresAt = parseMysqlDate(holdUntil).getTime() > parseMysqlDate(post.pickup_end).getTime()
      ? post.pickup_end
      : holdUntil;

    // --- ตัดของ + สร้างการจอง ใน transaction เดียว ---
    // ถ้าขั้นใดขั้นหนึ่งพัง จะ rollback ทั้งหมด ของไม่หายไปเฉย ๆ
    const reservationId = await withTransaction(async (conn) => {
      const decreased = await postModel.decreaseQuantity(conn, postId, qty);
      if (!decreased) {
        throw ApiError.conflict('ขออภัย อาหารเหลือไม่พอแล้ว');
      }
      return reservationModel.createInTransaction(conn, {
        customerId,
        storeId: post.store_id,
        postId,
        foodId: post.food_id,
        quantity: qty,
        unitPrice: post.discount_price,
        totalPrice: Number(post.discount_price) * qty,
        qrToken,
        reservationCode,
        pickupStart: post.pickup_start,
        pickupEnd: post.pickup_end,
        expiresAt,
      });
    });

    const reservation = await reservationModel.findById(reservationId);
    if (!reservation) throw ApiError.notFound('สร้างการจองไม่สำเร็จ');

    // --- แจ้งเตือน (ทำนอก transaction เพราะไม่ใช่ส่วนสำคัญ) ---
    await notificationService.notifyFromTemplate(
      customerId, 'RESERVATION_CREATED', [post.food_name, post.store_name],
      { type: 'reservation', refId: reservationId }
    );
    await notificationService.notifyFromTemplate(
      store.user_id, 'RESERVATION_NEW_FOR_STORE', [post.food_name],
      { type: 'reservation', refId: reservationId }
    );

    return decorate(reservation);
  },

  /** ประวัติการจองของลูกค้า */
  async listMine(
    customerId: number,
    options: ListReservationOptions
  ): Promise<{ items: ReservationDetail[]; total: number }> {
    const { items, total } = await reservationModel.listByCustomer(customerId, options);
    return { items: items.map(decorate), total };
  },

  /** รายการจองที่เข้ามาที่ร้าน */
  async listForStore(
    storeId: number,
    options: ListReservationOptions
  ): Promise<{ items: ReservationRow[]; total: number }> {
    return reservationModel.listByStore(storeId, options);
  },

  /** ดูรายละเอียดการจอง (เห็นได้เฉพาะเจ้าของการจอง / เจ้าของร้าน / admin) */
  async getById(reservationId: number, requester: AuthUser): Promise<ReservationDetail> {
    const reservation = await reservationModel.findById(reservationId);
    if (!reservation) throw ApiError.notFound('ไม่พบการจองนี้');

    const isOwner = reservation.customer_id === requester.userId;
    const isAdmin = requester.role === 'admin';
    let isStoreOwner = false;
    if (requester.role === 'seller') {
      const store = await storeModel.findByUserId(requester.userId);
      isStoreOwner = store !== null && store.store_id === reservation.store_id;
    }
    if (!isOwner && !isAdmin && !isStoreOwner) {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์ดูการจองนี้');
    }
    return decorate(reservation);
  },

  /**
   * ร้านยืนยันการรับอาหาร (สแกน QR หรือกรอกรหัส 4 หลัก)
   *
   * *** จุดที่สำคัญที่สุดของทั้งระบบ ***
   * แอปห้ามตัดสินเองเด็ดขาดว่า QR ใช้ได้หรือไม่ ต้องยิงมาที่นี่เสมอ
   *
   * @param sellerUserId user_id ของร้านที่กำลังสแกน
   */
  async verify(sellerUserId: number, { qrPayload, code }: VerifyReservationRequest): Promise<ReservationDetail> {
    const store = await storeModel.findByUserId(sellerUserId);
    if (!store) throw ApiError.notFound('ไม่พบร้านของคุณ');

    let reservation: ReservationRow | null = null;

    if (qrPayload) {
      const token = qrService.parseQrPayload(qrPayload);
      if (!token) throw ApiError.badRequest('QR Code นี้ไม่ใช่ของ SaveEats');
      reservation = await reservationModel.findByQrToken(token);
    } else if (code) {
      reservation = await reservationModel.findByCode(store.store_id, String(code).trim());
    } else {
      throw ApiError.badRequest('กรุณาสแกน QR Code หรือกรอกรหัส 4 หลัก');
    }

    if (!reservation) throw ApiError.notFound('ไม่พบการจองนี้ในระบบ');

    // 1) การจองต้องเป็นของร้านนี้เท่านั้น (กันร้านอื่นสแกนตัดของ)
    if (reservation.store_id !== store.store_id) {
      throw ApiError.forbidden('การจองนี้ไม่ใช่ของร้านคุณ');
    }
    // 2) กันใช้ QR ซ้ำ
    if (reservation.status === 'completed') {
      throw ApiError.conflict('การจองนี้ถูกใช้รับอาหารไปแล้ว');
    }
    if (reservation.status === 'cancelled') {
      throw ApiError.badRequest('การจองนี้ถูกยกเลิกไปแล้ว');
    }
    if (reservation.status === 'expired') {
      throw ApiError.badRequest('การจองนี้หมดอายุแล้ว');
    }
    // 3) ตรวจเวลาหมดอายุ
    if (isPast(reservation.expires_at)) {
      /*
       * *** ต้องคืนของกลับเข้าโพสต์ตรงนี้ด้วย ห้ามแค่เปลี่ยนสถานะเฉย ๆ ***
       * เคยเป็นบั๊ก : ปิดเป็น expired แล้วจบ ไม่ได้คืนของ
       * พอสถานะกลายเป็น expired แถวนี้จะหลุดจากเงื่อนไขของงานเบื้องหลังทันที
       * (มันหาเฉพาะ confirmed/waiting) ของจำนวนนั้นจึงค้างหายถาวร กู้อัตโนมัติไม่ได้
       *
       * ใช้ closeIfOpen ไม่ใช่ setStatus เพราะงานเบื้องหลังอาจกำลังปิดแถวเดียวกันอยู่พอดี
       * ให้ฐานข้อมูลตัดสินว่าใครได้ปิด คนที่ได้เท่านั้นถึงคืนของ จะได้ไม่คืนซ้ำสองรอบ
       */
      const closed = await reservationModel.closeIfOpen(reservation.reservation_id, 'expired');
      if (closed) {
        await postModel.increaseQuantity(reservation.post_id, reservation.quantity);
      }
      throw ApiError.badRequest('การจองนี้หมดอายุแล้ว');
    }

    // ผ่านทุกด่าน -> ปิดการจอง
    const updated = await reservationModel.setStatus(reservation.reservation_id, 'completed');
    if (!updated) throw ApiError.notFound('ปรับสถานะการจองไม่สำเร็จ');

    await behaviorScoreService.applyRule(store.store_id, 'COMPLETED_PICKUP', 'ส่งมอบอาหารสำเร็จ 1 รายการ');
    await notificationService.notifyFromTemplate(
      reservation.customer_id, 'RESERVATION_COMPLETED', [store.store_name],
      { type: 'reservation', refId: reservation.reservation_id }
    );

    return decorate(updated);
  },

  /** ยกเลิกการจอง (ลูกค้าหรือร้านก็ได้) */
  async cancel(reservationId: number, requester: AuthUser): Promise<ReservationDetail> {
    const reservation = await reservationModel.findById(reservationId);
    if (!reservation) throw ApiError.notFound('ไม่พบการจองนี้');

    if (!OPEN_STATUSES.includes(reservation.status)) {
      throw ApiError.badRequest('การจองนี้ยกเลิกไม่ได้แล้ว');
    }

    const isCustomer = reservation.customer_id === requester.userId;
    let isStoreOwner = false;
    if (requester.role === 'seller') {
      const store = await storeModel.findByUserId(requester.userId);
      isStoreOwner = store !== null && store.store_id === reservation.store_id;
    }
    if (!isCustomer && !isStoreOwner && requester.role !== 'admin') {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์ยกเลิกการจองนี้');
    }

    // ปิดแบบกันชน : คืนของก็ต่อเมื่อเราเป็นคนปิดสำเร็จจริง ๆ เท่านั้น
    // (งานเบื้องหลังอาจชิงปิดแถวนี้ไปพอดีถ้าคิวหมดเวลาในจังหวะเดียวกัน)
    const closed = await reservationModel.closeIfOpen(reservationId, 'cancelled');
    if (closed) {
      await postModel.increaseQuantity(reservation.post_id, reservation.quantity);
    }

    // ร้านเป็นคนยกเลิก -> หักคะแนนความประพฤติ
    if (isStoreOwner) {
      await behaviorScoreService.applyRule(
        reservation.store_id, 'SELLER_CANCEL', 'ร้านยกเลิกการจองของลูกค้า'
      );
      await notificationService.notifyFromTemplate(
        reservation.customer_id, 'RESERVATION_CANCELLED', [reservation.food_name],
        { type: 'reservation', refId: reservationId }
      );
    }

    const updated = await reservationModel.findById(reservationId);
    if (!updated) throw ApiError.notFound('ไม่พบการจองนี้');
    return decorate(updated);
  },

  /**
   * ปิดการจองที่หมดอายุ แล้วคืนของกลับเข้าระบบ (ข้อค้าง 6)
   *
   * ตอนนี้ยังไม่มีตัวจับเวลาเรียกอัตโนมัติ
   * ทีมเลือกได้ 2 ทาง
   *   1. ติดตั้ง node-cron แล้วเรียกฟังก์ชันนี้ทุก 5 นาที
   *   2. เรียกจาก endpoint ของ admin เอาเองตอนต้องการ
   *
   * @returns จำนวนรายการที่ถูกปิด
   */
  async expireOverdue(): Promise<number> {
    const rows = await reservationModel.findExpiredPending();
    let closedCount = 0;
    for (const r of rows) {
      // ปิดไม่สำเร็จ = มีคนอื่นปิดไปก่อนแล้ว (เช่นร้านเพิ่งสแกน) ข้ามไปเลย ห้ามคืนของซ้ำ
      const closed = await reservationModel.closeIfOpen(r.reservation_id, 'expired');
      if (!closed) continue;
      closedCount += 1;

      await postModel.increaseQuantity(r.post_id, r.quantity);
      await notificationService.notify({
        userId: r.customer_id,
        title: 'การจองหมดอายุ',
        message: 'การจองของคุณหมดอายุแล้วเพราะเลยเวลารับอาหาร',
        type: 'reservation',
        refId: r.reservation_id,
      });
    }
    return closedCount;
  },
};

export default reservationService;
