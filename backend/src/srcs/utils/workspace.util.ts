import { db } from '../database/db';

/**
 * Checks if a user has access to a specific workspace.
 * @param userId - The ID of the user.
 * @param workspaceId - The ID of the workspace.
 * @returns True if the user has access, false otherwise.
 */
export async function canAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const workspace = await db
    .selectFrom('workspaces')
    .where('workspace_id', '=', workspaceId)
    .where('user_id', '=', userId)
    .selectAll()
    .executeTakeFirst();
  return !!workspace;
}
