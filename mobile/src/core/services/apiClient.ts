/**
 * apiClient - ตัวกลางคุยกับ Backend
 *
 * *** ทุกการเรียก API ต้องผ่านไฟล์นี้เท่านั้น ***
 * ห้ามใช้ fetch หรือ axios ตรง ๆ ในหน้าจอ
 *
 * สิ่งที่ไฟล์นี้ทำให้อัตโนมัติ
 *   - แนบ Authorization: Bearer <token> ให้ทุก request
 *   - แปลง error ให้เป็นข้อความภาษาไทยที่เอาไปโชว์ได้เลย
 *   - ถ้า token หมดอายุ (401) จะล้างข้อมูลในเครื่องให้
 *
 * ประโยชน์ของ TypeScript ตรงนี้
 *   apiGet<ApiResponse<FeedItem>> จะรู้ทันทีว่าใน data มี field อะไรบ้าง
 */
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiClientError, ApiErrorResponse } from '@shared/index';
import { API_URL, API_TIMEOUT } from '../constants/apiConstants';
import storageService from './storageService';

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/** ฟังก์ชันที่จะถูกเรียกเมื่อ token หมดอายุ (ตั้งค่าจาก AuthContext) */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

// ---- ก่อนส่ง request : แนบ token ----
client.interceptors.request.use(async (config) => {
  const token = await storageService.getToken();
  if (token !== null) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- หลังได้ response : จัดการ error ----
client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // 1) ต่อ server ไม่ได้เลย
    if (!axios.isAxiosError(error) || !error.response) {
      const timedOut = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
      const clientError: ApiClientError = {
        message: timedOut
          ? 'เชื่อมต่อเซิร์ฟเวอร์นานเกินไป กรุณาลองใหม่'
          : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้\n\n' +
            'ตรวจสอบว่า:\n' +
            '1. เปิด Backend อยู่หรือไม่ (npm run dev)\n' +
            '2. มือถือกับคอมอยู่ Wi-Fi วงเดียวกันไหม\n' +
            '3. เลข IP ใน core/constants/apiConstants.ts ถูกต้องไหม',
        status: 0,
        details: null,
      };
      return Promise.reject(clientError);
    }

    const status = error.response.status;
    const data = error.response.data as ApiErrorResponse | undefined;

    // 2) token หมดอายุหรือไม่ถูกต้อง
    if (status === 401) {
      await storageService.clearAll();
      onUnauthorized?.();
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
 * @template T ชนิดของ response ทั้งก้อน เช่น ApiResponse<FeedItem>
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

/** รูปที่เลือกมาจาก expo-image-picker */
export interface PickedImage {
  uri: string;
  name?: string;
  type?: string;
}

/**
 * เรียก API แบบส่งไฟล์ (multipart/form-data)
 * ใช้ตอนอัปโหลดรูปอาหาร รูปร้าน รูปโปรไฟล์
 */
export async function uploadRequest<T>(
  url: string,
  fields: Record<string, string | number | boolean | undefined | null> = {},
  file: PickedImage | null = null,
  method: 'post' | 'put' = 'post'
): Promise<T> {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }

  if (file) {
    // React Native ต้องส่งเป็น object แบบนี้ ไม่ใช่ Blob เหมือนบนเว็บ
    form.append('image', {
      uri: file.uri,
      name: file.name ?? 'photo.jpg',
      type: file.type ?? 'image/jpeg',
    } as unknown as Blob);
  }

  const res = await client.request<T>({
    url,
    method,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
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
