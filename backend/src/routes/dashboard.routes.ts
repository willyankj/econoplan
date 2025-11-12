import { Router } from 'express';
import { query } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.middleware';
import { handleValidationErrors } from '../middlewares/validation.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticateToken);

router.get(
  '/summary',
  query('workspaceId').isUUID(),
  query('month').isInt({ min: 1, max: 12 }),
  query('year').isInt({ min: 2000, max: 2100 }),
  handleValidationErrors,
  getDashboardSummary
);

export default router;
