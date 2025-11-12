import pool from '../database/database';
import { canAccessWorkspace } from '../utils/workspace.util';

export const getSummary = async (userId: string, workspaceId: string, month: number, year: number) => {
    if (!await canAccessWorkspace(userId, workspaceId)) {
        throw new Error('Forbidden: User does not have access to this workspace');
    }

    const client = await pool.connect();
    try {
        const query = `
            SELECT
                type,
                SUM(amount) as total
            FROM transactions
            WHERE
                workspace_id = $1 AND
                EXTRACT(MONTH FROM transaction_date) = $2 AND
                EXTRACT(YEAR FROM transaction_date) = $3
            GROUP BY type;
        `;
        const result = await client.query(query, [workspaceId, month, year]);

        let totalIncome = 0;
        let totalExpense = 0;

        for (const row of result.rows) {
            if (row.type === 'income') {
                totalIncome = parseFloat(row.total);
            } else if (row.type === 'expense') {
                totalExpense = parseFloat(row.total);
            }
        }

        const balance = totalIncome - totalExpense;

        return { totalIncome, totalExpense, balance };

    } finally {
        client.release();
    }
};
