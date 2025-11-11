import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { createTransaction, getTransactions, updateTransaction, deleteTransaction } from '../controllers/transaction.controller';

const router = Router();

// Apply the authentication middleware to all transaction routes
router.use(authenticateToken);

router.post('/', createTransaction);
router.get('/', getTransactions);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
