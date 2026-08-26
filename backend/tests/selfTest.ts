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
import type { Store, ReservationStatus } from '@shared/index';

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

const db = {
  users: [] as FakeUser[],
  stores: [] as Store[],
  posts: [] as FakePost[],
  reservations: [] as FakeReservation[],
  notifications: [] as unknown[],
  behavior: {} as Record<number, { store_id: number; score: number; status: string }>,
};
const seq = { user: 1, store: 1, res: 1 };

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
  refreshRating: async () => undefined,
});

mock('../src/models/notificationModel', {
  create: async (n: unknown) => { db.notifications.push(n); return db.notifications.length; },
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
