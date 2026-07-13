import 'express';
import type {
  EnvironmentDetailViewRow,
  TabDetailViewRow,
  UserTabGroupViewRow,
} from '../../db/resourceAccess';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authUser?: {
        id: string;
        name: string;
        role: string | null;
      };
      tabGroup?: UserTabGroupViewRow;
      tab?: TabDetailViewRow;
      environment?: EnvironmentDetailViewRow;
    }
  }
}

export {};
