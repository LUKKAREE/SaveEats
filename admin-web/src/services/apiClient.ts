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

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
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
    // ต่อเซิร์ฟเวอร์ไม่ได้เลย
    if (!axios.isAxiosError(error) || !error.response) {
      const clientError: ApiClientError = {
        message:
          'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้\n' +
          'ตรวจสอบว่าเปิด Backend อยู่หรือไม่ (cd backend แล้ว npm run dev)',
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
export function imageUrl(filename: string | null, folder: 'food' | 'store' | 'profile' = 'food'): string | null {
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
