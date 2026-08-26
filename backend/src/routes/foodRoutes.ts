/** เส้นทาง /api/foods - คลังเมนูของร้าน (เฉพาะ seller) */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import { requireSeller } from '../middleware/roleMiddleware';
import { imageUploader } from '../middleware/uploadMiddleware';
import foodController from '../controllers/foodController';
import { createFoodRules, updateFoodRules } from '../validators/foodValidator';

const router = Router();

router.get('/my', authMiddleware, requireSeller, asyncHandler(foodController.listMine));
router.get('/:id', asyncHandler(foodController.detail));

router.post(
  '/',
  authMiddleware, requireSeller,
  imageUploader('food', 'image'), createFoodRules, validate,
  asyncHandler(foodController.create)
);

router.put(
  '/:id',
  authMiddleware, requireSeller,
  imageUploader('food', 'image'), updateFoodRules, validate,
  asyncHandler(foodController.update)
);

router.delete('/:id', authMiddleware, requireSeller, asyncHandler(foodController.remove));

export default router;
