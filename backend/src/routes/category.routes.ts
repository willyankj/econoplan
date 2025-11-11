import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/category.controller';

const router = Router();

// Apply the authentication middleware to all category routes
router.use(authenticateToken);

router.post('/', createCategory);
router.get('/', getCategories);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
