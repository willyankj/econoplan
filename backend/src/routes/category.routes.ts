import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.middleware';
import { handleValidationErrors } from '../middlewares/validation.middleware';
import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/category.controller';

const router = Router();

// Validation rules
const categoryValidationRules = [
  body('category_name').notEmpty().trim().escape(),
  body('workspace_id').isUUID(),
];
const updateCategoryValidationRules = [
  body('category_name').notEmpty().trim().escape(),
];

// Apply the authentication middleware to all category routes
router.use(authenticateToken);

router.post('/', categoryValidationRules, handleValidationErrors, createCategory);

router.get(
  '/',
  query('workspaceId').isUUID().withMessage('Workspace ID is required'),
  handleValidationErrors,
  getCategories
);

router.put('/:id', updateCategoryValidationRules, handleValidationErrors, updateCategory);

router.delete('/:id', deleteCategory);

export default router;
