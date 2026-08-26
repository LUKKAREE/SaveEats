/**
 * reportService - แจ้งปัญหาให้ผู้ดูแลระบบ (ฝั่งแอป)
 *
 * ใช้ได้ทั้งลูกค้าและร้าน
 *
 * *** ไม่ต้องส่ง reporterId ไป ***
 * Backend อ่านจาก token เอง เพื่อไม่ให้ใครแจ้งในนามคนอื่นได้
 */
import type { ApiResponse, CreateReportRequest, Report } from '@shared/index';
import { apiGet, apiPost } from '../../core/services/apiClient';
import { ENDPOINTS } from '../../core/constants/apiConstants';

export const reportService = {
  /**
   * ส่งเรื่องร้องเรียน
   *
   * *** Backend จะปฏิเสธถ้า ***
   *   - สิ่งที่แจ้งไม่มีอยู่จริง
   *   - แจ้งของตัวเอง
   *   - เคยแจ้งเรื่องเดิมที่ยังไม่ปิดไปแล้ว
   *   - มีเรื่องค้างอยู่เกิน 5 เรื่อง
   * แอปไม่ต้องเช็คซ้ำ แค่แสดงข้อความ error ที่ได้กลับมา
   */
  async create(body: CreateReportRequest): Promise<Report> {
    const res = await apiPost<ApiResponse<Report>>(ENDPOINTS.REPORTS, body);
    return res.data;
  },

  /** เรื่องที่ตัวเองเคยแจ้งไว้ */
  async listMine(): Promise<Report[]> {
    const res = await apiGet<ApiResponse<Report[]>>(ENDPOINTS.MY_REPORTS);
    return res.data;
  },
};

export default reportService;
