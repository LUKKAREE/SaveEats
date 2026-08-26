/**
 * งานเบื้องหลัง : ปิดการจองที่หมดอายุอัตโนมัติ (ข้อค้าง 6)
 *
 * *** ปัญหาที่งานนี้แก้ ***
 * ลูกค้าจองแล้วไม่ไปรับ ของ 3 ชุดนั้นจะถูกกันไว้ตลอดกาล
 * ร้านขายไม่ได้ ลูกค้าคนอื่นก็จองไม่ได้ ทั้งที่อาหารยังอยู่
 *
 * งานนี้จะวิ่งเช็คเป็นระยะ เจอการจองที่เลย expires_at แล้วยังไม่ completed
 * ก็เปลี่ยนสถานะเป็น expired แล้วคืนของกลับเข้าโพสต์ให้คนอื่นจองต่อได้
 *
 * *** ทำไมไม่ใช้ node-cron ***
 * setInterval ของ Node ทำงานนี้ได้พอ ๆ กัน และไม่ต้องลงแพ็กเกจเพิ่ม
 * ยิ่งแพ็กเกจน้อย เพื่อนในทีมยิ่งติดตั้งง่าย โอกาสพังตอนส่งงานยิ่งน้อย
 *
 * *** ข้อควรรู้ตอนขึ้นระบบจริง ***
 * ถ้าวันหนึ่งรัน server หลายตัวพร้อมกัน งานนี้จะทำงานซ้ำซ้อน
 * ตอนนั้นค่อยย้ายไปใช้ตัวจัดคิวงานแยก หรือใส่ระบบล็อกกันชนก่อน
 * โปรเจกต์ระดับนี้ยังไม่ต้องกังวล
 */
import reservationService from '../services/reservationService';
import postModel from '../models/postModel';

/** ความถี่ในการตรวจ (นาที) */
const INTERVAL_MINUTES = 5;

/**
 * กันไม่ให้รอบใหม่เริ่มทับรอบเก่าที่ยังทำไม่เสร็จ
 * ถ้าฐานข้อมูลช้าจนรอบเดิมยังค้าง รอบใหม่จะข้ามไปเฉย ๆ
 */
let running = false;

/** ตัวจับเวลา เก็บไว้เพื่อให้สั่งหยุดได้ตอนปิด server */
let timer: NodeJS.Timeout | null = null;

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const count = await reservationService.expireOverdue();
    if (count > 0) {
      console.log(`[งานอัตโนมัติ] ปิดการจองที่หมดอายุ ${count} รายการ และคืนของกลับเข้าระบบแล้ว`);
    }

    /*
      ปิดโพสต์ที่เลยเวลารับไปแล้วด้วย

      *** ทำไมมาอยู่ในงานเดียวกัน ไม่แยกตัวจับเวลาใหม่ ***
      สองงานนี้ทำงานเรื่องเดียวกันคือ "เก็บกวาดของที่หมดเวลา" และใช้ความถี่เท่ากัน
      แยกเป็นสอง setInterval มีแต่จะเพิ่มของให้ดูแลโดยไม่ได้อะไรกลับมา

      ต้องทำหลังปิดการจอง เพราะการปิดการจองจะคืนของกลับเข้าโพสต์
      ซึ่งอาจดัน sold_out กลับมาเป็น active ถ้าสลับลำดับกัน โพสต์นั้นจะรอดไปอีกหนึ่งรอบ
    */
    const expiredPosts = await postModel.expireOverdue();
    if (expiredPosts > 0) {
      console.log(`[งานอัตโนมัติ] ปิดโพสต์ที่เลยเวลารับ ${expiredPosts} โพสต์`);
    }
  } catch (err) {
    // *** ห้ามปล่อยให้ error ที่นี่ทำให้ server ทั้งตัวล่ม ***
    // แค่บอกให้รู้ แล้วรอบหน้าค่อยลองใหม่
    console.error(
      '[งานอัตโนมัติ] เก็บกวาดของที่หมดเวลาไม่สำเร็จ :',
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    running = false;
  }
}

/**
 * เริ่มงาน
 * เรียกครั้งเดียวตอน server เริ่มทำงาน (ดูที่ server.ts)
 */
export function startExpireReservationsJob(): void {
  if (timer !== null) return; // กันเรียกซ้ำ

  // รันทันที 1 รอบตอนเปิด server เผื่อ server ปิดไปนานแล้วมีของค้างเยอะ
  void runOnce();

  timer = setInterval(() => {
    void runOnce();
  }, INTERVAL_MINUTES * 60 * 1000);

  // unref บอก Node ว่า "อย่าเปิดโปรแกรมค้างไว้เพราะตัวจับเวลานี้"
  // ทำให้กด Ctrl+C แล้วโปรแกรมปิดได้ทันที ไม่ต้องรอครบรอบ
  timer.unref();

  console.log(`[งานอัตโนมัติ] เริ่มตรวจการจองและโพสต์ที่หมดเวลาทุก ${INTERVAL_MINUTES} นาที`);
}

/** หยุดงาน (ใช้ตอนปิด server หรือตอนเขียนเทสต์) */
export function stopExpireReservationsJob(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export default startExpireReservationsJob;
