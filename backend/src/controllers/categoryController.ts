import type { Request, Response } from 'express';
import categoryModel from '../models/categoryModel';
import { ok } from '../utils/response';

export const categoryController = {
  /** GET /api/categories */
  async list(_req: Request, res: Response): Promise<void> {
    const items = await categoryModel.listAll();
    ok(res, items);
  },
};

export default categoryController;
