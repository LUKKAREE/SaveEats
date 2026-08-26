/**
 * กฎการตรวจอีเมลและรหัสผ่าน - แหล่งความจริงแหล่งเดียวของทั้งระบบ
 *
 * *** ทำไมต้องอยู่ใน shared ไม่ใช่ต่างคนต่างเขียน ***
 * ถ้าแอปเช็คแบบหนึ่ง Backend เช็คอีกแบบ จะเกิดสองปัญหาที่หาสาเหตุยากมาก
 *   1. แอปบอกว่ารหัสผ่านผ่านแล้ว แต่กดสมัครกลับโดน Backend ปฏิเสธ
 *      ผู้ใช้จะงงมากเพราะช่องกรอกเป็นสีเขียวหมดแล้ว
 *   2. วันหนึ่งเปลี่ยนกฎ แล้วลืมแก้อีกฝั่ง ช่องโหว่จะเปิดเงียบ ๆ โดยไม่มีใครรู้
 * เขียนไว้ที่เดียวแล้วให้ทุกฝั่งเรียกใช้ ปัญหานี้จึงเกิดไม่ได้เลย
 *
 * *** แอปตรวจก่อนเพื่อ UX เท่านั้น Backend ต้องตรวจซ้ำเสมอ (กฎเหล็กข้อ 3) ***
 * เพราะใครก็ยิง API ตรงได้โดยไม่ผ่านหน้าจอแอป
 */

// =====================================================================
//  อีเมล
// =====================================================================

/**
 * รูปแบบอีเมลที่ยอมรับ
 *
 * โครงสร้าง :  ชื่อผู้ใช้ @ ชื่อโดเมน . นามสกุลโดเมน
 *              somchai   @  gmail   . com
 *
 * เงื่อนไขที่ตรวจ
 *   - ต้องมี @ หนึ่งตัว ไม่มากไม่น้อยกว่านี้
 *   - หน้า @ ต้องมีอย่างน้อย 1 ตัวอักษร ห้ามมีช่องว่างหรือ @ ซ้ำ
 *   - หลัง @ ต้องมีจุดอย่างน้อย 1 จุด และหลังจุดสุดท้ายต้องเป็นตัวอักษร 2 ตัวขึ้นไป
 *     (กัน 'a@b' หรือ 'a@b.c' ซึ่งไม่ใช่โดเมนที่มีอยู่จริง)
 *
 * *** ไม่ได้ใช้ regex ตามมาตรฐาน RFC 5322 เป๊ะ ๆ โดยตั้งใจ ***
 * regex ตัวเต็มยาวหลายร้อยตัวอักษร อ่านไม่รู้เรื่อง แก้ไม่ได้
 * และยอมรับอีเมลแปลก ๆ ที่ไม่มีใครใช้จริง เช่น "a b"@example.com
 * ตัวนี้ครอบคลุมอีเมลที่คนใช้จริงทั้งหมด และอ่านเข้าใจได้
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** ความยาวสูงสุด ต้องไม่เกินขนาดคอลัมน์ users.email ในฐานข้อมูล */
export const EMAIL_MAX_LENGTH = 150;

/**
 * ตรวจอีเมล
 * @returns null = ผ่าน / ข้อความภาษาไทย = ไม่ผ่าน
 */
export function checkEmail(value: string): string | null {
  const email = value.trim();
  if (email === '') return 'กรุณากรอกอีเมล';
  if (email.length > EMAIL_MAX_LENGTH) return 'อีเมลยาวเกินไป';
  if (!email.includes('@')) return 'อีเมลต้องมีเครื่องหมาย @ เช่น somchai@gmail.com';
  if (!EMAIL_PATTERN.test(email)) return 'รูปแบบอีเมลไม่ถูกต้อง เช่น somchai@gmail.com';
  return null;
}


