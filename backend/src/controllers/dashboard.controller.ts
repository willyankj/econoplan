import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { workspaceId, month, year } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const summary = await dashboardService.getSummary(
      userId,
      workspaceId as string,
      parseInt(month as string, 10),
      parseInt(year as string, 10)
    );

    res.status(200).json(summary);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching dashboard summary' });
  }
};
