/**
 * apiClient - ตัวกลางคุยกับ Backend ของฝั่ง Admin Web
 *
 * *** ทุกการเรียก API ต้องผ่านไฟล์นี้เท่านั้น ***
 *
 * สิ่งที่ทำให้อัตโนมัติ
 *   - แนบ Authorization: Bearer <token>
 *   - token หมดอายุ (401) -> ล้างข้อมูลแล้วเด้งกลับหน้า login
 *   - แปลง error เป็นข้อความภาษาไทย
 *
 * ประโยชน์ของ TypeScript ตรงนี้
 *   ฟังก์ชัน get / post คืนค่าเป็นชนิดที่เราระบุ เช่น ApiResponse<DashboardStats>
 *   หน้าจอจึงรู้ทันทีว่าข้อมูลที่ได้มีอะไรบ้าง ไม่ต้องเดา
 */
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiClientError, ApiErrorResponse } from '@shared/index';

/**
 * ที่อยู่ของ Backend
 * Admin Web รันบนคอมเครื่องเดียวกับ Backend ใช้ localhost ได้เลย
 * (ต่างจากมือถือที่ต้องใช้ IP)
 */
/*
 * ที่อยู่ของ Backend
 *
 * ตอนพัฒนาในเครื่อง ไม่ต้องตั้งอะไร ใช้ localhost อัตโนมัติ
 * ตอนขึ้นเว็บจริง ให้ตั้งค่า VITE_API_URL ในหน้าตั้งค่าของ Vercel
 * เช่น  VITE_API_URL = https://saveeats-api.onrender.com
 *
 * *** ชื่อต้องขึ้นต้นด้วย VITE_ เท่านั้น ***
 * Vite จะฝังเฉพาะตัวแปรที่ขึ้นต้นแบบนี้ลงในไฟล์ที่ build ออกมา
 * ถ้าตั้งชื่ออื่นจะอ่านไม่เจอ แล้วเว็บจะวิ่งไปหา localhost เหมือนเดิม
 */
export const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api`;

export const STORAGE_KEYS = {
  TOKEN: 'saveeats_admin_token',
  USER: 'saveeats_admin_user',
} as const;

/*
 * เวลารอคำตอบสูงสุดก่อนยอมแพ้ (มิลลิวินาที)
 *
 * *** ทำไมต้องยาวถึง 60 วินาที ทั้งที่ปกติ API ตอบใน 1-2 วินาที ***
 * Backend อยู่บน Render แผนฟรี ซึ่งจะพักเครื่องเมื่อไม่มีคนใช้ประมาณ 15 นาที
 * คำขอแรกหลังตื่นต้องรอเครื่องบูตใหม่ ใช้เวลาราว 30-50 วินาที
 *
 * ค่าเดิมตั้งไว้ 15 วินาที ซึ่งพอตอนรันในเครื่องตัวเองที่ Backend เปิดค้างอยู่
 * แต่พอขึ้นเว็บจริง คำขอแรกของวันจะหมดเวลาก่อนเสมอ แล้วขึ้นว่าต่อไม่ติด
 * ทั้งที่เซิร์ฟเวอร์กำลังตื่นอยู่และอีกไม่กี่วินาทีก็พร้อมใช้งาน
 *
 * 60 วินาทีจึงเผื่อไว้ให้ครอบคลุมกรณีช้าสุด โดยยังไม่นานจนผู้ใช้คิดว่าแอปค้าง
 */
const REQUEST_TIMEOUT_MS = 60000;

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    /*
     * ต่อเซิร์ฟเวอร์ไม่ได้เลย (ไม่มีคำตอบกลับมา)
     *
     * *** ทำไมต้องแยกข้อความระหว่างหมดเวลา กับ ต่อไม่ติด ***
     * สองกรณีนี้ผู้ใช้ต้องทำคนละอย่าง
     *   หมดเวลา  = เซิร์ฟเวอร์กำลังตื่นอยู่ รอแล้วลองใหม่ก็หาย
     *   ต่อไม่ติด = เน็ตมีปัญหา หรือเซิร์ฟเวอร์ล่มจริง
     * ถ้าขึ้นข้อความเดียวกันทั้งคู่ ผู้ใช้จะไม่รู้ว่าควรรอหรือควรแจ้งคนดูแล
     *
     * *** ข้อความเดิมเขียนไว้สำหรับตอนพัฒนา ***
     * เดิมบอกให้ไปพิมพ์ "cd backend แล้ว npm run dev" ซึ่งใช้ได้ตอนรันในเครื่อง
     * แต่พอขึ้นเว็บจริงแล้วผู้ใช้เป็นผู้ดูแลร้าน ไม่ใช่คนเขียนโปรแกรม
     * การบอกให้ไปพิมพ์คำสั่งจึงไม่มีประโยชน์และทำให้คิดว่าระบบพัง
     */
    if (!axios.isAxiosError(error) || !error.response) {
      const isTimeout =
        axios.isAxiosError(error)
        && (error.code === 'ECONNABORTED' || error.message.includes('timeout'));

      const clientError: ApiClientError = {
        message: isTimeout
          ? 'เซิร์ฟเวอร์ตอบช้ากว่าปกติ\n'
            + 'อาจกำลังเริ่มทำงานอยู่ กรุณารอสักครู่แล้วลองอีกครั้ง'
          : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้\n'
            + 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง',
        status: 0,
        details: null,
      };
      return Promise.reject(clientError);
    }

    const status = error.response.status;
    const data = error.response.data as ApiErrorResponse | undefined;

    if (status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const clientError: ApiClientError = {
      message: data?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่',
      status,
      details: data?.details ?? null,
    };
    return Promise.reject(clientError);
  }
);

/**
 * ยิง GET แล้วได้ข้อมูลที่มีชนิดชัดเจน
 * @template T ชนิดของ response ทั้งก้อน เช่น ApiResponse<DashboardStats>
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.post<T>(url, body, config);
  return res.data;
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.put<T>(url, body, config);
  return res.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.delete<T>(url, config);
  return res.data;
}

/** แปลงชื่อไฟล์รูปเป็น URL เต็ม */
export function imageUrl(
  filename: string | null | undefined,
  folder: 'food' | 'store' | 'profile' | 'report' = 'food'
): string | null {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${BASE_URL}/uploads/${folder}/${filename}`;
}

/**
 * ตัวช่วยอ่านข้อความ error
 * ใช้ตอน catch เพราะ TypeScript ให้ error เป็นชนิด unknown เสมอ
 */
export function errorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

export default client;
