import pool from '../database/database';

/**
 * Checks if a user has access to a specific workspace.
 * @param userId - The ID of the user.
 * @param workspaceId - The ID of the workspace.
 * @returns True if the user has access, false otherwise.
 */
export const canAccessWorkspace = async (userId: string, workspaceId: string): Promise<boolean> => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT 1 FROM user_workspaces WHERE user_id = $1 AND workspace_id = $2',
            [userId, workspaceId]
        );
        return result.rowCount > 0;
    } finally {
        client.release();
    }
};
