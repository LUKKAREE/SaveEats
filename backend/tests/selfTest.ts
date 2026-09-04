/**
 * ทดสอบ Logic ของ Backend โดยจำลองฐานข้อมูล (ไม่ต้องเปิด MySQL)
 *
 * วิธีรัน :  npm test
 *
 * ทำไมต้องจำลองฐานข้อมูล
 *   เพื่อให้ทดสอบ Logic ได้เร็วและได้ผลเหมือนเดิมทุกครั้ง
 *   ไม่ต้องเปิด XAMPP ไม่ต้องกลัวข้อมูลทดลองเปลี่ยน
 *
 * *** ไฟล์นี้ทดสอบเฉพาะ Logic ไม่ได้ทดสอบว่า SQL เขียนถูกไหม ***
 * การทดสอบ SQL ต้องยิง API จริงด้วย Thunder Client (ดูวิธีในไฟล์ 03_คู่มือทีม.txt)
 */
import assert from 'node:assert';
import path from 'node:path';
import type { PoolConnection } from 'mysql2/promise';
import type { Store, ReservationStatus, ReportStatus, ReportTargetType } from '@shared/index';

/** รูปร่างของแจ้งเตือนที่ notificationModel.create รับเข้ามา */
interface FakeNotification {
  userId: number; title: string; message: string;
  type: string; refId: number | null;
}

// ------------------------------------------------------------------
//  ฐานข้อมูลจำลองในหน่วยความจำ
// ------------------------------------------------------------------
interface FakeUser {
  user_id: number; name: string; email: string; phone: string | null;
  password: string; role: 'customer' | 'seller' | 'admin';
  avatar: string | null; is_active: number; created_at: string; updated_at: string;
}
interface FakePost {
  post_id: number; store_id: number; food_id: number; status: string;
  discount_price: number; quantity_total: number; quantity_left: number;
  pickup_start: string; pickup_end: string; food_name: string; store_name: string;
}
interface FakeReservation {
  reservation_id: number; customer_id: number; store_id: number; post_id: number;
  food_id: number; quantity: number; unit_price: number; total_price: number;
  qr_token: string; reservation_code: string; status: ReservationStatus;
  pickup_start: string; pickup_end: string; expires_at: string;
  food_name: string; store_name: string;
}

interface FakeReview {
  review_id: number; customer_id: number; store_id: number;
  reservation_id: number; rating: number; comment: string | null;
  created_at: string;
}

interface FakeReport {
  report_id: number; reporter_id: number;
  target_type: ReportTargetType; target_id: number;
  reason: string; status: ReportStatus;
  admin_note: string | null; resolution_message: string | null;
  created_at: string; updated_at: string;
}

const db = {
  users: [] as FakeUser[],
  stores: [] as Store[],
  posts: [] as FakePost[],
  reservations: [] as FakeReservation[],
  reports: [] as FakeReport[],
  reviews: [] as FakeReview[],
  favorites: [] as Array<{ user_id: number; store_id: number }>,
  notifications: [] as FakeNotification[],
  behavior: {} as Record<number, { store_id: number; score: number; status: string }>,
};
const seq = { user: 1, store: 1, res: 1, report: 1, review: 1 };

/*
 * ชื่อ property ที่ต้องปล่อยผ่าน ห้ามดักจับ
 * เพราะ JavaScript ใช้ชื่อพวกนี้ในกลไกภายในของตัวเอง
 * โดยเฉพาะ "then" ถ้าเผลอคืนฟังก์ชันให้ ตัว await จะเข้าใจผิดว่าเป็น Promise แล้วค้าง
 */
const PASS_THROUGH = new Set(['default', '__esModule', 'then', 'toJSON', 'constructor', 'inspect']);

/**
 * ห่อตัวจำลองไว้ด้วยยาม เพื่อให้ "เมธอดที่ลืมใส่" ฟ้องออกมาตรง ๆ
 *
 * *** ปัญหาที่ยามตัวนี้แก้ ***
 * ตัวจำลองเขียนด้วยมือ ส่วนโมเดลจริงมีคนไปเพิ่มเมธอดใหม่เรื่อย ๆ
 * พอโค้ดจริงเรียกเมธอดที่ตัวจำลองไม่มี ข้อความ error ที่ได้คือ
 *     import_userModel.default.findByEmailOrPhone is not a function
 * ซึ่งอ่านแล้วไม่รู้เลยว่าต้องไปแก้ที่ไหน คนอ่านมักไปนั่งหาบั๊กในโค้ดจริงแทน
 *
 * ยามตัวนี้เปลี่ยนให้เป็นข้อความที่บอกชัดว่า "ลืมเพิ่มเมธอดชื่อนี้ในไฟล์เทสต์"
 * ไม่ได้กันไม่ให้เกิด แต่ทำให้แก้ได้ใน 10 วินาทีแทนที่จะนั่งงงครึ่งชั่วโมง
 */
