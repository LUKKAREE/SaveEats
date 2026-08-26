/** เส้นทาง /api/stores */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import { requireSeller } from '../middleware/roleMiddleware';
import { imageUploader } from '../middleware/uploadMiddleware';
import storeController from '../controllers/storeController';
import reviewController from '../controllers/reviewController';
import { updateStoreRules } from '../validators/storeValidator';

const router = Router();

// --- ของ seller (ต้องวางไว้ก่อน /:id ไม่งั้น 'me' จะถูกอ่านเป็น id) ---
router.get('/me', authMiddleware, requireSeller, asyncHandler(storeController.myStore));
router.put(
  '/me',
  authMiddleware,
  requireSeller,
  imageUploader('store', 'image'),
  updateStoreRules,
  validate,
  asyncHandler(storeController.updateMyStore)
);

// --- ของลูกค้า (ไม่ต้อง login ก็ดูได้) ---
router.get('/nearby', asyncHandler(storeController.nearby));
router.get('/', asyncHandler(storeController.list));
router.get('/:id/reviews', asyncHandler(reviewController.listByStore));
router.get('/:id', asyncHandler(storeController.detail));

export default router;
