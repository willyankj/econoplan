import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.middleware';
import { handleValidationErrors } from '../middlewares/validation.middleware';
import { createTransaction, getTransactions, updateTransaction, deleteTransaction } from '../controllers/transaction.controller';

const router = Router();

// Validation rules for creating/updating a transaction
const transactionValidationRules = [
  body('description').notEmpty().trim().escape(),
  body('amount').isFloat({ gt: 0 }).toFloat(),
  body('type').isIn(['income', 'expense']),
  body('transaction_date').isISO8601().toDate(),
  body('category_id').optional({ checkFalsy: true }).isUUID(),
];

// Apply the authentication middleware to all transaction routes
router.use(authenticateToken);

router.post('/', transactionValidationRules, handleValidationErrors, createTransaction);

router.get(
  '/',
  query('workspaceId').isUUID().withMessage('Workspace ID is required'),
  handleValidationErrors,
  getTransactions
);

router.put('/:id', transactionValidationRules, handleValidationErrors, updateTransaction);

router.delete('/:id', deleteTransaction);

export default router;
