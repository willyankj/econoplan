import { Request, Response } from 'express';
import { registerNewUser, authenticateUser } from '../services/auth.service';

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const result = await registerNewUser({ email, password });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
        // Check for unique constraint violation
        if ((error as any).code === '23505') {
            return res.status(409).json({ message: 'Email already in use' });
        }
    }
    return res.status(500).json({ message: 'Error registering user', error });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const result = await authenticateUser({ email, password });
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Error logging in', error });
  }
};
