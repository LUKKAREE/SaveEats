/**
 * authService - Logic ของระบบสมาชิก
 *
 * *** กฎเหล็กข้อ 2 : Business Logic ต้องอยู่ที่ services เท่านั้น ***
 * controller มีหน้าที่แค่รับ request แล้วส่งต่อมาที่นี่
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import type {
  AuthPayload, MePayload, PublicUser, RegisterRequest, LoginRequest,
  ChangePasswordRequest, UpdateProfileRequest, User, Store,
  ForgotPasswordRequest, ResetPasswordRequest, ForgotPasswordResult,
} from '@shared/index';
import { normalizeEmail } from '@shared/index';

import env from '../config/env';
import ApiError from '../utils/ApiError';
import userModel from '../models/userModel';
import storeModel from '../models/storeModel';
import passwordResetModel, { MAX_CODE_ATTEMPTS } from '../models/passwordResetModel';
import notificationService from './notificationService';
import emailService from './emailService';
import {
  assertAccountNotLocked, recordFailedLogin, clearFailedLogins,
} from '../middleware/rateLimitMiddleware';

const SALT_ROUNDS = 10;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * สุ่มรหัส 6 หลักสำหรับหน้า "ลืมรหัสผ่าน"
 *
 * *** ใช้ randomInt ไม่ใช่ Math.random ***
 * Math.random เดาค่าถัดไปได้ถ้ารู้ค่าก่อนหน้า ห้ามใช้กับอะไรที่เกี่ยวกับความปลอดภัย
 * randomInt ดึงความสุ่มจากระบบปฏิบัติการ เดาไม่ได้
 *
 * ช่วง 100000-999999 เพื่อให้ได้ 6 หลักเสมอ ไม่มีเลข 0 นำหน้า
 * ที่ต้องกันเลข 0 นำหน้าเพราะถ้าเผลอแปลงเป็นตัวเลขที่ไหนสักที่
 * '012345' จะกลายเป็น 12345 แล้วเทียบไม่ตรงกัน
 */
function generateResetCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/** หาคำขอจาก token ในลิงก์อีเมล */
async function findByToken(token: string) {
  const row = await passwordResetModel.findUsable(sha256(token.trim()));
  if (!row) {
    throw ApiError.badRequest('ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง');
  }
  return row;
}

/**
 * หาคำขอจากอีเมล + รหัส 6 หลักที่กรอกในแอป
 *
 * *** ข้อความ error ต้องเหมือนกันหมดทุกกรณี ***
 * ไม่มีอีเมลนี้ / ไม่เคยขอไว้ / รหัสผิด ต้องตอบเหมือนกัน
 * ถ้าตอบต่างกัน คนร้ายจะไล่เช็คได้ว่าอีเมลไหนเป็นสมาชิกของเราบ้าง
 */
async function findByCode(email: string, code: string) {
  const wrong = ApiError.badRequest('รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่อีกครั้ง');

  const user = await userModel.findByEmail(normalizeEmail(email));
  if (!user || !user.is_active) throw wrong;

  const row = await passwordResetModel.findLatestUsableFor(user.user_id);
  if (!row || row.code_hash === null) throw wrong;

  /*
   * กันการเดารหัส
   *
   * รหัส 6 หลักมีแค่ 1 ล้านแบบ ถ้าปล่อยให้ยิงไม่จำกัด เขียนสคริปต์
   * ไม่กี่นาทีก็ทะลุ จึงตัดจบที่ 5 ครั้งแล้วบังคับให้ขอรหัสใหม่
   * ซึ่งจะสุ่มเลขชุดใหม่ทั้งหมด ทำให้ที่เดาไปแล้วเสียเปล่า
   */
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await passwordResetModel.markUsed(row.reset_id);
    throw ApiError.badRequest('กรอกรหัสผิดหลายครั้งเกินไป กรุณากดขอรหัสใหม่');
  }

  if (row.code_hash !== sha256(code.trim())) {
    await passwordResetModel.bumpAttempts(row.reset_id);
    const left = MAX_CODE_ATTEMPTS - row.attempts - 1;
    throw ApiError.badRequest(
      left > 0 ? `รหัสไม่ถูกต้อง ลองได้อีก ${left} ครั้ง` : 'กรอกรหัสผิดหลายครั้งเกินไป กรุณากดขอรหัสใหม่'
    );
  }

  return row;
}

