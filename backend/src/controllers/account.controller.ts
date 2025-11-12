import { Request, Response } from 'express';
import * as accountService from '../services/account.service';
import { matchedData } from 'express-validator';

export const createAccount = async (req: Request, res: Response) => {
  try {
    const { workspace_id, account_name, account_type, balance } = matchedData(req);
    const userId = (req as any).user.userId;

    const account = await accountService.createAccount(userId, {
      workspace_id,
      account_name,
      account_type,
      balance
    });

    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
};

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const userId = (req as any).user.userId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const accounts = await accountService.getAccountsByWorkspace(userId, workspaceId as string);
    res.status(200).json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
};