function guardMissing<T extends object>(name: string, target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver): unknown {
      if (typeof prop === 'symbol' || prop in obj || PASS_THROUGH.has(prop)) {
        return Reflect.get(obj, prop, receiver);
      }
      return (): never => {
        throw new Error(
          `ตัวจำลองของ ${name} ไม่มีเมธอด "${String(prop)}"\n`
          + '  แปลว่าโค้ดจริงเพิ่มเมธอดนี้ไปแล้ว แต่ลืมเพิ่มในฐานข้อมูลจำลองของไฟล์เทสต์\n'
          + `  วิธีแก้ : เปิด tests/selfTest.ts หาบล็อก mock('${name}', { ... }) แล้วเพิ่ม "${String(prop)}" เข้าไป`
        );
      };
    },
  });
}

/** แทนที่โมดูลด้วยของปลอม (ต้องทำก่อน import โมดูลที่ใช้มัน) */
function mock(relativePath: string, exportsObject: Record<string, unknown>): void {
  const resolved = require.resolve(path.join(__dirname, relativePath));
  const guarded = guardMissing(relativePath, { ...exportsObject });
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true,
    exports: guardMissing(relativePath, { ...exportsObject, default: guarded }),
  } as NodeJS.Module;
}

mock('../src/models/userModel', {
  userModel: null, // จะถูกแทนด้วย object ด้านล่างผ่าน default
  findByEmail: async (e: string) => db.users.find((u) => u.email === e) ?? null,
  /*
   * หน้า Login ให้กรอกช่องเดียวได้ทั้งอีเมลและเบอร์โทร authService จึงเรียกตัวนี้
   * ตัวจำลองต้องมีเมธอดครบเท่าของจริง ไม่งั้นเทสต์จะตายตรงที่เรียกเมธอดที่ไม่มี
   */
  findByEmailOrPhone: async (key: string) =>
    db.users.find((u) => u.email === key || u.phone === key) ?? null,
  findById: async (id: number) => {
    const u = db.users.find((x) => x.user_id === id);
    if (!u) return null;
    const { password: _pw, ...rest } = u;
    return rest;
  },
  create: async (i: { name: string; email: string; phone?: string; passwordHash: string; role: FakeUser['role'] }) => {
    const u: FakeUser = {
      user_id: seq.user++, name: i.name, email: i.email, phone: i.phone ?? null,
      password: i.passwordHash, role: i.role, avatar: null, is_active: 1,
      created_at: '2026-08-10 10:00:00', updated_at: '2026-08-10 10:00:00',
    };
    db.users.push(u);
    return u.user_id;
  },
  updatePassword: async () => undefined,
});

mock('../src/models/storeModel', {
  create: async (i: { userId: number; storeName: string }) => {
    const s = { store_id: seq.store++, user_id: i.userId, store_name: i.storeName, status: 'pending' } as Store;
    db.stores.push(s);
    return s.store_id;
  },
  findById: async (id: number) => db.stores.find((s) => s.store_id === Number(id)) ?? null,
  findByUserId: async (uid: number) => db.stores.find((s) => s.user_id === uid) ?? null,
  setStatus: async (id: number, status: Store['status']) => {
    const s = db.stores.find((x) => x.store_id === Number(id));
    if (s) s.status = status;
    return s ?? null;
  },
  /*
   * ของจริงสั่งฐานข้อมูลคำนวณค่าเฉลี่ยใหม่จากตาราง reviews
   * ตัวจำลองคำนวณเองแบบเดียวกัน จะได้ทดสอบได้ว่าเรียกแล้วคะแนนเปลี่ยนจริง
   */
  refreshRating: async (storeId: number) => {
    const s2 = db.stores.find((x) => x.store_id === Number(storeId));
    if (!s2) return;
    const rv = db.reviews.filter((x) => x.store_id === Number(storeId));
    const avg = rv.length === 0 ? 0 : rv.reduce((a, b) => a + b.rating, 0) / rv.length;
    s2.rating = Math.round(avg * 100) / 100;
    s2.review_count = rv.length;
  },
});

mock('../src/models/notificationModel', {
  create: async (n: FakeNotification) => { db.notifications.push(n); return db.notifications.length; },
});

