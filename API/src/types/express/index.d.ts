import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authUser?: {
        id: string;
        name: string;
        role: string | null;
      };
    }
  }
}

export {};
