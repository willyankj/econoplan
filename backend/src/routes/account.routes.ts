import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { handleValidationErrors } from '../middlewares/validation.middleware';
import { body } from 'express-validator';

const router = Router();

router.post(
  '/',
  authenticateToken,
  body('workspace_id').isUUID().withMessage('Workspace ID must be a valid UUID'),
  body('account_name').trim().escape().notEmpty().withMessage('Account name is required'),
  body('account_type').isIn(['checking', 'savings', 'credit_card', 'investment', 'cash']).withMessage('Invalid account type'),
  body('balance').isNumeric().withMessage('Balance must be a number'),
  handleValidationErrors,
  accountController.createAccount
);

router.get(
  '/',
  authenticateToken,
  accountController.getAccounts
);

export default router;
