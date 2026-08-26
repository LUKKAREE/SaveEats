/**
 * emailService - ส่งอีเมลออกจากระบบ
 *
 * ตอนนี้ใช้ที่เดียวคือ "ลืมรหัสผ่าน"
 *
 * ในจดหมายมีทั้งรหัส 6 หลัก (กรอกในแอป) และลิงก์ (เปิดในเบราว์เซอร์)
 * ผู้ใช้เลือกทางไหนก็ได้ ชี้ไปที่คำขอใบเดียวกัน
 *
 * *** ถ้ายังไม่ได้ตั้งค่า SMTP ในไฟล์ .env ***
 * ระบบจะไม่ส่งอีเมลจริง แต่จะพิมพ์ลิงก์ออกมาที่หน้าต่าง cmd ของ backend แทน
 * ทำให้ทดสอบและสาธิตได้เลยโดยไม่ต้องมีบัญชีส่งอีเมล
 * และไม่ทำให้ทั้งระบบพังเพราะส่งอีเมลไม่ได้
 *
 * วิธีเปิดใช้การส่งจริงด้วย Gmail
 *   1. เปิด 2-Step Verification ในบัญชี Google
 *   2. สร้าง App Password ที่ https://myaccount.google.com/apppasswords
 *   3. ใส่ใน backend/.env
 *        SMTP_USER=อีเมลของคุณ@gmail.com
 *        SMTP_PASS=รหัส 16 ตัวที่ได้มา
 *        MAIL_FROM=SaveEats <อีเมลของคุณ@gmail.com>
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import env from '../config/env';

/** ตั้งค่าไว้ครบหรือยัง ถ้าไม่ครบจะทำงานในโหมดพิมพ์ลงหน้าจอแทน */
const isConfigured = env.SMTP_USER !== '' && env.SMTP_PASS !== '';

/**
 * สร้าง transporter แค่ครั้งเดียวแล้วใช้ซ้ำ
 * ไม่สร้างใหม่ทุกครั้งที่ส่ง เพราะต้องต่อ TCP ใหม่ทุกรอบ ช้าโดยไม่จำเป็น
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter === null) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465 = SSL ตั้งแต่ต้น ส่วน 587 = ต่อธรรมดาก่อนแล้วอัปเกรดเป็น TLS
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export const emailService = {
  isConfigured,

  /**
   * ส่งอีเมลลิงก์ตั้งรหัสผ่านใหม่
   *
   * *** ไม่ throw error ออกไป ***
   * ถ้าส่งไม่สำเร็จให้บันทึกไว้เฉย ๆ เพราะฝั่ง API ต้องตอบข้อความเดียวกันเสมอ
   * ไม่ว่าอีเมลนั้นจะมีในระบบหรือไม่ (กันคนไล่เดาว่าใครเป็นสมาชิกบ้าง)
   */
  async sendPasswordReset(to: string, name: string, link: string, code: string): Promise<void> {
    const subject = 'ตั้งรหัสผ่านใหม่ - SaveEats';
    const minutes = env.RESET_TOKEN_MINUTES;

    if (!isConfigured) {
      console.log('');
      console.log('==================================================');
      console.log('  [อีเมล] ยังไม่ได้ตั้งค่า SMTP จึงไม่ได้ส่งจริง');
      console.log('  ทำต่อในแอปได้เลยด้วยรหัส 6 หลัก');
      console.log('  หรือคัดลอกลิงก์ไปเปิดในเบราว์เซอร์ก็ได้');
      console.log('--------------------------------------------------');
      console.log(`  ถึง    : ${to}`);
      console.log(`  รหัส   : ${code}`);
      console.log(`  ลิงก์  : ${link}`);
      console.log(`  อายุ   : ${minutes} นาที`);
      console.log('==================================================');
      console.log('');
      return;
    }

    const html = `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        <h2 style="color:#16A34A;margin:0 0 4px">SaveEats</h2>
        <p style="margin:0 0 24px;color:#6b7280">อิ่มอร่อย ไม่ทิ้งกัน</p>
        <p>สวัสดีคุณ ${name}</p>
        <p>เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้</p>

        <p style="margin:24px 0 8px"><strong>ถ้าคุณกำลังใช้แอป SaveEats</strong> ให้กรอกรหัสนี้ในแอปได้เลย</p>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#16A34A">${code}</span>
        </div>

        <p><strong>หรือถ้าสะดวกใช้เบราว์เซอร์</strong> กดปุ่มข้างล่างได้เลย</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="background:#16A34A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;display:inline-block;font-weight:600">
            ตั้งรหัสผ่านใหม่
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">
          รหัสและลิงก์ใช้ได้ภายใน ${minutes} นาที และใช้ได้ครั้งเดียวเท่านั้น<br>
          ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ
        </p>
        <p style="color:#9ca3af;font-size:12px;word-break:break-all;margin-top:24px">
          ถ้าปุ่มกดไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์<br>${link}
        </p>
      </div>
    `;

    try {
      await getTransporter().sendMail({ from: env.MAIL_FROM, to, subject, html });
    } catch (err) {
      console.error('[อีเมล] ส่งไม่สำเร็จ:', err instanceof Error ? err.message : err);
      console.error(`[อีเมล] ลิงก์สำรองสำหรับ ${to} : ${link}`);
    }
  },
};

export default emailService;
