/**
 * ตรวจความถูกต้องของข้อมูลก่อนเข้า controller
 * ใช้คู่กับ middleware/validate.ts เสมอ
 *
 * ชนิด ValidationChain[] ทำให้ TypeScript รู้ว่าเอาไปวางใน router ได้
 */
import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { checkEmail, checkPassword, normalizeEmail, EMAIL_MAX_LENGTH } from '@shared/index';

/*
 * ตัวช่วยที่ยืมกฎจาก shared มาใช้
 *
 * *** ห้ามเขียนกฎซ้ำที่นี่เด็ดขาด ***
 * ถ้าเขียนซ้ำ วันหนึ่งจะเผลอแก้ที่แอปแต่ลืมแก้ที่นี่ (หรือกลับกัน)
 * แล้วจะเกิดอาการ "แอปบอกผ่าน แต่ server ปฏิเสธ" ซึ่งหาสาเหตุยากมาก
 */

/** อีเมลต้องถูกรูปแบบตามกฎกลาง */
const emailRule = (field = 'email'): ValidationChain =>
  body(field).trim()
    .isLength({ max: EMAIL_MAX_LENGTH }).withMessage('อีเมลยาวเกินไป')
    .custom((value: string) => {
      const error = checkEmail(value);
      if (error !== null) throw new Error(error);
      return true;
    })
    /*
     * *** ใช้ normalizeEmail ของเราเอง ไม่ใช่ของไลบรารี validator ***
     * ตัวของไลบรารีจะตัดจุดออกจากอีเมล Gmail
     *     somchai.jaidee@gmail.com  ->  somchaijaidee@gmail.com
     * ทำให้ผู้ใช้ login ด้วยอีเมลที่ตัวเองพิมพ์ไม่ได้อีกเลย
     * ของเราเปลี่ยนแค่ตัวพิมพ์เล็กกับตัดช่องว่าง ดูรายละเอียดที่ shared/src/validation.ts
     */
    .customSanitizer((value: string) => normalizeEmail(value));

/**
 * รหัสผ่านต้องแข็งแรงพอตามกฎกลาง
 * (8 ตัว + ใหญ่ เล็ก เลข อักขระพิเศษ + ไม่ใช่รหัสยอดฮิต + ไม่มีชื่อตัวเอง)
 *
 * ส่ง email กับ name เข้าไปด้วย เพื่อกันคนตั้งรหัสเป็นชื่อหรืออีเมลตัวเอง
 * ซึ่งคนที่รู้จักเจ้าตัวจะเดาถูกเป็นอันดับแรก
 */
const strongPasswordRule = (field: string): ValidationChain =>
  body(field).custom((value: string, { req }) => {
    const b = (req.body ?? {}) as { email?: unknown; name?: unknown };
    const error = checkPassword(value, {
      email: typeof b.email === 'string' ? b.email : undefined,
      name: typeof b.name === 'string' ? b.name : undefined,
    });
    if (error !== null) throw new Error(error);
    return true;
  });

export const registerRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('กรุณากรอกชื่อ')
    .isLength({ max: 100 }).withMessage('ชื่อยาวเกินไป'),
  emailRule(),
  strongPasswordRule('password'),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9]{9,10}$/).withMessage('เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'),
  // *** ห้ามให้สมัครเป็น admin ผ่าน API เด็ดขาด ***
  body('role').optional().isIn(['customer', 'seller'])
    .withMessage('ประเภทผู้ใช้ต้องเป็น customer หรือ seller เท่านั้น'),
  // ถ้าสมัครเป็นร้าน ต้องมีชื่อร้าน
  body('storeName').if(body('role').equals('seller'))
    .trim().notEmpty().withMessage('กรุณากรอกชื่อร้าน'),
];

/**
 * เข้าสู่ระบบ
 *
 * ช่องแรกกรอกได้ทั้งอีเมลและเบอร์โทร จึงตรวจแค่ว่า "ไม่ว่าง" ก็พอ
 * ปล่อยให้ backend ไปหาในฐานข้อมูลเอาเองว่าตรงกับใคร
 *
 * *** ห้ามใช้ normalizeEmail() ที่นี่ ***
 * เพราะถ้าผู้ใช้กรอกเบอร์โทรมา ตัวนั้นจะไปดัดแปลงข้อความจนหาไม่เจอ
 */
export const loginRules: ValidationChain[] = [
  body('identifier').optional().trim().notEmpty()
    .withMessage('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์'),
  body('email').optional().trim().notEmpty()
    .withMessage('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์'),
  body('password').notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
];

/** ขอลิงก์ตั้งรหัสผ่านใหม่ */
export const forgotPasswordRules: ValidationChain[] = [emailRule()];

/**
 * ตั้งรหัสผ่านใหม่
 *
 * รับได้ 2 แบบ จึงตรวจแบบ optional ทีละช่อง แล้วค่อยเช็ครวมทีเดียว
 *   1. token          - จากลิงก์ในอีเมล
 *   2. email + code   - จากรหัส 6 หลักที่กรอกในแอป
 *
 * *** ห้ามใช้ notEmpty กับทั้ง token และ code ***
 * เพราะผู้ใช้จะส่งมาแค่ทางเดียวเสมอ ถ้าบังคับทั้งคู่จะไม่มีทางผ่านเลย
 */
export const resetPasswordRules: ValidationChain[] = [
  body('token').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .customSanitizer((value: string) => normalizeEmail(value)),
  body('code').optional().trim()
    .matches(/^[0-9]{6}$/).withMessage('รหัสต้องเป็นตัวเลข 6 หลัก'),
  strongPasswordRule('newPassword'),
  body().custom((value: Record<string, unknown>) => {
    const hasToken = typeof value.token === 'string' && value.token.trim() !== '';
    const hasCode = typeof value.code === 'string' && value.code.trim() !== ''
      && typeof value.email === 'string' && value.email.trim() !== '';
    if (!hasToken && !hasCode) {
      throw new Error('ต้องส่งลิงก์ หรือ อีเมลคู่กับรหัส 6 หลัก อย่างใดอย่างหนึ่ง');
    }
    return true;
  }),
];

export const changePasswordRules: ValidationChain[] = [
  body('currentPassword').notEmpty().withMessage('กรุณากรอกรหัสผ่านเดิม'),
  strongPasswordRule('newPassword'),
];

/**
 * แก้ไขข้อมูลส่วนตัว
 *
 * ใช้ optional() ทุกช่อง เพราะผู้ใช้อาจแก้แค่ชื่อ ไม่ได้แตะเบอร์โทร
 * แต่ถ้าส่งมาแล้วต้องถูกรูปแบบ (ส่งชื่อว่างมาไม่ได้)
 *
 * *** ไม่มีกฎของ email ที่นี่โดยตั้งใจ ***
 * เพราะห้ามเปลี่ยนอีเมลผ่าน endpoint นี้ ถึงส่งมาก็จะถูกมองข้าม
 */
export const updateProfileRules: ValidationChain[] = [
  body('name').optional().trim().notEmpty().withMessage('ชื่อห้ามว่าง')
    .isLength({ max: 100 }).withMessage('ชื่อยาวเกินไป'),
  body('phone').optional({ values: 'falsy' })
    .matches(/^[0-9]{9,10}$/).withMessage('เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'),
];
