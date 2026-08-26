/** เส้นทาง /api/posts - Feed และการโพสต์ของร้าน */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware, { optionalAuth } from '../middleware/authMiddleware';
import { requireSeller } from '../middleware/roleMiddleware';
import { imageUploader } from '../middleware/uploadMiddleware';
import postController from '../controllers/postController';
import { createPostRules } from '../validators/postValidator';

const router = Router();

router.get('/my', authMiddleware, requireSeller, asyncHandler(postController.listMine));
router.get('/', optionalAuth, asyncHandler(postController.feed));
router.get('/:id', optionalAuth, asyncHandler(postController.detail));

router.post(
  '/',
  authMiddleware, requireSeller,
  imageUploader('food', 'image'), createPostRules, validate,
  asyncHandler(postController.create)
);

router.put(
  '/:id',
  authMiddleware, requireSeller,
  imageUploader('food', 'image'),
  asyncHandler(postController.update)
);

router.delete('/:id', authMiddleware, requireSeller, asyncHandler(postController.remove));

export default router;
