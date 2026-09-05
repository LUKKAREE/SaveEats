/**
 * ที่เก็บรูปภาพบนคลาวด์ (Cloudinary)
 *
 * *** ทำไมต้องมีไฟล์นี้ ***
 * เดิมรูปที่ผู้ใช้อัปโหลดถูกเก็บเป็นไฟล์ในโฟลเดอร์ backend/uploads
 * ซึ่งใช้ได้ดีตอนรันบนเครื่องตัวเอง เพราะฮาร์ดดิสก์อยู่กับเราตลอด
 *
 * แต่เซิร์ฟเวอร์ฟรีบนคลาวด์ (เช่น Render) ใช้พื้นที่แบบชั่วคราว
 * ทุกครั้งที่เซิร์ฟเวอร์หลับแล้วตื่น หรือ deploy โค้ดใหม่ ไฟล์ในโฟลเดอร์จะหายหมด
 * เหลือแต่ชื่อไฟล์ในฐานข้อมูลที่ชี้ไปหาของที่ไม่มีอยู่จริง กลายเป็นรูปแตกทั้งแอป
 *
 * จึงย้ายรูปไปฝากไว้กับ Cloudinary ซึ่งเป็นบริการเก็บรูปโดยเฉพาะ
 * แล้วเก็บ "ที่อยู่เต็มของรูป" ลงฐานข้อมูลแทน "ชื่อไฟล์"
 *
 * *** ทำไมแอปกับเว็บแอดมินไม่ต้องแก้เลย ***
 * ทั้งสองฝั่งมีตัวช่วย imageUrl() ที่เช็คอยู่แล้วว่า
 * ถ้าค่าที่ได้ขึ้นต้นด้วย http ให้ใช้ค่านั้นตรง ๆ ไม่ต้องเติมที่อยู่ Backend นำหน้า
 */
import { v2 as cloudinary } from 'cloudinary';

import env from './env';

/**
 * เปิดใช้ Cloudinary หรือยัง
 *
 * ดูจากว่าตั้งค่าครบทั้ง 3 ตัวไหม ถ้าไม่ครบก็ถือว่ายังไม่เปิด
 * แล้วระบบจะกลับไปเก็บไฟล์ลงโฟลเดอร์เหมือนเดิม
 * ทำแบบนี้เพื่อให้ตอนพัฒนาในเครื่องไม่ต้องตั้งค่าอะไรเลย
 */
export const useCloudStorage: boolean =
  env.CLOUDINARY_CLOUD_NAME !== '' &&
  env.CLOUDINARY_API_KEY !== '' &&
  env.CLOUDINARY_API_SECRET !== '';

if (useCloudStorage) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * อ่านข้อความ error ให้เป็นภาษาคน
 *
 * *** จุดที่หลอกง่าย ***
 * error ที่ Cloudinary ส่งกลับมาไม่ใช่ Error ปกติ แต่เป็นวัตถุธรรมดาที่มีช่อง message
 * ถ้าเผลอเอาไปต่อกับข้อความตรง ๆ จะได้คำว่า [object Object] ซึ่งไม่บอกอะไรเลย
 * ตอนตั้งค่าผิดจะหาสาเหตุไม่เจอ จึงต้องแกะข้อความออกมาเอง
 */
function readErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return JSON.stringify(err);
}

/**
 * ส่งรูปขึ้น Cloudinary แล้วคืนที่อยู่เต็มของรูปกลับมา
 *
 * @param buffer  เนื้อไฟล์รูปที่อยู่ในหน่วยความจำ
 * @param folder  โฟลเดอร์ปลายทางบน Cloudinary (food / store / profile)
 */
export function uploadToCloud(buffer: Buffer, folder: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `saveeats/${folder}`,
        resource_type: 'image',
        /*
         * ย่อรูปให้ด้านยาวสุดไม่เกิน 1200 พิกเซล
         *
         * รูปที่ถ่ายจากมือถือสมัยนี้ใบละ 3-5 MB ซึ่งใหญ่เกินจำเป็นมาก
         * สำหรับการ์ดอาหารในแอปที่กว้างไม่ถึง 400 พิกเซล
         * ย่อแล้วแอปโหลดเร็วขึ้นหลายเท่า และประหยัดโควตาฟรีของเราด้วย
         *
         * crop: 'limit' แปลว่าย่อเฉพาะรูปที่ใหญ่เกิน ไม่ไปขยายรูปเล็กให้แตก
         */
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (err, result) => {
        if (err !== undefined && err !== null) {
          reject(new Error(`อัปโหลดรูปขึ้น Cloudinary ไม่สำเร็จ: ${readErrorMessage(err)}`));
          return;
        }
        if (result === undefined) {
          reject(new Error('อัปโหลดรูปขึ้น Cloudinary ไม่สำเร็จ: ไม่ได้รับผลลัพธ์กลับมา'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