mock('../src/models/reportModel', {
  findById: async (id: number) => db.reports.find((r) => r.report_id === Number(id)) ?? null,
  updateStatus: async (
    id: number,
    status: ReportStatus,
    adminNote: string | null = null,
    resolutionMessage: string | null = null
  ) => {
    const r = db.reports.find((x) => x.report_id === Number(id));
    if (!r) return null;
    r.status = status;
    // COALESCE ของจริง : ส่ง null มา = ไม่ได้ตั้งใจแก้ช่องนั้น ต้องเก็บค่าเดิมไว้
    if (adminNote !== null) r.admin_note = adminNote;
    if (resolutionMessage !== null) r.resolution_message = resolutionMessage;
    return r;
  },
});

mock('../src/models/reviewModel', {
  create: async (i: { customerId: number; storeId: number; reservationId: number; rating: number; comment?: string | null }) => {
    const rv: FakeReview = {
      review_id: seq.review++, customer_id: i.customerId, store_id: i.storeId,
      reservation_id: i.reservationId, rating: i.rating, comment: i.comment ?? null,
      created_at: '2026-09-03 12:00:00',
    };
    db.reviews.push(rv);
    return rv.review_id;
  },
  findById: async (id: number) => db.reviews.find((x) => x.review_id === Number(id)) ?? null,
  findByReservation: async (rid: number) =>
    db.reviews.find((x) => x.reservation_id === Number(rid)) ?? null,
  remove: async (id: number) => {
    const i = db.reviews.findIndex((x) => x.review_id === Number(id));
    if (i >= 0) db.reviews.splice(i, 1);
  },
});

/*
 * ร้านโปรด
 * ของจริงกันข้อมูลซ้ำด้วย UNIQUE KEY (user_id, store_id) ที่ฐานข้อมูล
 * ตัวจำลองจึงต้องกันซ้ำแบบเดียวกัน ไม่งั้นเทสต์จะผ่านทั้งที่ของจริงอาจพัง
 */
mock('../src/models/favoriteModel', {
  add: async (uid: number, sid: number) => {
    const dup = db.favorites.some((f) => f.user_id === uid && f.store_id === sid);
    if (!dup) db.favorites.push({ user_id: uid, store_id: sid });
  },
  remove: async (uid: number, sid: number) => {
    const i = db.favorites.findIndex((f) => f.user_id === uid && f.store_id === sid);
    if (i >= 0) db.favorites.splice(i, 1);
  },
  exists: async (uid: number, sid: number) =>
    db.favorites.some((f) => f.user_id === uid && f.store_id === sid),
  listStoreIds: async (uid: number) =>
    db.favorites.filter((f) => f.user_id === uid).map((f) => f.store_id),
});

mock('../src/models/postModel', {
  findById: async (id: number) => db.posts.find((p) => p.post_id === Number(id)) ?? null,
  decreaseQuantity: async (_c: PoolConnection, postId: number, amount: number) => {
    const p = db.posts.find((x) => x.post_id === Number(postId));
    if (!p || p.quantity_left < amount) return false;
    p.quantity_left -= amount;
    if (p.quantity_left === 0) p.status = 'sold_out';
    return true;
  },
  increaseQuantity: async (postId: number, amount: number) => {
    const p = db.posts.find((x) => x.post_id === Number(postId));
    if (p) p.quantity_left += amount;
  },
});

mock('../src/models/reservationModel', {
  createInTransaction: async (_c: PoolConnection, d: Record<string, never>) => {
    const data = d as unknown as {
      customerId: number; storeId: number; postId: number; foodId: number;
      quantity: number; unitPrice: number; totalPrice: number;
      qrToken: string; reservationCode: string;
      pickupStart: string; pickupEnd: string; expiresAt: string;
    };
    const r: FakeReservation = {
      reservation_id: seq.res++, customer_id: data.customerId, store_id: data.storeId,
      post_id: data.postId, food_id: data.foodId, quantity: data.quantity,
      unit_price: data.unitPrice, total_price: data.totalPrice,
      qr_token: data.qrToken, reservation_code: data.reservationCode, status: 'confirmed',
      pickup_start: data.pickupStart, pickup_end: data.pickupEnd, expires_at: data.expiresAt,
      food_name: 'ข้าวกะเพรา', store_name: 'ครัวคุณแม่',
    };
    db.reservations.push(r);
    return r.reservation_id;
  },
  findById: async (id: number) => db.reservations.find((r) => r.reservation_id === Number(id)) ?? null,
  findByQrToken: async (t: string) => db.reservations.find((r) => r.qr_token === t) ?? null,
  findByCode: async (sid: number, c: string) =>
    db.reservations.find((r) => r.store_id === sid && r.reservation_code === c) ?? null,
  setStatus: async (id: number, st: ReservationStatus) => {
    const r = db.reservations.find((x) => x.reservation_id === Number(id));
    if (r) r.status = st;
    return r ?? null;
  },
  /*
   * ปิดการจองเฉพาะเมื่อยังเปิดอยู่ (จำลองเงื่อนไข WHERE ... AND status IN (...) ของจริง)
   * คืน true = เราเป็นคนปิดสำเร็จ จึงมีสิทธิ์คืนของกลับเข้าโพสต์
   * คืน false = มีคนปิดไปก่อนแล้ว ห้ามคืนของซ้ำ
   */
  closeIfOpen: async (id: number, st: ReservationStatus) => {
    const r = db.reservations.find((x) => x.reservation_id === Number(id));
    if (!r || !['confirmed', 'waiting'].includes(r.status)) return false;
    r.status = st;
    return true;
  },
  countActiveByCustomerAndPost: async (cid: number, pid: number) =>
    db.reservations
      .filter((r) => r.customer_id === cid && r.post_id === Number(pid) && ['confirmed', 'waiting'].includes(r.status))
      .reduce((sum, r) => sum + r.quantity, 0),
});

