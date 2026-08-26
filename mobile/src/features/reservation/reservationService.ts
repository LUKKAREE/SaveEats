/**
 * reservationService - การจองอาหาร (ฝั่งแอป)
 * ใช้ร่วมกันทั้งฝั่งลูกค้าและฝั่งร้าน
 *
 * *** กฎเหล็กข้อ 4 : การตรวจ QR ต้องยิงไปถาม Backend เสมอ ***
 * ฟังก์ชัน verify() ในไฟล์นี้คือทางเดียวที่ร้านใช้ยืนยันการรับอาหาร
 */
import type {
  ApiResponse, PaginatedResponse, ReservationDetail,
  CreateReservationRequest, VerifyReservationRequest, ReservationStatus,
} from '@shared/index';
import { apiGet, apiPost, apiPut } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const reservationService = {
  // ---------------------------------------------------------------- ฝั่งลูกค้า

  /** จองอาหาร คืนข้อมูลการจองพร้อม qr_payload และรหัส 4 หลัก */
  async create(body: CreateReservationRequest): Promise<ReservationDetail> {
    const res = await apiPost<ApiResponse<ReservationDetail>>(ENDPOINTS.RESERVATIONS, body);
    return res.data;
  },

  /** ประวัติการจองของตัวเอง */
  async listMine(status: ReservationStatus | '' = ''): Promise<ReservationDetail[]> {
    const res = await apiGet<PaginatedResponse<ReservationDetail>>(ENDPOINTS.MY_RESERVATIONS, {
      params: status === '' ? { limit: 50 } : { status, limit: 50 },
    });
    return res.data;
  },

  async getById(reservationId: number): Promise<ReservationDetail> {
    const res = await apiGet<ApiResponse<ReservationDetail>>(
      ENDPOINTS.RESERVATION_DETAIL(reservationId)
    );
    return res.data;
  },

  async cancel(reservationId: number): Promise<ReservationDetail> {
    const res = await apiPut<ApiResponse<ReservationDetail>>(
      ENDPOINTS.CANCEL_RESERVATION(reservationId)
    );
    return res.data;
  },

  // ---------------------------------------------------------------- ฝั่งร้าน

  /** รายการจองที่เข้ามาที่ร้าน */
  async listForStore(status: ReservationStatus | '' = ''): Promise<ReservationDetail[]> {
    const res = await apiGet<PaginatedResponse<ReservationDetail>>(ENDPOINTS.STORE_RESERVATIONS, {
      params: status === '' ? { limit: 50 } : { status, limit: 50 },
    });
    return res.data;
  },

  /**
   * ร้านยืนยันการรับอาหาร
   *
   * *** ห้ามให้แอปตัดสินเองว่า QR ถูกต้อง ***
   * ส่งค่าที่สแกนได้ไปให้ Backend ตรวจ 5 ด่าน แล้วรอคำตอบเท่านั้น
   */
  async verify(body: VerifyReservationRequest): Promise<ReservationDetail> {
    const res = await apiPost<ApiResponse<ReservationDetail>>(ENDPOINTS.VERIFY_RESERVATION, body);
    return res.data;
  },
};

export default reservationService;
