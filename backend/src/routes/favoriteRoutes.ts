/**
 * เส้นทาง /api/favorites - ร้านโปรดของลูกค้า
 *
 * ทุกเส้นต้อง login เพราะรายการโปรดเป็นของแต่ละคน
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import authMiddleware from '../middleware/authMiddleware';
import favoriteController from '../controllers/favoriteController';

const router = Router();

router.use(authMiddleware);

// *** /ids ต้องมาก่อน /:id ***
// ถ้าวางสลับกัน Express จะมองว่าคำว่า "ids" คือค่าของ :id แล้วเข้าเส้นทางผิด
router.get('/ids', asyncHandler(favoriteController.listIds));
router.get('/', asyncHandler(favoriteController.list));
router.post('/:id', asyncHandler(favoriteController.add));
router.delete('/:id', asyncHandler(favoriteController.remove));

export default router;