mock('../src/models/behaviorScoreModel', {
  ensureExists: async (id: number) => {
    db.behavior[id] ??= { store_id: id, score: 100, status: 'good' };
  },
  findByStore: async (id: number) => db.behavior[id] ?? null,
  applyChange: async (id: number, change: number, reason: string, status?: string) => {
    db.behavior[id] ??= { store_id: id, score: 100, status: 'good' };
    const b = db.behavior[id];
    b.score = Math.max(0, Math.min(100, b.score + change));
    if (status) b.status = status;
    return { ...b, reason, updated_at: '' };
  },
  listLogs: async () => [],
});

mock('../src/config/db', {
  withTransaction: async <T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> =>
    fn({ execute: async () => [{ affectedRows: 1 }] } as unknown as PoolConnection),
  query: async () => [],
  execute: async () => ({ insertId: 1, affectedRows: 1 }),
  paginate: () => ({ sql: 'LIMIT 20 OFFSET 0', page: 1, limit: 20, offset: 0 }),
  limitOnly: () => 'LIMIT 20',
  countOf: async () => 0,
});

process.env['JWT_SECRET'] = 'test_secret';

/* eslint-disable @typescript-eslint/no-var-requires */
const authService = require('../src/services/authService').default;
const reservationService = require('../src/services/reservationService').default;
const reportService = require('../src/services/reportService').default;
const reviewService = require('../src/services/reviewService').default;
const behaviorScoreService = require('../src/services/behaviorScoreService').default;
const favoriteModel = require('../src/models/favoriteModel').default;
const qrService = require('../src/services/qrService').default;
const { distanceKm } = require('../src/utils/geo');

// ------------------------------------------------------------------
//  ตัวรันเทส
// ------------------------------------------------------------------
let pass = 0;
let fail = 0;

async function t(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log('  [ผ่าน]', name);
    pass++;
  } catch (e) {
    console.log('  [ไม่ผ่าน]', name, '->', e instanceof Error ? e.message : String(e));
    fail++;
  }
}

