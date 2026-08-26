/**
 * ตัวห่อ controller ที่เป็น async
 *
 * ปัญหา: ถ้า controller เป็น async แล้วเกิด error ข้างใน Express จะไม่จับให้
 *        ต้องเขียน try/catch ทุกฟังก์ชัน ซึ่งยาวและลืมง่าย
 * วิธีแก้: ห่อด้วยตัวนี้ แล้ว error จะถูกส่งไป errorHandler อัตโนมัติ
 *
 * ตัวอย่าง : router.get('/', asyncHandler(controller.list));
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncController): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export default asyncHandler;