/**
 * ปรับอีเมลให้เป็นรูปแบบมาตรฐานก่อนเก็บลงฐานข้อมูล
 *
 * ทำแค่ 2 อย่าง : ตัดช่องว่างหัวท้าย และแปลงเป็นตัวพิมพ์เล็ก
 *
 * *** ห้ามใช้ normalizeEmail() ของไลบรารี validator เด็ดขาด ***
 * ตัวนั้น "ฉลาดเกินไป" จนทำระบบพัง มันจะ
 *    - ตัดจุดออกจากอีเมล Gmail : somchai.jaidee@gmail.com -> somchaijaidee@gmail.com
 *    - ตัดทุกอย่างหลัง +       : test+shop@gmail.com      -> test@gmail.com
 *
 * ในทางเทคนิคมันถูก เพราะ Gmail ส่งอีเมลทั้งสองแบบเข้ากล่องเดียวกันจริง
 * แต่ผลที่ตามมาคือ ผู้ใช้สมัครด้วย somchai.jaidee@gmail.com
 * ฐานข้อมูลเก็บเป็น somchaijaidee@gmail.com
 * พอเขา login ด้วยอีเมลที่ตัวเองพิมพ์ ระบบหาไม่เจอ เข้าไม่ได้ตลอดกาล
 * (บั๊กนี้เคยเกิดขึ้นจริงในโปรเจกต์นี้ เข้าด้วยเบอร์โทรได้ แต่อีเมลไม่ได้)
 *
 * กฎคือ : เก็บอีเมลตามที่ผู้ใช้พิมพ์ เปลี่ยนแค่ตัวพิมพ์เล็ก-ใหญ่ที่ไม่มีผลต่อการส่ง
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// =====================================================================
//  รหัสผ่าน
// =====================================================================

/**
 * ความยาวขั้นต่ำ 8 ตัว
 *
 * ทำไมต้อง 8 : รหัส 6 หลักที่เป็นตัวเลขล้วนมีความเป็นไปได้แค่ 1 ล้านแบบ
 * คอมพิวเตอร์ทั่วไปไล่เดาครบภายในไม่กี่วินาที
 * พอบังคับ 8 ตัวและต้องมีตัวพิมพ์ใหญ่ เล็ก ตัวเลข อักขระพิเศษ
 * ความเป็นไปได้พุ่งขึ้นเป็นหลักหลายพันล้านล้าน ทำให้การไล่เดาไม่คุ้มอีกต่อไป
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * ความยาวสูงสุด
 *
 * *** bcrypt อ่านได้แค่ 72 ไบต์แรกเท่านั้น ***
 * ตัวที่เกินจากนั้นถูกตัดทิ้งเงียบ ๆ ผู้ใช้จะเข้าใจผิดว่ารหัสยาว 200 ตัวปลอดภัยกว่า
 * ทั้งที่จริงระบบใช้แค่ 72 ตัวแรก จึงกันไว้ตั้งแต่ต้นให้ตรงกับความจริง
 */
export const PASSWORD_MAX_LENGTH = 72;

/** อักขระพิเศษที่นับว่าใช้ได้ */
export const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?~`';

/** ผลการตรวจรหัสผ่านทีละข้อ ใช้วาดรายการติ๊กถูกในหน้าสมัคร */
export interface PasswordChecks {
  /** ยาวอย่างน้อย 8 ตัว */
  length: boolean;
  /** มีตัวพิมพ์ใหญ่ A-Z */
  upper: boolean;
  /** มีตัวพิมพ์เล็ก a-z */
  lower: boolean;
  /** มีตัวเลข 0-9 */
  digit: boolean;
  /** มีอักขระพิเศษ */
  special: boolean;
}

/** คำอธิบายของแต่ละข้อ ใช้แสดงเป็นรายการให้ผู้ใช้เห็นว่าขาดอะไร */
export const PASSWORD_RULE_LABELS: Record<keyof PasswordChecks, string> = {
  length: `ยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
  upper: 'มีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว',
  lower: 'มีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว',
  digit: 'มีตัวเลข (0-9) อย่างน้อย 1 ตัว',
  special: 'มีอักขระพิเศษ (!@#$%^&*) อย่างน้อย 1 ตัว',
};