function statusCodeOf(e: unknown): number | undefined {
  return typeof e === 'object' && e !== null && 'statusCode' in e
    ? (e as { statusCode: number }).statusCode
    : undefined;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const fmt = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

async function main(): Promise<void> {
  console.log('\n=== ทดสอบ Auth ===');

  await t('สมัครลูกค้าได้ และได้ token กลับมา', async () => {
    const result = await authService.register({
      name: 'ทดสอบ', email: 'c@test.com', password: '123456', role: 'customer',
    });
    assert.ok(result.token);
    assert.strictEqual(result.user.role, 'customer');
    assert.strictEqual('password' in result.user, false, 'ต้องไม่ส่ง password กลับไป');
  });

  await t('สมัครอีเมลซ้ำไม่ได้', async () => {
    try {
      await authService.register({ name: 'x', email: 'c@test.com', password: '123456' });
      throw new Error('ไม่ควรสมัครสำเร็จ');
    } catch (e) {
      assert.strictEqual(statusCodeOf(e), 409);
    }
  });

  await t('สมัคร admin ผ่าน API ไม่ได้', async () => {
    try {
      await authService.register({ name: 'x', email: 'a@test.com', password: '123456', role: 'admin' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) {
      assert.strictEqual(statusCodeOf(e), 403);
    }
  });

  await t('สมัครร้านค้าแล้วร้านมีสถานะ pending', async () => {
    const result = await authService.register({
      name: 'ร้าน', email: 's@test.com', password: '123456', role: 'seller', storeName: 'ครัวคุณแม่',
    });
    assert.strictEqual(result.store.status, 'pending');
  });

  await t('สมัครร้านโดยไม่ใส่ชื่อร้านไม่ได้', async () => {
    try {
      await authService.register({ name: 'x', email: 's2@test.com', password: '123456', role: 'seller' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) {
      assert.strictEqual(statusCodeOf(e), 400);
    }
  });

  await t('login ด้วยรหัสถูกต้องผ่าน', async () => {
    const r = await authService.login({ email: 'c@test.com', password: '123456' });
    assert.ok(r.token);
  });

  await t('login ด้วยรหัสผิดไม่ผ่าน และข้อความไม่บอกว่าอีเมลมีอยู่จริง', async () => {
    let m1 = '';
    let m2 = '';
    try { await authService.login({ email: 'c@test.com', password: 'wrong' }); }
    catch (e) { m1 = e instanceof Error ? e.message : ''; }
    try { await authService.login({ email: 'none@test.com', password: 'x' }); }
    catch (e) { m2 = e instanceof Error ? e.message : ''; }
    assert.strictEqual(m1, m2, 'ข้อความ error ต้องเหมือนกัน');
  });

  console.log('\n=== ทดสอบการจอง ===');
  const future = new Date(Date.now() + 3 * 3600 * 1000);
  const store0 = db.stores[0];
  assert.ok(store0);
  store0.status = 'approved';
  db.posts.push({
    post_id: 1, store_id: 1, food_id: 1, status: 'active', discount_price: 35,
    quantity_total: 5, quantity_left: 5, pickup_start: fmt(new Date()), pickup_end: fmt(future),
    food_name: 'ข้าวกะเพรา', store_name: 'ครัวคุณแม่',
  });
  const post0 = db.posts[0];
  assert.ok(post0);

  let reservation: { reservation_id: number; qr_payload: string; reservation_code: string };

  await t('จองสำเร็จ ได้ QR + รหัส 4 หลัก และของถูกตัด', async () => {
    reservation = await reservationService.create(1, { postId: 1, quantity: 2 });
    assert.strictEqual(post0.quantity_left, 3);
    assert.match(reservation.reservation_code, /^[0-9]{4}$/);
    assert.match(reservation.qr_payload, /^SAVEEATS:[a-f0-9]{32}$/);
  });

  await t('จองเกินโควตาต่อคนไม่ได้', async () => {
    try {
      await reservationService.create(1, { postId: 1, quantity: 4 });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 400); }
  });

  await t('จองมากกว่าของที่เหลือไม่ได้', async () => {
    try {
      await reservationService.create(2, { postId: 1, quantity: 5 });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.ok([400, 409].includes(statusCodeOf(e) ?? 0)); }
  });

  await t('จองจากร้านที่ยังไม่อนุมัติไม่ได้', async () => {
    store0.status = 'pending';
    try {
      await reservationService.create(3, { postId: 1, quantity: 1 });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 400); }
    store0.status = 'approved';
  });

  console.log('\n=== ทดสอบการยืนยัน QR (กฎเหล็กข้อ 4) ===');

  await t('QR ที่ไม่ใช่ของ SaveEats ถูกปฏิเสธ', async () => {
    try {
      await reservationService.verify(2, { qrPayload: 'https://evil.com/hack' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 400); }
  });

  await t('QR ที่ไม่มีในระบบถูกปฏิเสธ', async () => {
    try {
      await reservationService.verify(2, { qrPayload: `SAVEEATS:${'a'.repeat(32)}` });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 404); }
  });

  await t('สแกน QR ที่ถูกต้องแล้วปิดการจองได้', async () => {
    const r = await reservationService.verify(2, { qrPayload: reservation.qr_payload });
    assert.strictEqual(r.status, 'completed');
  });

  await t('ใช้ QR ซ้ำไม่ได้', async () => {
    try {
      await reservationService.verify(2, { qrPayload: reservation.qr_payload });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 409); }
  });

  await t('ส่งมอบสำเร็จแล้วคะแนนความประพฤติเพิ่ม', () => {
    assert.ok((db.behavior[1]?.score ?? 0) >= 100);
  });

  await t('กรอกรหัส 4 หลักแทนการสแกนได้', async () => {
    post0.quantity_left = 5;
    const r2 = await reservationService.create(5, { postId: 1, quantity: 1 });
    const verified = await reservationService.verify(2, { code: r2.reservation_code });
    assert.strictEqual(verified.status, 'completed');
  });

  console.log('\n=== ทดสอบยกเลิกการจอง ===');

  await t('ยกเลิกแล้วของถูกคืนกลับเข้าระบบ', async () => {
    const before = post0.quantity_left;
    const r3 = await reservationService.create(6, { postId: 1, quantity: 2 });
    assert.strictEqual(post0.quantity_left, before - 2);
    await reservationService.cancel(r3.reservation_id, { userId: 6, role: 'customer', email: '' });
    assert.strictEqual(post0.quantity_left, before);
  });

  await t('คนอื่นยกเลิกการจองของเราไม่ได้', async () => {
    const r4 = await reservationService.create(7, { postId: 1, quantity: 1 });
    try {
      await reservationService.cancel(r4.reservation_id, { userId: 99, role: 'customer', email: '' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 403); }
  });

  console.log('\n=== ทดสอบการแจ้งเตือนเรื่องร้องเรียน ===');

  /*
   * ปูข้อมูล : ลูกค้า (customer) แจ้งปัญหาร้านของ seller
   * ทั้งสองคนถูกสร้างไว้แล้วตอนทดสอบ Auth ด้านบน จึงหยิบมาใช้ต่อได้เลย
   */
  const reportedStore = db.stores[0];
  /*
   * ใช้ if แล้ว throw ไม่ใช้ assert.ok
   * เพราะ TypeScript จะยอมแคบชนิดให้เฉพาะรูปแบบนี้
   * ถ้าใช้ assert.ok มันยังมองว่า reportedStore อาจเป็น undefined อยู่ แล้ว typecheck จะไม่ผ่าน
   */
  if (reportedStore === undefined) throw new Error('ต้องมีร้านจากเทสต์ก่อนหน้า');
  const storeOwnerId = reportedStore.user_id;
  /*
   * ดึง store_id ออกมาเก็บเป็นตัวแปรก่อน
   * เพราะ function declaration ถูกยกขึ้นไปบนสุด TypeScript จึงไม่การันตีว่า
   * ตอนฟังก์ชันทำงานจริง reportedStore ผ่าน if ข้างบนมาแล้วหรือยัง
   */
  const reportedStoreId = reportedStore.store_id;
  const reporterId = db.users.find((u) => u.role === 'customer')?.user_id ?? 1;

  function newReport(): FakeReport {
    const r: FakeReport = {
      report_id: seq.report++, reporter_id: reporterId,
      target_type: 'store', target_id: reportedStoreId,
      reason: 'อาหารมีสภาพไม่เหมาะแก่การรับประทาน',
      status: 'open', admin_note: null, resolution_message: null,
      created_at: '2026-08-27 15:05:00', updated_at: '2026-08-27 15:05:00',
    };
    db.reports.push(r);
    db.notifications.length = 0;   // เริ่มนับแจ้งเตือนใหม่ทุกเทสต์
    return r;
  }

  await t('เปลี่ยนสถานะแล้วคนแจ้งได้รับแจ้งเตือน', async () => {
    const r = newReport();
    await reportService.updateByAdmin(r.report_id, 'reviewing', null, null);

    const toReporter = db.notifications.filter((n) => n.userId === reporterId);
    assert.strictEqual(toReporter.length, 1, 'คนแจ้งต้องได้แจ้งเตือน 1 ใบ');
    assert.strictEqual(toReporter[0]?.type, 'report');
    assert.strictEqual(toReporter[0]?.refId, r.report_id);
  });

  await t('ปิดเรื่องพร้อมข้อความ แล้วเจ้าของร้านได้รับข้อความนั้น', async () => {
    const r = newReport();
    await reportService.updateByAdmin(
      r.report_id, 'resolved', 'ภายใน: คนแจ้งชื่อ Ham โทรหาร้านแล้ว', 'กรุณาตรวจสอบคุณภาพอาหารก่อนลงขาย'
    );

    const toOwner = db.notifications.filter((n) => n.userId === storeOwnerId);
    assert.strictEqual(toOwner.length, 1, 'เจ้าของร้านต้องได้แจ้งเตือน 1 ใบ');
    assert.strictEqual(toOwner[0]?.message, 'กรุณาตรวจสอบคุณภาพอาหารก่อนลงขาย');
  });

  /*
   * *** เทสต์ที่สำคัญที่สุดในไฟล์นี้ ***
   * admin_note คือบันทึกภายใน อาจมีชื่อคนแจ้งอยู่
   * ถ้าวันหนึ่งมีคนแก้โค้ดแล้วเผลอเอา admin_note ไปต่อท้ายข้อความถึงร้าน
   * เท่ากับเปิดเผยตัวคนแจ้ง ซึ่งกู้คืนไม่ได้ เทสต์ข้อนี้จะดักไว้ตั้งแต่ก่อน push
   */
  await t('ข้อความถึงร้านต้องไม่มีบันทึกภายในปนไปด้วย', async () => {
    const r = newReport();
    const secret = 'ภายใน: คนแจ้งชื่อ Ham';
    await reportService.updateByAdmin(r.report_id, 'resolved', secret, 'กรุณาตรวจสอบคุณภาพอาหาร');

    const toOwner = db.notifications.filter((n) => n.userId === storeOwnerId);
    for (const n of toOwner) {
      assert.ok(!n.message.includes('Ham'), 'ข้อความถึงร้านมีชื่อคนแจ้งปนอยู่');
      assert.ok(!n.message.includes(secret), 'ข้อความถึงร้านมีบันทึกภายในปนอยู่');
    }
  });

  await t('ปฏิเสธเรื่อง ไม่ต้องรบกวนร้าน', async () => {
    const r = newReport();
    await reportService.updateByAdmin(r.report_id, 'rejected', 'ตรวจแล้วไม่พบความผิดปกติ', null);

    assert.strictEqual(
      db.notifications.filter((n) => n.userId === storeOwnerId).length, 0,
      'ตรวจแล้วร้านไม่ผิด จึงไม่ควรมีแจ้งเตือนไปหาร้าน'
    );
  });

  await t('ปิดเรื่องแต่ไม่เขียนข้อความ ร้านไม่ได้รับอะไร', async () => {
    const r = newReport();
    await reportService.updateByAdmin(r.report_id, 'resolved', 'จัดการภายในแล้ว', null);

    assert.strictEqual(
      db.notifications.filter((n) => n.userId === storeOwnerId).length, 0,
      'ไม่ได้เขียนข้อความถึงร้าน จึงไม่ควรส่งแจ้งเตือนเปล่า ๆ'
    );
  });

  await t('แจ้งเรื่องที่ไม่มีอยู่จริง ต้องได้ 404', async () => {
    try {
      await reportService.updateByAdmin(9999, 'resolved', null, null);
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 404); }
  });

  console.log('\n=== ทดสอบรีวิวและคะแนนร้าน ===');

  /*
   * ปูข้อมูล : สร้างการจองใหม่แล้วทำให้เป็น "รับอาหารแล้ว"
   * เพราะกติกาคือรีวิวได้เฉพาะการจองที่รับอาหารเรียบร้อยแล้วเท่านั้น
   */
  post0.quantity_left = 10;
  const rvRes = await reservationService.create(1, { postId: 1, quantity: 1 });
  const rvRow = db.reservations.find((x) => x.reservation_id === rvRes.reservation_id);
  if (rvRow === undefined) throw new Error('ไม่พบการจองที่เพิ่งสร้าง');
  const rvId = rvRow.reservation_id;

  await t('รีวิวการจองที่ยังไม่ได้รับอาหารไม่ได้', async () => {
    try {
      await reviewService.create(1, { reservationId: rvId, rating: 5, comment: 'ยังไม่ได้รับเลย' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 400); }
  });

  await t('รีวิวการจองของคนอื่นไม่ได้', async () => {
    rvRow.status = 'completed';
    try {
      await reviewService.create(99, { reservationId: rvId, rating: 5, comment: 'ไม่ใช่ของฉัน' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 403); }
  });

  await t('รีวิวสำเร็จ แล้วคะแนนเฉลี่ยกับจำนวนรีวิวของร้านอัปเดต', async () => {
    const before = db.reviews.length;
    await reviewService.create(1, { reservationId: rvId, rating: 4, comment: 'อร่อยดี' });
    assert.strictEqual(db.reviews.length, before + 1, 'ต้องมีรีวิวเพิ่ม 1 รายการ');
    assert.strictEqual(store0.review_count, 1, 'จำนวนรีวิวของร้านต้องเป็น 1');
    assert.strictEqual(Number(store0.rating), 4, 'คะแนนเฉลี่ยต้องเป็น 4');
  });

  await t('รีวิวการจองเดิมซ้ำไม่ได้', async () => {
    try {
      await reviewService.create(1, { reservationId: rvId, rating: 1, comment: 'รีวิวซ้ำ' });
      throw new Error('ไม่ควรสำเร็จ');
    } catch (e) { assert.strictEqual(statusCodeOf(e), 409); }
    assert.strictEqual(db.reviews.filter((x) => x.reservation_id === rvId).length, 1);
  });

  await t('ได้รีวิวดาวน้อย แล้วคะแนนความประพฤติของร้านลดลง', async () => {
    // สร้างการจองอีกใบแล้วปิดให้เรียบร้อย เพื่อรีวิวได้อีกครั้ง
    const r = await reservationService.create(2, { postId: 1, quantity: 1 });
    const row = db.reservations.find((x) => x.reservation_id === r.reservation_id);
    if (row === undefined) throw new Error('ไม่พบการจอง');
    row.status = 'completed';

    const before = db.behavior[1]?.score ?? 100;
    await reviewService.create(2, { reservationId: row.reservation_id, rating: 1, comment: 'ไม่โอเค' });
    const after = db.behavior[1]?.score ?? 100;
    assert.ok(after < before, `คะแนนต้องลดลง แต่ได้ ${before} -> ${after}`);
  });

  await t('คะแนนเฉลี่ยคำนวณจากรีวิวทั้งหมดถูกต้อง', () => {
    const rv = db.reviews.filter((x) => x.store_id === 1);
    const avg = rv.reduce((a, b) => a + b.rating, 0) / rv.length;
    assert.strictEqual(Number(store0.rating), Math.round(avg * 100) / 100);
    assert.strictEqual(store0.review_count, rv.length);
  });

  console.log('\n=== ทดสอบคะแนนความประพฤติ ===');

  await t('คะแนนตกต่ำกว่าเกณฑ์ แล้วร้านถูกระงับเองพร้อมแจ้งเตือนเจ้าของ', async () => {
    store0.status = 'approved';
    db.notifications.length = 0;
    // หักคะแนนรวดเดียวให้ต่ำกว่าเกณฑ์ 40
    await behaviorScoreService.adminAdjust(1, -80, 'ทดสอบหักคะแนนจนต่ำกว่าเกณฑ์');

    assert.ok((db.behavior[1]?.score ?? 100) < 40, 'คะแนนต้องต่ำกว่า 40');
    assert.strictEqual(store0.status, 'suspended', 'ร้านต้องถูกระงับอัตโนมัติ');
    assert.ok(
      db.notifications.some((n) => n.userId === store0.user_id),
      'เจ้าของร้านต้องได้รับแจ้งเตือนว่าถูกระงับ'
    );
  });

  console.log('\n=== ทดสอบร้านโปรดและการคิดราคา ===');

  await t('กดร้านโปรดซ้ำหลายรอบ ไม่เกิดข้อมูลซ้ำ', async () => {
    await favoriteModel.add(1, 1);
    await favoriteModel.add(1, 1);
    await favoriteModel.add(1, 1);
    assert.strictEqual(db.favorites.filter((f) => f.user_id === 1 && f.store_id === 1).length, 1);

    await favoriteModel.remove(1, 1);
    assert.strictEqual(await favoriteModel.exists(1, 1), false);
  });

  await t('ยอดรวมคำนวณถูกต้องเมื่อราคามีเศษสตางค์ (33.50 x 3 = 100.50)', async () => {
    db.posts.push({
      post_id: 2, store_id: 1, food_id: 1, status: 'active', discount_price: 33.5,
      quantity_total: 10, quantity_left: 10, pickup_start: fmt(new Date()), pickup_end: fmt(future),
      food_name: 'ข้าวราดแกงทดสอบ', store_name: 'ครัวคุณแม่',
    });
    store0.status = 'approved';   // ปลดระงับจากเทสต์ก่อนหน้า เพื่อให้จองได้
    const r = await reservationService.create(3, { postId: 2, quantity: 3 });
    const row = db.reservations.find((x) => x.reservation_id === r.reservation_id);
    if (row === undefined) throw new Error('ไม่พบการจอง');
    assert.strictEqual(row.total_price, 100.5, `ยอดรวมต้องเป็น 100.50 แต่ได้ ${row.total_price}`);
  });

  console.log('\n=== ทดสอบตัวช่วย ===');

  await t('qr token สุ่มไม่ซ้ำกัน', () => {
    const set = new Set(Array.from({ length: 2000 }, () => qrService.createSecrets().qrToken));
    assert.strictEqual(set.size, 2000);
  });

  await t('คำนวณระยะทางถูกต้อง (อนุสาวรีย์ชัย -> สยาม ประมาณ 2-4 กม.)', () => {
    const d = distanceKm(13.7649, 100.5383, 13.746, 100.534);
    assert.ok(d > 1.5 && d < 4, `ได้ ${d.toFixed(2)} กม.`);
  });

  console.log('\n================================');
  console.log(`ผ่าน ${pass} ข้อ | ไม่ผ่าน ${fail} ข้อ`);
  console.log('================================\n');
  process.exit(fail ? 1 : 0);
}

void main();
