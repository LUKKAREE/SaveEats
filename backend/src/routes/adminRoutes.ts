/**
 * เส้นทาง /api/admin
 *
 * *** ทุกเส้นในไฟล์นี้ต้องเป็น admin เท่านั้น ***
 * ใช้ router.use() ครอบไว้ตั้งแต่บนสุด จะได้ไม่มีทางลืมใส่ทีละเส้น
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import adminController from '../controllers/adminController';
import { rejectStoreRules } from '../validators/storeValidator';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/dashboard', asyncHandler(adminController.dashboard));

// ร้านค้า
router.get('/stores/pending', asyncHandler(adminController.listPendingStores));
router.get('/stores', asyncHandler(adminController.listStores));
router.put('/stores/:id/approve', asyncHandler(adminController.approveStore));
router.put('/stores/:id/reject', rejectStoreRules, validate, asyncHandler(adminController.rejectStore));
router.put('/stores/:id/suspend', asyncHandler(adminController.suspendStore));

// ลูกค้า
router.get('/customers', asyncHandler(adminController.listCustomers));
router.put('/users/:id/active', asyncHandler(adminController.setUserActive));

// เนื้อหาและข้อมูล
router.get('/posts', asyncHandler(adminController.listPosts));
router.put('/posts/:id/hide', asyncHandler(adminController.hidePost));
router.get('/reservations', asyncHandler(adminController.listReservations));
router.get('/reviews', asyncHandler(adminController.listReviews));
router.delete('/reviews/:id', asyncHandler(adminController.deleteReview));

// การแจ้งปัญหา
router.get('/reports', asyncHandler(adminController.listReports));
router.put('/reports/:id', asyncHandler(adminController.updateReport));

// คะแนนความประพฤติ
router.get('/behavior', asyncHandler(adminController.listBehavior));
router.put('/behavior/:storeId', asyncHandler(adminController.adjustBehavior));

// งานดูแลระบบ
router.post('/maintenance/expire-reservations', asyncHandler(adminController.expireReservations));

export default router;
