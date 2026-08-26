/**
 * เส้นทางรีวิว
 * mount ที่ /api เพราะมี /api/reviews
 * (เส้น /api/stores/:id/reviews ประกาศไว้ใน storeRoutes.ts แล้ว)
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import { requireCustomer } from '../middleware/roleMiddleware';
import reviewController from '../controllers/reviewController';
import { createReviewRules } from '../validators/reviewValidator';

const router = Router();

router.get('/reviews/my', authMiddleware, requireCustomer, asyncHandler(reviewController.listMine));
router.post(
  '/reviews',
  authMiddleware, requireCustomer,
  createReviewRules, validate,
  asyncHandler(reviewController.create)
);

export default router;
