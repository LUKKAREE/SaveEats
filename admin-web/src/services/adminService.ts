/**
 * adminService - รวมทุก API ที่หน้า Admin ใช้ไว้ที่เดียว
 * หน้าจอไม่ต้องรู้ว่า URL คืออะไร เรียกฟังก์ชันจากที่นี่พอ
 *
 * *** ทุกฟังก์ชันระบุชนิดของข้อมูลที่จะได้กลับมา ***
 * หน้าจอจึงได้ autocomplete และถ้าใช้ชื่อ field ผิดจะขึ้น error ทันที
 */
import type {
  ApiResponse, PaginatedResponse,
  DashboardStats, StoreForAdmin, Store, User, FeedItem,
  ReservationDetail, Review, Report, BehaviorScoreForAdmin, BehaviorScore,
  StoreStatus, ReportStatus, ReservationStatus,
  RejectStoreRequest, SetUserActiveRequest, AdjustBehaviorRequest, UpdateReportRequest,
} from '@shared/index';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const adminService = {
  // ---------- Dashboard ----------
  async getDashboard(): Promise<DashboardStats> {
    const res = await apiGet<ApiResponse<DashboardStats>>('/admin/dashboard');
    return res.data;
  },

  // ---------- ร้านค้า ----------
  async getStores(params: ListQuery & { status?: StoreStatus | '' } = {}): Promise<PaginatedResponse<StoreForAdmin>> {
    return apiGet<PaginatedResponse<StoreForAdmin>>('/admin/stores', { params });
  },
  async getPendingStores(params: ListQuery = {}): Promise<PaginatedResponse<StoreForAdmin>> {
    return apiGet<PaginatedResponse<StoreForAdmin>>('/admin/stores/pending', { params });
  },
  async approveStore(storeId: number): Promise<ApiResponse<Store>> {
    return apiPut<ApiResponse<Store>>(`/admin/stores/${storeId}/approve`);
  },
  async rejectStore(storeId: number, reason: string): Promise<ApiResponse<Store>> {
    const body: RejectStoreRequest = { reason };
    return apiPut<ApiResponse<Store>>(`/admin/stores/${storeId}/reject`, body);
  },
  async suspendStore(storeId: number, reason: string): Promise<ApiResponse<Store>> {
    return apiPut<ApiResponse<Store>>(`/admin/stores/${storeId}/suspend`, { reason });
  },

  // ---------- ลูกค้า ----------
  async getCustomers(params: ListQuery = {}): Promise<PaginatedResponse<User>> {
    return apiGet<PaginatedResponse<User>>('/admin/customers', { params });
  },
  async setUserActive(userId: number, isActive: boolean): Promise<ApiResponse<null>> {
    const body: SetUserActiveRequest = { isActive };
    return apiPut<ApiResponse<null>>(`/admin/users/${userId}/active`, body);
  },

  // ---------- โพสต์ / การจอง / รีวิว ----------
  async getPosts(params: ListQuery = {}): Promise<PaginatedResponse<FeedItem>> {
    return apiGet<PaginatedResponse<FeedItem>>('/admin/posts', { params });
  },
  /**
   * ซ่อน / เอากลับมาแสดง โพสต์
   *
   * *** ซ่อน ไม่ใช่ลบ ***
   * ถ้าลบทิ้ง การจองที่ผูกกับโพสต์นี้จะหายตามไปด้วย
   * เปลี่ยนสถานะเป็น hidden แทน ประวัติการจองยังอยู่ครบ
   */
  async setPostHidden(postId: number, hidden: boolean): Promise<ApiResponse<FeedItem>> {
    return apiPut<ApiResponse<FeedItem>>(`/admin/posts/${postId}/hide`, { unhide: !hidden });
  },
  async getReservations(
    params: ListQuery & { status?: ReservationStatus | ''; storeId?: number } = {}
  ): Promise<PaginatedResponse<ReservationDetail>> {
    return apiGet<PaginatedResponse<ReservationDetail>>('/admin/reservations', { params });
  },
  async getReviews(params: ListQuery = {}): Promise<PaginatedResponse<Review>> {
    return apiGet<PaginatedResponse<Review>>('/admin/reviews', { params });
  },
  /**
   * ลบรีวิวที่ไม่เหมาะสม
   * Backend จะคำนวณคะแนนเฉลี่ยของร้านใหม่ให้อัตโนมัติหลังลบ
   */
  async deleteReview(reviewId: number): Promise<ApiResponse<null>> {
    return apiDelete<ApiResponse<null>>(`/admin/reviews/${reviewId}`);
  },

  // ---------- การแจ้งปัญหา ----------
  async getReports(params: ListQuery & { status?: ReportStatus | '' } = {}): Promise<PaginatedResponse<Report>> {
    return apiGet<PaginatedResponse<Report>>('/admin/reports', { params });
  },
  /**
   * อัปเดตสถานะเรื่องร้องเรียน
   *
   * adminNote          บันทึกภายใน ผู้ใช้ทั่วไปไม่เห็น
   * resolutionMessage  ข้อความถึงเจ้าของสิ่งที่ถูกแจ้ง Backend จะยิงแจ้งเตือนให้
   *                    (ส่งไปก็ต่อเมื่อสถานะเป็น resolved เท่านั้น)
   */
  async updateReport(
    reportId: number,
    status: ReportStatus,
    adminNote?: string,
    resolutionMessage?: string
  ): Promise<ApiResponse<Report>> {
    const body: UpdateReportRequest = { status };
    if (adminNote !== undefined) body.adminNote = adminNote;
    if (resolutionMessage !== undefined) body.resolutionMessage = resolutionMessage;
    return apiPut<ApiResponse<Report>>(`/admin/reports/${reportId}`, body);
  },

  // ---------- คะแนนความประพฤติ ----------
  async getBehaviorScores(): Promise<BehaviorScoreForAdmin[]> {
    const res = await apiGet<ApiResponse<BehaviorScoreForAdmin[]>>('/admin/behavior');
    return res.data;
  },
  async adjustBehavior(storeId: number, change: number, reason?: string): Promise<ApiResponse<BehaviorScore>> {
    const body: AdjustBehaviorRequest = reason === undefined ? { change } : { change, reason };
    return apiPut<ApiResponse<BehaviorScore>>(`/admin/behavior/${storeId}`, body);
  },

  // ---------- งานดูแลระบบ ----------
  async expireReservations(): Promise<ApiResponse<{ count: number }>> {
    return apiPost<ApiResponse<{ count: number }>>('/admin/maintenance/expire-reservations');
  },
};

export default adminService;
