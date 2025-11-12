import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// 1. Define a type for our custom token payload
interface CustomJwtPayload extends JwtPayload {
  userId: string;
  email: string;
}

// 2. Augment the Express Request type to include our custom user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // if there isn't any token
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as CustomJwtPayload;

    // 3. Attach only the essential info to the request object
    req.user = { userId: decoded.userId };

    next(); // move on to the next middleware
  } catch (err) {
    return res.sendStatus(403); // if the token is invalid or expired
  }
};
