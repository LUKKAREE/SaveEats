/**
 * authService (ฝั่งแอป) - คุยกับ /api/auth
 * ทำหน้าที่แค่เรียก API และเก็บ token ลงเครื่อง
 * ไม่มี Business Logic (Logic อยู่ที่ Backend ทั้งหมด - กฎเหล็กข้อ 2)
 */
import type {
  ApiResponse, AuthPayload, MePayload,
  LoginRequest, RegisterRequest, ChangePasswordRequest, UpdateProfileRequest,
  ForgotPasswordRequest, ForgotPasswordResult, ResetPasswordRequest,
  PublicUser, Store, UserRole,
} from '@shared/index';
import { apiPost, apiGet, apiPut, uploadRequest } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import storageService from '../../core/services/storageService';
import { ENDPOINTS } from '../../core/constants/apiConstants';

/** ข้อมูลในฟอร์มสมัครสมาชิก (มี confirmPassword เพิ่มมาซึ่งไม่ได้ส่งไป backend) */
export interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: Exclude<UserRole, 'admin'>;
  storeName: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

/** session ที่เก็บไว้ในเครื่อง */
export interface StoredSession {
  token: string | null;
  user: PublicUser | null;
  store: Store | null;
}

export const authService = {
  /**
   * เข้าสู่ระบบ
   * @param identifier กรอกได้ทั้งอีเมลและเบอร์โทรศัพท์ backend หาให้เองว่าตรงกับใคร
   */
  async login(identifier: string, password: string): Promise<AuthPayload> {
    const body: LoginRequest = { identifier, password };
    const res = await apiPost<ApiResponse<AuthPayload>>(ENDPOINTS.LOGIN, body);
    const payload = res.data;

    await storageService.setToken(payload.token);
    await storageService.setUser(payload.user);
    await storageService.setStore(payload.store);

    return payload;
  },

  /**
   * สมัครสมาชิก
   * ถ้า role = 'seller' ต้องส่ง storeName มาด้วย
   * ร้านที่สมัครใหม่จะมีสถานะ pending รอ Admin อนุมัติ
   */
  async register(form: RegisterFormData): Promise<AuthPayload> {
    const body: RegisterRequest = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      ...(form.phone !== '' ? { phone: form.phone } : {}),
      ...(form.role === 'seller'
        ? {
            storeName: form.storeName,
            ...(form.address !== '' ? { address: form.address } : {}),
            ...(form.latitude !== undefined ? { latitude: form.latitude } : {}),
            ...(form.longitude !== undefined ? { longitude: form.longitude } : {}),
          }
        : {}),
    };

    const res = await apiPost<ApiResponse<AuthPayload>>(ENDPOINTS.REGISTER, body);
    const payload = res.data;

    await storageService.setToken(payload.token);
    await storageService.setUser(payload.user);
    await storageService.setStore(payload.store);

    return payload;
  },

  /** ดึงข้อมูลผู้ใช้ล่าสุดจาก server (ใช้ตอนเปิดแอปเพื่อเช็คว่า token ยังใช้ได้ไหม) */
  async fetchMe(): Promise<MePayload> {
    const res = await apiGet<ApiResponse<MePayload>>(ENDPOINTS.ME);
    await storageService.setUser(res.data.user);
    await storageService.setStore(res.data.store);
    return res.data;
  },

  /** ออกจากระบบ - ลบข้อมูลในเครื่องทิ้ง */
  async logout(): Promise<void> {
    try {
      await apiPost<ApiResponse<null>>(ENDPOINTS.LOGOUT);
    } catch {
      // ต่อ server ไม่ได้ก็ไม่เป็นไร ยังไงก็ต้องล้างข้อมูลในเครื่องอยู่ดี
    }
    await storageService.clearAll();
  },

  /**
   * แก้ไขข้อมูลส่วนตัว (ชื่อ / เบอร์โทร / รูปโปรไฟล์)
   *
   * ส่งเป็น multipart เสมอ เพราะอาจมีไฟล์รูปแนบมาด้วย
   * ไม่ส่งรูปมาก็ได้ Backend จะเก็บรูปเดิมไว้
   *
   * *** อัปเดตข้อมูลในเครื่องด้วยหลังบันทึกสำเร็จ ***
   * ไม่งั้นชื่อในหน้าโปรไฟล์จะยังเป็นชื่อเก่าจนกว่าจะปิดเปิดแอปใหม่
   */
  async updateProfile(
    fields: UpdateProfileRequest,
    image: PickedImage | null = null
  ): Promise<MePayload> {
    const res = await uploadRequest<ApiResponse<MePayload>>(
      ENDPOINTS.UPDATE_PROFILE,
      { name: fields.name, phone: fields.phone },
      image,
      'put'
    );
    await storageService.setUser(res.data.user);
    await storageService.setStore(res.data.store);
    return res.data;
  },

  /**
   * ลืมรหัสผ่าน - ขอลิงก์ตั้งรหัสใหม่ทางอีเมล
   *
   * *** backend ตอบข้อความเดียวกันเสมอ ***
   * ไม่ว่าอีเมลนั้นจะมีในระบบหรือไม่ เพื่อไม่ให้ใครไล่เช็คได้ว่าใครเป็นสมาชิก
   * ฝั่งแอปจึงแสดงผลว่า "ส่งแล้ว" เหมือนกันทุกกรณี
   */
  /**
   * ขอรหัส 6 หลักสำหรับตั้งรหัสผ่านใหม่
   *
   * คืน demoCode เฉพาะตอนที่เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าอีเมล (โหมดสาธิต)
   * ปกติจะเป็น null เพราะรหัสต้องเดินทางไปทางอีเมลเท่านั้น
   */
  async forgotPassword(
    email: string
  ): Promise<{ message: string; demoCode: string | null; demoMode: boolean }> {
    const body: ForgotPasswordRequest = { email };
    const res = await apiPost<ApiResponse<ForgotPasswordResult>>(ENDPOINTS.FORGOT_PASSWORD, body);
    return {
      message: res.message,
      demoCode: res.data?.demoCode ?? null,
      /*
       * ถ้าเซิร์ฟเวอร์รุ่นเก่ายังไม่ส่ง demoMode มา ให้ถือว่าไม่ใช่โหมดสาธิต
       * จะได้แสดงหน้าจอแบบเต็ม (มีช่องกรอกรหัส) ซึ่งใช้งานได้ทุกกรณี
       * ดีกว่าซ่อนช่องกรอกแล้วผู้ใช้ทำอะไรต่อไม่ได้
       */
      demoMode: res.data?.demoMode ?? false,
    };
  },

  /** ตั้งรหัสผ่านใหม่ด้วยรหัส 6 หลักที่กรอกในแอป */
  async resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<void> {
    const body: ResetPasswordRequest = { email, code, newPassword };
    await apiPost<ApiResponse<null>>(ENDPOINTS.RESET_PASSWORD, body);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const body: ChangePasswordRequest = { currentPassword, newPassword };
    await apiPut<ApiResponse<null>>(ENDPOINTS.CHANGE_PASSWORD, body);
  },

  /** อ่านข้อมูลที่เก็บไว้ในเครื่อง (ใช้ตอนเปิดแอปครั้งแรก) */
  async loadSession(): Promise<StoredSession> {
    const [token, user, store] = await Promise.all([
      storageService.getToken(),
      storageService.getUser(),
      storageService.getStore(),
    ]);
    return { token, user, store };
  },
};

export default authService;
