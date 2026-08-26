/** authService - login ของ Admin */
import type { ApiResponse, AuthPayload, MePayload, PublicUser, LoginRequest, ApiClientError } from '@shared/index';
import { apiPost, apiGet, STORAGE_KEYS } from './apiClient';

export const authService = {
  /**
   * เข้าสู่ระบบ
   * *** ต้องเป็น role = admin เท่านั้น ***
   * ลูกค้าหรือร้านค้าที่หลุดเข้ามาจะถูกปฏิเสธที่นี่ทันที
   * (Backend ก็ตรวจซ้ำอีกชั้นที่ requireAdmin อยู่แล้ว - กฎเหล็กข้อ 3)
   */
  async login(email: string, password: string): Promise<PublicUser> {
    const body: LoginRequest = { email, password };
    const res = await apiPost<ApiResponse<AuthPayload>>('/auth/login', body);
    const { user, token } = res.data;

    if (user.role !== 'admin') {
      const err: ApiClientError = {
        message: 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบผู้ดูแล',
        status: 403,
        details: null,
      };
      throw err;
    }

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  async me(): Promise<PublicUser> {
    const res = await apiGet<ApiResponse<MePayload>>('/auth/me');
    return res.data.user;
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getStoredUser(): PublicUser | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PublicUser;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },
};

export default authService;