/**
 * ตรวจรหัสผ่านทีละข้อ
 *
 * *** คืนผลทุกข้อพร้อมกัน ไม่ใช่หยุดที่ข้อแรกที่ผิด ***
 * เพื่อให้หน้าจอแสดงรายการติ๊กถูกได้ครบทุกข้อในคราวเดียว
 * ถ้าบอกทีละข้อ ผู้ใช้ต้องลองแก้แล้วกดใหม่ซ้ำ ๆ กว่าจะรู้ว่าต้องใส่อะไรบ้าง
 */
export function checkPasswordRules(value: string): PasswordChecks {
  // สร้าง character class จาก SPECIAL_CHARS โดย escape ทุกตัวกันความหมายพิเศษใน regex
  const escaped = SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\\-]/g, '\\$&');
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    digit: /[0-9]/.test(value),
    special: new RegExp(`[${escaped}]`).test(value),
  };
}

/** ผ่านครบทุกข้อหรือยัง */
export function isPasswordStrong(value: string): boolean {
  return Object.values(checkPasswordRules(value)).every(Boolean);
}

/**
 * ตรวจรหัสผ่านแล้วคืนข้อความบอกว่าขาดอะไร
 * @returns null = ผ่าน / ข้อความภาษาไทย = ไม่ผ่าน
 */
export function checkPassword(value: string, context: PasswordContext = {}): string | null {
  if (value === '') return 'กรุณากรอกรหัสผ่าน';
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `รหัสผ่านยาวเกินไป (ไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร)`;
  }

  const checks = checkPasswordRules(value);
  const missing = (Object.keys(checks) as (keyof PasswordChecks)[])
    .filter((key) => !checks[key])
    .map((key) => PASSWORD_RULE_LABELS[key]);

  if (missing.length > 0) return `รหัสผ่านต้อง${missing.join(' / ')}`;

  /*
   * ผ่านกฎครบทุกข้อแล้วยังไม่พอ ต้องไม่เป็นรหัสที่คนใช้กันเกลื่อนด้วย
   *
   * เช็คทีหลังโดยตั้งใจ เพราะถ้ายังกรอกไม่ครบกฎ
   * การไปบอกว่า "รหัสนี้ยอดฮิต" จะทำให้ผู้ใช้สับสนว่าต้องแก้อะไรกันแน่
   */
  return checkPasswordBlocklist(value, context);
}

// =====================================================================
//  รหัสผ่านยอดฮิต - ด่านที่สำคัญที่สุด
// =====================================================================

/**
 * รหัสผ่านที่ถูกใช้ซ้ำมากที่สุดในโลก และรูปแบบที่คนไทยนิยม
 *
 * *** ทำไมด่านนี้สำคัญกว่ากฎ "ต้องมีตัวใหญ่ตัวเล็ก" เสียอีก ***
 * คนร้ายไม่ได้ไล่เดาทีละตัวจาก aaaaaaaa เขาเอา "ลิสต์รหัสที่เคยรั่วไหล"
 * หลายร้อยล้านรหัสมายิงก่อนเสมอ เพราะได้ผลเร็วกว่ามาก
 *
 * 'Passw0rd!' ผ่านกฎครบทั้ง 5 ข้อ (8 ตัว ใหญ่ เล็ก เลข อักขระพิเศษ)
 * แต่อยู่ในลิสต์พวกนั้นเป็นอันดับต้น ๆ คนร้ายเดาถูกในไม่กี่วินาที
 * กฎ composition rules จึงกันรหัสแบบนี้ไม่ได้เลย ต้องมีด่านนี้เสริม
 *
 * NIST SP 800-63B ระบุว่าการเช็คลิสต์นี้ "ควรทำ"
 * ส่วนกฎ composition rules ระบุว่า "ไม่ควรบังคับ"
 *
 * *** ระบบจริงใช้ลิสต์หลายล้านรหัส เก็บในฐานข้อมูลหรือเรียก API ***
 * ที่นี่เก็บเฉพาะตัวยอดนิยมไว้ในโค้ด เพราะโปรเจกต์นี้ต้องทำงานได้โดยไม่ต้องพึ่งเน็ต
 * ถ้าจะยกระดับ ใช้ Have I Been Pwned API ซึ่งส่งไปแค่ 5 ตัวแรกของค่า hash
 * ทำให้ตรวจได้โดยไม่ต้องเปิดเผยรหัสจริงให้ใคร
 */