/** สร้าง JWT ให้ผู้ใช้ */
export function signToken(user: Pick<User, 'user_id' | 'role' | 'email'>): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    { userId: user.user_id, role: user.role, email: user.email },
    env.JWT_SECRET,
    options
  );
}

/**
 * ตัดข้อมูลที่ห้ามส่งออกไปให้ client (โดยเฉพาะ password)
 *
 * *** ชนิดที่คืนคือ PublicUser ซึ่งไม่มี field password อยู่เลย ***
 * ถ้าเผลอเขียนโค้ดที่ทำให้ password หลุดออกไป TypeScript จะฟ้องทันที
 */
export function toPublicUser(user: User): PublicUser {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    created_at: user.created_at,
  };
}

export const authService = {
  toPublicUser,
  signToken,

  /**
   * สมัครสมาชิก
   *
   * ถ้า role = seller จะสร้างร้านให้อัตโนมัติด้วย โดยสถานะเป็น pending
   * รอ Admin กดอนุมัติจึงจะขายได้ (ข้อค้าง 5)
   */
  async register(input: RegisterRequest): Promise<AuthPayload> {
    const role = input.role ?? 'customer';

    // *** ป้องกันซ้ำอีกชั้น ***
    // TypeScript กันไว้แล้วตั้งแต่ตอนเขียนโค้ด (RegisterRequest ไม่ยอมรับ 'admin')
    // และ validator กันไว้ที่ route แล้ว
    // แต่ยังเช็คตรงนี้อีกที เผื่อมีคนยิง API ตรงเข้ามา
    if ((role as string) === 'admin') {
      throw ApiError.forbidden('ไม่สามารถสมัครบัญชีผู้ดูแลระบบผ่านช่องทางนี้ได้');
    }

    const existing = await userModel.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('อีเมลนี้ถูกใช้สมัครไปแล้ว');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const userId = await userModel.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role,
    });

    let store: Store | null = null;
    if (role === 'seller') {
      if (!input.storeName || input.storeName.trim() === '') {
        throw ApiError.badRequest('กรุณากรอกชื่อร้าน');
      }
      const storeId = await storeModel.create({
        userId,
        storeName: input.storeName,
        address: input.address,
        phone: input.phone,
        latitude: input.latitude,
        longitude: input.longitude,
      });
      store = await storeModel.findById(storeId);

      await notificationService.notify({
        userId,
        title: 'ส่งคำขอเปิดร้านแล้ว',
        message: 'ร้านของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบ จะแจ้งผลให้ทราบอีกครั้ง',
        type: 'store',
        refId: storeId,
      });
    }

    const user = await userModel.findById(userId);
    if (!user) throw ApiError.notFound('สร้างบัญชีไม่สำเร็จ');

    return { user: toPublicUser(user), store, token: signToken(user) };
  },

  /**
   * เข้าสู่ระบบ
   *
   * ช่องแรกกรอกได้ทั้ง "อีเมล" และ "เบอร์โทรศัพท์" ตามหน้า Login แบบใหม่
   * ยังรับ field ชื่อ email ไว้ด้วย เพื่อให้ Admin Web ตัวเดิมใช้ต่อได้ทันที
   */
  async login({ identifier, email, password }: LoginRequest): Promise<AuthPayload> {
    const raw = (identifier ?? email ?? '').trim();
    if (raw === '') {
      throw ApiError.badRequest('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์');
    }

    /*
     * ถ้าเป็นอีเมลให้แปลงเป็นตัวพิมพ์เล็กก่อนค้นหา
     *
     * *** แต่ถ้าเป็นเบอร์โทรห้ามแตะ ***
     * ช่องนี้กรอกได้ทั้งอีเมลและเบอร์ ถ้าเอาไปดัดแปลงแบบเดียวกันหมด
     * เบอร์โทรอาจเพี้ยนจนหาไม่เจอ จึงเช็ค @ ก่อนว่าเป็นอีเมลจริงไหม
     */
    const key = raw.includes('@') ? normalizeEmail(raw) : raw;

    /*
     * *** เช็คก่อนแตะฐานข้อมูลเลย ***
     * บัญชีที่โดนเดารหัสผิดเกินโควตาจะถูกพัก 15 นาที
     * วางไว้บรรทัดแรกเพื่อไม่ให้คนร้ายยิงจนฐานข้อมูลทำงานหนักโดยเปล่าประโยชน์
     *
     * ตัวนับราย IP อยู่ที่ route (rateLimit) ส่วนตัวนี้นับราย "บัญชี"
     * ต้องมีทั้งคู่ เพราะคนร้ายที่ใช้ IP หลายพันตัวหมุนยิง
     * จะทำให้ตัวนับราย IP ไม่มีวันเต็ม แต่บัญชีเดียวโดนเดาไปหลายหมื่นครั้ง
     */
    assertAccountNotLocked(key);

    const user = await userModel.findByEmailOrPhone(key);

    // *** ข้อความ error ต้องเหมือนกันทุกกรณี ***
    // ทั้งตอนไม่มีบัญชีนี้ และตอนรหัสผิด
    // ไม่งั้นคนร้ายจะไล่เดาได้ว่าอีเมลไหนมีอยู่ในระบบบ้าง
    const WRONG = 'อีเมล เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง';

    if (!user) {
      // นับด้วย ไม่งั้นคนร้ายจะใช้อีเมลมั่ว ๆ ยิงหาว่าอีเมลไหนมีอยู่จริงได้ไม่จำกัด
      recordFailedLogin(key);
      throw ApiError.unauthorized(WRONG);
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      recordFailedLogin(key);
      throw ApiError.unauthorized(WRONG);
    }
    if (!user.is_active) {
      throw ApiError.forbidden('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    /*
     * เข้าได้แล้ว ล้างตัวนับทิ้ง
     * ไม่งั้นคนที่พิมพ์ผิดไป 7 ครั้งแล้วเข้าได้ในครั้งที่ 8
     * จะเหลือโควตาแค่ครั้งเดียวไปอีก 15 นาที ทั้งที่พิสูจน์ตัวตนได้แล้ว
     */
    clearFailedLogins(key);

    const store = user.role === 'seller' ? await storeModel.findByUserId(user.user_id) : null;

    return { user: toPublicUser(user), store, token: signToken(user) };
  },

  /**
   * ลืมรหัสผ่าน - ขอลิงก์ตั้งรหัสใหม่ทางอีเมล
   *
   * *** ตอบข้อความเดียวกันเสมอ ไม่ว่าอีเมลนั้นจะมีในระบบหรือไม่ ***
   * ถ้าตอบต่างกัน คนร้ายจะเอาไปไล่เช็คได้ว่าใครเป็นสมาชิกของเราบ้าง
   */
  async forgotPassword({ email }: ForgotPasswordRequest): Promise<ForgotPasswordResult> {
    const user = await userModel.findByEmail(normalizeEmail(email));
    if (!user || !user.is_active) return { demoCode: null };

    // token ตัวจริงที่ส่งไปในอีเมล - สุ่มยาว 64 ตัวอักษร เดาไม่ได้
    const token = crypto.randomBytes(32).toString('hex');
    // รหัส 6 หลักสำหรับกรอกในแอป - สั้นพอที่คนจะพิมพ์ตามได้
    const code = generateResetCode();

    // ในฐานข้อมูลเก็บแค่ค่า hash ทั้งคู่ หลักการเดียวกับรหัสผ่าน
    const tokenHash = sha256(token);
    const codeHash = sha256(code);

    // ขอใหม่ = ของเก่าใช้ไม่ได้ทันที เหลือใบล่าสุดใบเดียวเสมอ
    await passwordResetModel.invalidateAllFor(user.user_id);
    await passwordResetModel.create(user.user_id, tokenHash, codeHash, env.RESET_TOKEN_MINUTES);

    const link = `${env.PUBLIC_BASE_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordReset(user.email, user.name, link, code);

    /*
     * *** ส่งรหัสกลับไปให้แอปเฉพาะตอนที่ยังไม่ได้ตั้งค่า SMTP ***
     *
     * ปกติรหัสต้องเดินทางไปทางอีเมลเท่านั้น คนที่ขอรีเซ็ตจึงต้องพิสูจน์ว่า
     * เข้าถึงอีเมลนั้นได้จริง ถ้าตอบรหัสกลับมาทาง API ใครก็กรอกอีเมลคนอื่น
     * แล้วยึดบัญชีได้ทันที ซึ่งเป็นช่องโหว่ร้ายแรง
     *
     * แต่ในโหมดสาธิตที่ไม่ได้ผูกบัญชีส่งอีเมล ถ้าไม่ส่งกลับมา
     * จะไม่มีทางรู้รหัสเลยและทดสอบบนมือถือไม่ได้
     *
     * พอเติม SMTP_USER ใน .env เมื่อไหร่ ค่านี้จะกลายเป็น null เองอัตโนมัติ
     * ไม่ต้องแก้โค้ดสักบรรทัด
     */
    return { demoCode: emailService.isConfigured ? null : code };
  },

  /**
   * ตั้งรหัสผ่านใหม่
   *
   * รับได้ 2 แบบ ชี้ไปที่คำขอใบเดียวกัน
   *   1. token          - มาจากลิงก์ในอีเมล (เปิดหน้าเว็บ)
   *   2. email + code   - มาจากรหัส 6 หลักที่กรอกในแอป
   */
  async resetPassword(body: ResetPasswordRequest): Promise<void> {
    const { newPassword } = body;
    const row = body.token !== undefined && body.token !== ''
      ? await findByToken(body.token)
      : await findByCode(body.email ?? '', body.code ?? '');

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userModel.updatePassword(row.user_id, hash);
    await passwordResetModel.markUsed(row.reset_id);

    await notificationService.notify({
      userId: row.user_id,
      title: 'เปลี่ยนรหัสผ่านแล้ว',
      message: 'รหัสผ่านของคุณถูกตั้งใหม่เรียบร้อย ถ้าไม่ได้เป็นคนทำ กรุณาติดต่อผู้ดูแลระบบทันที',
      type: 'system',
      refId: null,
    });
  },

  /** ดึงข้อมูลผู้ใช้ปัจจุบันจาก token (GET /api/auth/me) */
  async me(userId: number): Promise<MePayload> {
    const user = await userModel.findById(userId);
    if (!user) throw ApiError.notFound('ไม่พบบัญชีผู้ใช้นี้');

    const store = user.role === 'seller' ? await storeModel.findByUserId(userId) : null;
    return { user: toPublicUser(user), store };
  },

  /**
   * แก้ไขข้อมูลส่วนตัว
   *
   * *** เปลี่ยนได้แค่ ชื่อ / เบอร์โทร / รูปโปรไฟล์ เท่านั้น ***
   * ห้ามเปลี่ยน email เพราะเป็นตัวระบุตัวตนตอน login
   * ห้ามเปลี่ยน role เพราะจะกลายเป็นช่องโหว่ให้ยกระดับตัวเองเป็น admin ได้
   *
   * เราไม่ได้อ่านค่าจาก body ทั้งก้อนแล้วโยนลง SQL ตรง ๆ
   * แต่หยิบมาทีละ field ที่อนุญาต เพื่อกันข้อมูลแปลกปลอมหลุดเข้าไป
   */
  async updateProfile(
    userId: number,
    { name, phone }: UpdateProfileRequest,
    avatar?: string
  ): Promise<MePayload> {
    const updated = await userModel.updateProfile(userId, { name, phone, avatar });
    if (!updated) throw ApiError.notFound('ไม่พบบัญชีผู้ใช้นี้');

    const store = updated.role === 'seller' ? await storeModel.findByUserId(userId) : null;
    return { user: toPublicUser(updated), store };
  },

  /** เปลี่ยนรหัสผ่าน */
  async changePassword(userId: number, { currentPassword, newPassword }: ChangePasswordRequest): Promise<void> {
    const profile = await userModel.findById(userId);
    if (!profile) throw ApiError.notFound('ไม่พบบัญชีผู้ใช้นี้');

    const withPassword = await userModel.findByEmail(profile.email);
    if (!withPassword) throw ApiError.notFound('ไม่พบบัญชีผู้ใช้นี้');

    const match = await bcrypt.compare(currentPassword, withPassword.password);
    if (!match) throw ApiError.badRequest('รหัสผ่านเดิมไม่ถูกต้อง');

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userModel.updatePassword(userId, hash);
  },
};

export default authService;
