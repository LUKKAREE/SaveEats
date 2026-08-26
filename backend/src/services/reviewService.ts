/**
 * reviewService - Logic ของรีวิว
 *
 * กฎ
 *   - รีวิวได้เฉพาะการจองที่ status = completed เท่านั้น
 *   - 1 การจอง รีวิวได้ครั้งเดียว
 *   - รีวิวแล้วต้องคำนวณคะแนนเฉลี่ยของร้านใหม่ทันที
 */
import type { CreateReviewRequest, Review, RatingBreakdown } from '@shared/index';
import ApiError from '../utils/ApiError';
import reviewModel from '../models/reviewModel';
import reservationModel from '../models/reservationModel';
import storeModel from '../models/storeModel';
import behaviorScoreService from './behaviorScoreService';

export const reviewService = {
  async create(customerId: number, { reservationId, rating, comment }: CreateReviewRequest): Promise<Review> {
    const reservation = await reservationModel.findById(reservationId);
    if (!reservation) throw ApiError.notFound('ไม่พบการจองนี้');

    if (reservation.customer_id !== customerId) {
      throw ApiError.forbidden('คุณรีวิวได้เฉพาะการจองของตัวเองเท่านั้น');
    }
    if (reservation.status !== 'completed') {
      throw ApiError.badRequest('รีวิวได้หลังจากรับอาหารเรียบร้อยแล้วเท่านั้น');
    }
    const existing = await reviewModel.findByReservation(reservationId);
    if (existing) {
      throw ApiError.conflict('คุณรีวิวการจองนี้ไปแล้ว');
    }

    const numericRating = Number(rating);
    const reviewId = await reviewModel.create({
      customerId,
      storeId: reservation.store_id,
      reservationId,
      rating: numericRating,
      comment,
    });

    // คำนวณคะแนนเฉลี่ยของร้านใหม่
    await storeModel.refreshRating(reservation.store_id);

    // รีวิวสุดโต่งมีผลกับคะแนนความประพฤติ
    if (numericRating >= 5) {
      await behaviorScoreService.applyRule(reservation.store_id, 'GREAT_REVIEW', 'ได้รีวิว 5 ดาว');
    } else if (numericRating <= 2) {
      await behaviorScoreService.applyRule(
        reservation.store_id, 'BAD_REVIEW', `ได้รีวิว ${numericRating} ดาว`
      );
    }

    const created = await reviewModel.findById(reviewId);
    if (!created) throw ApiError.notFound('บันทึกรีวิวไม่สำเร็จ');
    return created;
  },

  async listByStore(
    storeId: number,
    options: { page?: number; limit?: number }
  ): Promise<{ items: Review[]; total: number; breakdown: RatingBreakdown }> {
    const { items, total } = await reviewModel.listByStore(storeId, options);
    const breakdown = await reviewModel.ratingBreakdown(storeId);
    return { items, total, breakdown };
  },

  async listMine(customerId: number): Promise<Review[]> {
    return reviewModel.listByCustomer(customerId);
  },
};

export default reviewService;
