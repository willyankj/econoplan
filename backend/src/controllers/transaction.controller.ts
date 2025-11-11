import { Request, Response } from 'express';
import * as transactionService from '../services/transaction.service';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

export const createTransaction = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const transaction = await transactionService.createTransaction(userId, req.body);
        res.status(201).json(transaction);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating transaction' });
    }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { workspaceId } = req.query;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }

        const transactions = await transactionService.getTransactionsByWorkspace(userId, workspaceId as string);
        res.status(200).json(transactions);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching transactions' });
    }
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const updatedTransaction = await transactionService.updateTransaction(userId, id, req.body);
        res.status(200).json(updatedTransaction);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error updating transaction' });
    }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const result = await transactionService.deleteTransaction(userId, id);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error deleting transaction' });
    }
};
