/**
 * useCountdown - นับถอยหลังแบบเรียลไทม์ (เดินทุกวินาที)
 *
 * ใช้กับหน้าคิว/QR ที่ต้องบอกลูกค้าว่าเหลือเวลาอีกเท่าไหร่ก่อนคิวหลุด
 *
 * *** ทำไมต้องนับสด ไม่ใช่คำนวณครั้งเดียวตอนเปิดหน้า ***
 * ลูกค้ามักเปิดหน้านี้ค้างไว้ระหว่างเดินไปที่ร้าน
 * ถ้าเลขไม่เดิน เขาจะไม่รู้เลยว่าเหลือเวลาจริง ๆ เท่าไหร่แล้ว
 *
 * *** ล้าง interval ทุกครั้งที่ออกจากหน้า ***
 * ถ้าลืม ตัวจับเวลาจะเดินต่อทั้งที่หน้าจอถูกปิดไปแล้ว
 * กินแบตและทำให้ React เตือนว่า setState ใส่ component ที่ไม่มีอยู่แล้ว
 *
 * ตัวอย่าง
 *   const timer = useCountdown(reservation.expires_at);
 *   <Text>{timer.text}</Text>      // "23:45" หรือ "01:23:45"
 */
import { useEffect, useMemo, useState } from 'react';

export interface CountdownResult {
  /** วินาทีที่เหลือทั้งหมด (0 = หมดแล้ว) */
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** หมดเวลาแล้วหรือยัง */
  isExpired: boolean;
  /** ข้อความพร้อมแสดง เช่น "23:45" หรือ "01:23:45" */
  text: string;
  /** เหลือน้อยกว่า 5 นาที ใช้ตัดสินใจเปลี่ยนเป็นสีแดงเตือน */
  isUrgent: boolean;
}

/** แปลง 'YYYY-MM-DD HH:mm:ss' ของ MySQL ให้เป็น Date ที่ JS อ่านได้ */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // iOS ไม่ยอมรับรูปแบบที่มีช่องว่างคั่น ต้องเปลี่ยนเป็น 'T' ก่อน
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function useCountdown(target: string | null | undefined): CountdownResult {
  const endTime = useMemo(() => toDate(target)?.getTime() ?? null, [target]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endTime === null) return undefined;

    // หมดไปแล้วตั้งแต่แรก ไม่ต้องเปิดตัวจับเวลาให้เปลืองเลย
    if (endTime <= Date.now()) {
      setNow(Date.now());
      return undefined;
    }

    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      // ถึงเวลาแล้วก็หยุดเดิน ไม่มีอะไรให้นับต่อ
      if (current >= endTime) clearInterval(id);
    }, 1000);

    return () => { clearInterval(id); };
  }, [endTime]);

  return useMemo(() => {
    if (endTime === null) {
      return {
        totalSeconds: 0, hours: 0, minutes: 0, seconds: 0,
        isExpired: true, text: '-', isUrgent: false,
      };
    }

    const totalSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const text = hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

    return {
      totalSeconds,
      hours,
      minutes,
      seconds,
      isExpired: totalSeconds === 0,
      text,
      isUrgent: totalSeconds > 0 && totalSeconds <= 5 * 60,
    };
  }, [endTime, now]);
}

export default useCountdown;