const COMMON_PASSWORDS: readonly string[] = [
  // สากล ติดอันดับทุกปี
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'password1', 'password123',
  '12345678', '123456789', '1234567890', '123123123', '11111111', '00000000',
  'qwerty', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'iloveyou', 'letmein', 'welcome', 'welcome1', 'admin', 'administrator',
  'abc12345', 'a1b2c3d4', 'monkey', 'dragon', 'sunshine', 'princess',
  'football', 'baseball', 'superman', 'batman', 'trustno1', 'starwars',
  'master', 'shadow', 'michael', 'jennifer', 'computer', 'internet',
  'samsung', 'google', 'facebook', 'whatever', 'changeme', 'secret',

  // ไทยนิยม
  'saveeats', 'thailand', 'bangkok', 'sawasdee', 'krabkrab',
  'chatchai', 'somchai', 'somsri', 'narak', 'suaymak',

  // แป้นพิมพ์ไล่ติดกัน
  '1qaz2wsx', 'qazwsxedc', '1q2w3e4r', 'q1w2e3r4', 'zaq12wsx',
];

/**
 * แปลงรหัสผ่านเป็น "หลายรูปแบบ" เพื่อเอาไปเทียบกับลิสต์
 *
 * *** ทำไมต้องหลายรูปแบบ ไม่ใช่แค่แปลงแบบเดียว ***
 * คนพยายามเลี่ยงกฎด้วยการแต่งรหัสยอดฮิตเล็กน้อย เช่น
 *      password  ->  Password1!  ->  P@ssw0rd  ->  Passw0rd!
 * ทั้งหมดนี้คือรหัสเดียวกันในสายตาคนร้าย เพราะลิสต์ที่เขาใช้ยิง
 * มีทั้งตัวต้นฉบับและตัวที่แต่งแล้วอยู่ครบ
 *
 * ถ้าเราแปลงแบบเดียวจะจับได้แค่แบบเดียว จึงต้องลองหลายมุม
 * แล้วถือว่าไม่ผ่านถ้ามีมุมไหนตรงกับลิสต์ก็พอ
 */
function blocklistCandidates(value: string): string[] {
  const lower = value.toLowerCase();

  // เอาอักขระพิเศษออก เหลือแต่ตัวอักษรกับตัวเลข : "Passw0rd!" -> "passw0rd"
  const alnum = lower.replace(/[^a-z0-9]/g, '');

  // ตัดตัวเลขต่อท้ายที่คนชอบเติมเฉย ๆ : "password123" -> "password"
  const noTrailingDigits = alnum.replace(/[0-9]+$/, '');

  /*
   * แปลงตัวเลข/สัญลักษณ์ที่ใช้แทนตัวอักษรกลับคืน (leetspeak)
   * เลข 1 แทนได้ทั้ง l และ i จึงต้องลองทั้งสองแบบ
   */
  const deleet = (oneAs: string): string =>
    lower
      .replace(/[@4]/g, 'a')
      .replace(/0/g, 'o')
      .replace(/3/g, 'e')
      .replace(/[5$]/g, 's')
      .replace(/7/g, 't')
      .replace(/1/g, oneAs)
      .replace(/[^a-z]/g, '');

  const asL = deleet('l');
  const asI = deleet('i');

  return [
    lower,
    alnum,
    noTrailingDigits,
    asL,
    asI,
    // ตัดตัวอักษรซ้ำท้ายที่เกิดจากการแปลง เช่น "password1!" -> "passwordll" -> "password"
    asL.replace(/(l|i)+$/, ''),
    asI.replace(/(l|i)+$/, ''),
  ].filter((c) => c.length > 0);
}

