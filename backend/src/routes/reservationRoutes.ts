/**
 * เส้นทางการจอง
 * ไฟล์นี้ถูก mount ที่ /api เพราะมีทั้ง
 *   /api/reservations/...      (ฝั่งลูกค้า)
 *   /api/store/reservations    (ฝั่งร้าน)
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import { requireCustomer, requireSeller } from '../middleware/roleMiddleware';
import reservationController from '../controllers/reservationController';
import { createReservationRules, verifyReservationRules } from '../validators/reservationValidator';

const router = Router();

// --- ฝั่งร้าน ---
router.get('/store/reservations', authMiddleware, requireSeller, asyncHandler(reservationController.listForStore));
router.post(
  '/reservations/verify',
  authMiddleware, requireSeller,
  verifyReservationRules, validate,
  asyncHandler(reservationController.verify)
);

// --- ฝั่งลูกค้า ---
router.post(
  '/reservations',
  authMiddleware, requireCustomer,
  createReservationRules, validate,
  asyncHandler(reservationController.create)
);
router.get('/reservations/my', authMiddleware, asyncHandler(reservationController.listMine));
router.get('/reservations/:id', authMiddleware, asyncHandler(reservationController.detail));
router.put('/reservations/:id/cancel', authMiddleware, asyncHandler(reservationController.cancel));

export default router;
