/**
 * reportService - แจ้งปัญหาให้ผู้ดูแลระบบ (ฝั่งแอป)
 *
 * ใช้ได้ทั้งลูกค้าและร้าน
 *
 * *** ไม่ต้องส่ง reporterId ไป ***
 * Backend อ่านจาก token เอง เพื่อไม่ให้ใครแจ้งในนามคนอื่นได้
 */
import type {
  ApiResponse, CreateReportRequest, Report, ReportMessage,
} from '@shared/index';
import { apiGet, apiPost, uploadRequest } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
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
  async create(body: CreateReportRequest, image: PickedImage | null = null): Promise<Report> {
    /*
     * ไม่ได้แนบรูป -> ส่งเป็น JSON ธรรมดาเหมือนเดิม
     * แนบรูป      -> ต้องส่งเป็น multipart/form-data เพราะไฟล์ใส่ใน JSON ไม่ได้
     *
     * ค่าทุกตัวใน multipart เดินทางเป็นข้อความ Backend จึงแปลง targetId
     * กลับเป็นตัวเลขให้เองด้วย Number() อยู่แล้ว ฝั่งนี้ส่งไปได้เลย
     */
    if (image === null) {
      const res = await apiPost<ApiResponse<Report>>(ENDPOINTS.REPORTS, body);
      return res.data;
    }

    const res = await uploadRequest<ApiResponse<Report>>(
      ENDPOINTS.REPORTS,
      { targetType: body.targetType, targetId: body.targetId, reason: body.reason },
      image
    );
    return res.data;
  },

  /** เรื่องที่ตัวเองเคยแจ้งไว้ */
  async listMine(): Promise<Report[]> {
    const res = await apiGet<ApiResponse<Report[]>>(ENDPOINTS.MY_REPORTS);
    return res.data;
  },

  /** บทสนทนาระหว่างเรากับผู้ดูแล ในเรื่องที่เราแจ้ง */
  async listMessages(reportId: number): Promise<ReportMessage[]> {
    const res = await apiGet<ApiResponse<ReportMessage[]>>(ENDPOINTS.REPORT_MESSAGES(reportId));
    return res.data;
  },

  /**
   * ส่งข้อมูลเพิ่มเข้าไปในเรื่อง
   * Backend จะปฏิเสธถ้าเรื่องปิดไปแล้ว แอปไม่ต้องเช็คซ้ำ แค่แสดง error ที่ได้กลับมา
   */
  async addMessage(reportId: number, message: string): Promise<ReportMessage> {
    const res = await apiPost<ApiResponse<ReportMessage>>(
      ENDPOINTS.REPORT_MESSAGES(reportId),
      { message }
    );
    return res.data;
  },
};

export default reportService;