/** ตัดให้เหลือแต่ตัวอักษร ใช้เทียบชื่อกับอีเมลของผู้ใช้ */
function lettersOnly(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

/** ข้อมูลส่วนตัวของผู้ใช้ ใช้กันไม่ให้เอาชื่อหรืออีเมลตัวเองมาตั้งเป็นรหัส */
export interface PasswordContext {
  email?: string | undefined;
  name?: string | undefined;
}

/**
 * เช็คว่ารหัสผ่านเดาง่ายเกินไปหรือไม่
 * @returns null = ผ่าน / ข้อความภาษาไทย = ไม่ผ่าน
 */
export function checkPasswordBlocklist(
  value: string,
  context: PasswordContext = {}
): string | null {
  const candidates = blocklistCandidates(value);

  // 1) ตรงกับรหัสยอดฮิตในลิสต์ (ลองเทียบทุกรูปแบบที่แปลงได้)
  if (candidates.some((c) => COMMON_PASSWORDS.includes(c))) {
    return 'รหัสผ่านนี้ถูกใช้กันแพร่หลายเกินไป คนร้ายเดาถูกได้ในไม่กี่วินาที กรุณาตั้งใหม่';
  }

  // 2) ตัวอักษรซ้ำตัวเดียวทั้งหมด เช่น aaaaaaaa หรือ 88888888
  if (/^(.)\1+$/.test(value)) {
    return 'รหัสผ่านห้ามเป็นตัวอักษรเดิมซ้ำกันทั้งหมด';
  }

  // 3) เรียงต่อกันตรง ๆ เช่น 12345678 หรือ abcdefgh
  if (hasLongRun(value)) {
    return 'รหัสผ่านห้ามเป็นตัวอักษรหรือตัวเลขเรียงต่อกัน เช่น 12345678 หรือ abcdefgh';
  }

  // 4) เอาชื่อหรืออีเมลตัวเองมาตั้ง - คนที่รู้จักเราจะเดาถูกเป็นอันดับแรก
  const emailLocal = (context.email ?? '').split('@')[0] ?? '';
  const haystack = lettersOnly(value);
  for (const personal of [emailLocal, context.name ?? '']) {
    const clean = lettersOnly(personal);
    // ต้องยาว 4 ตัวขึ้นไป ไม่งั้นชื่อสั้น ๆ อย่าง 'Ann' จะไปบังเอิญตรงกับรหัสดี ๆ
    if (clean.length >= 4 && haystack.includes(clean)) {
      return 'รหัสผ่านห้ามมีชื่อหรืออีเมลของคุณอยู่ในนั้น เพราะคนที่รู้จักคุณจะเดาถูกง่าย';
    }
  }

  return null;
}

/** มีตัวเรียงต่อกันยาว 5 ตัวขึ้นไปหรือไม่ (ทั้งขึ้นและลง) */
function hasLongRun(value: string): boolean {
  const RUN = 5;
  if (value.length < RUN) return false;

  let up = 1;
  let down = 1;
  for (let i = 1; i < value.length; i += 1) {
    const diff = value.charCodeAt(i) - value.charCodeAt(i - 1);
    up = diff === 1 ? up + 1 : 1;
    down = diff === -1 ? down + 1 : 1;
    if (up >= RUN || down >= RUN) return true;
  }
  return false;
}
