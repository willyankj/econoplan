import pool from '../database/database';
import { canAccessWorkspace } from '../utils/workspace.util';

export interface AccountData {
  workspace_id: string;
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash';
  balance: number;
}

export const createAccount = async (userId: string, data: AccountData) => {
  if (!await canAccessWorkspace(userId, data.workspace_id)) {
    throw new Error('Forbidden: User does not have access to this workspace');
  }

  const { workspace_id, account_name, account_type, balance } = data;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO accounts (workspace_id, account_name, account_type, balance) VALUES ($1, $2, $3, $4) RETURNING *',
      [workspace_id, account_name, account_type, balance]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getAccountsByWorkspace = async (userId: string, workspaceId: string) => {
  if (!await canAccessWorkspace(userId, workspaceId)) {
    throw new Error('Forbidden: User does not have access to this workspace');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM accounts WHERE workspace_id = $1 ORDER BY account_name',
      [workspaceId]
    );
    return result.rows;
  } finally {
    client.release();
  }
};
