/** เส้นทาง /api/categories - เปิดให้ทุกคนดูได้ ไม่ต้อง login */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import categoryController from '../controllers/categoryController';

const router = Router();
router.get('/', asyncHandler(categoryController.list));
export default router;
