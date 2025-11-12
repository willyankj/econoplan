import pool from '../database/database';
import { canAccessWorkspace } from '../utils/workspace.util';

interface CategoryData {
  workspace_id: string;
  category_name: string;
}

export const createCategory = async (userId: string, data: CategoryData) => {
    if (!await canAccessWorkspace(userId, data.workspace_id)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const { workspace_id, category_name } = data;
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO categories (workspace_id, category_name) VALUES ($1, $2) RETURNING *',
            [workspace_id, category_name]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const getCategoriesByWorkspace = async (userId: string, workspaceId: string) => {
    if (!await canAccessWorkspace(userId, workspaceId)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM categories WHERE workspace_id = $1 ORDER BY category_name',
            [workspaceId]
        );
        return result.rows;
    } finally {
        client.release();
    }
};

export const updateCategory = async (userId: string, categoryId: string, data: Partial<CategoryData>) => {
    const client = await pool.connect();
    try {
        const categoryResult = await client.query('SELECT workspace_id FROM categories WHERE category_id = $1', [categoryId]);
        if (categoryResult.rowCount === 0) {
            throw new Error('Category not found');
        }
        if (!await canAccessWorkspace(userId, categoryResult.rows[0].workspace_id)) {
            throw new Error('Forbidden: User does not have access to this workspace');
        }

        const { category_name } = data;
        const result = await client.query(
            'UPDATE categories SET category_name = $1 WHERE category_id = $2 RETURNING *',
            [category_name, categoryId]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const deleteCategory = async (userId: string, categoryId: string) => {
    const client = await pool.connect();
    try {
        const categoryResult = await client.query('SELECT workspace_id FROM categories WHERE category_id = $1', [categoryId]);
        if (categoryResult.rowCount === 0) {
            throw new Error('Category not found');
        }
        if (!await canAccessWorkspace(userId, categoryResult.rows[0].workspace_id)) {
            throw new Error('Forbidden: User does not have access to this workspace');
        }

        await client.query('DELETE FROM categories WHERE category_id = $1', [categoryId]);
        return { message: 'Category deleted successfully' };
    } finally {
        client.release();
    }
};
