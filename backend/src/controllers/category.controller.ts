import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const category = await categoryService.createCategory(userId, req.body);
        res.status(201).json(category);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating category' });
    }
};

export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { workspaceId } = req.query;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }

        const categories = await categoryService.getCategoriesByWorkspace(userId, workspaceId as string);
        res.status(200).json(categories);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const updatedCategory = await categoryService.updateCategory(userId, id, req.body);
        res.status(200).json(updatedCategory);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error updating category' });
    }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const result = await categoryService.deleteCategory(userId, id);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error deleting category' });
    }
};
