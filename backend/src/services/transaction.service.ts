import pool from '../database/database';
import { canAccessWorkspace } from '../utils/workspace.util';

// We'll define the Transaction type later in a models file
interface TransactionData {
  workspace_id: string;
  user_id: string;
  account_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
}

export const createTransaction = async (userId: string, data: TransactionData) => {
    if (!await canAccessWorkspace(userId, data.workspace_id)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const { workspace_id, account_id, description, amount, type, transaction_date } = data;
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO transactions (workspace_id, user_id, account_id, description, amount, type, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [workspace_id, userId, account_id, description, amount, type, transaction_date]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const getTransactionsByWorkspace = async (userId: string, workspaceId: string) => {
    if (!await canAccessWorkspace(userId, workspaceId)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM transactions WHERE workspace_id = $1 ORDER BY transaction_date DESC',
            [workspaceId]
        );
        return result.rows;
    } finally {
        client.release();
    }
};

export const updateTransaction = async (userId: string, transactionId: string, data: Partial<TransactionData>) => {
    const client = await pool.connect();
    try {
        // First, verify the user has access to the workspace this transaction belongs to
        const transactionResult = await client.query('SELECT workspace_id FROM transactions WHERE transaction_id = $1', [transactionId]);
        if (transactionResult.rowCount === 0) {
            throw new Error('Transaction not found');
        }
        const { workspace_id } = transactionResult.rows[0];

        if (!await canAccessWorkspace(userId, workspace_id)) {
            throw new Error('Forbidden: User does not have access to this workspace');
        }

        // Dynamically build the update query
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

        const query = `UPDATE transactions SET ${setClause} WHERE transaction_id = $1 RETURNING *`;
        const result = await client.query(query, [transactionId, ...values]);

        return result.rows[0];
    } finally {
        client.release();
    }
}

export const createTransfer = async (userId: string, data: {
    workspace_id: string;
    from_account_id: string;
    to_account_id: string;
    description: string;
    amount: number;
    transaction_date: string;
}) => {
    if (!await canAccessWorkspace(userId, data.workspace_id)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const { workspace_id, from_account_id, to_account_id, description, amount, transaction_date } = data;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create expense transaction
        await client.query(
            'INSERT INTO transactions (workspace_id, user_id, account_id, description, amount, type, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [workspace_id, userId, from_account_id, description, amount, 'expense', transaction_date]
        );

        // Create income transaction
        await client.query(
            'INSERT INTO transactions (workspace_id, user_id, account_id, description, amount, type, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [workspace_id, userId, to_account_id, description, amount, 'income', transaction_date]
        );

        // Update balances
        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
            [amount, from_account_id]
        );
        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
            [amount, to_account_id]
        );

        await client.query('COMMIT');
        return { message: 'Transfer completed successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const deleteTransaction = async (userId: string, transactionId: string) => {
    const client = await pool.connect();
    try {
        // First, verify the user has access to the workspace this transaction belongs to
        const transactionResult = await client.query('SELECT workspace_id FROM transactions WHERE transaction_id = $1', [transactionId]);
        if (transactionResult.rowCount === 0) {
            throw new Error('Transaction not found');
        }
        const { workspace_id } = transactionResult.rows[0];

        if (!await canAccessWorkspace(userId, workspace_id)) {
            throw new Error('Forbidden: User does not have access to this workspace');
        }

        await client.query('DELETE FROM transactions WHERE transaction_id = $1', [transactionId]);
        return { message: 'Transaction deleted successfully' };
    } finally {
        client.release();
    }
}
