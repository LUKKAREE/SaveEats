import type { Request, Response } from 'express';
import type { CreateReviewRequest } from '@shared/index';

import { ok, created, paginated } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { paramId, pageParams } from '../utils/query';
import reviewService from '../services/reviewService';

export const reviewController = {
  /** GET /api/stores/:id/reviews */
  async listByStore(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total, breakdown } = await reviewService.listByStore(paramId(req), { page, limit });
    // ส่งสรุปจำนวนดาวไปทาง header เพื่อไม่ให้ผิดรูปแบบ response มาตรฐาน
    res.set('X-Rating-Breakdown', JSON.stringify(breakdown));
    paginated(res, items, { page, limit, total });
  },

  /** POST /api/reviews */
  async create(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const review = await reviewService.create(user.userId, req.body as CreateReviewRequest);
    created(res, review, 'ขอบคุณสำหรับรีวิว');
  },

  /** GET /api/reviews/my */
  async listMine(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const items = await reviewService.listMine(user.userId);
    ok(res, items);
  },
};

export default reviewController;
