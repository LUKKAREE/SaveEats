/** เส้นทาง /api/notifications - ต้อง login ทุกเส้น */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import authMiddleware from '../middleware/authMiddleware';
import notificationController from '../controllers/notificationController';

const router = Router();

router.use(authMiddleware); // ทุกเส้นในไฟล์นี้ต้อง login

router.get('/', asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.put('/read-all', asyncHandler(notificationController.markAllRead));
router.put('/:id/read', asyncHandler(notificationController.markRead));
router.delete('/', asyncHandler(notificationController.removeAll));
router.delete('/:id', asyncHandler(notificationController.remove));

export default router;
