import type { Router, Request, Response } from 'express';
import { hash as hashPassword } from 'bcryptjs';
import { fetchSingleFromProcedure } from '../db/helpers';
import {
  getUserByName,
  updateUser,
  type UserRecord,
} from '../db/resourceAccess';
import { serializeUser } from '../serializers';
import { sanitizeTextInput } from '../utils/sanitizers';

interface BootstrapAdminRequest extends Request<Record<string, never>, unknown, {
  name?: string;
  password?: string;
}> {}

function isProduction(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

export function registerDevRoutes(router: Router): void {
  router.post('/dev/bootstrap-admin', async (req: BootstrapAdminRequest, res: Response): Promise<void> => {
    if (isProduction()) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const { name, password } = req.body ?? {};

    const sanitizedName = sanitizeTextInput(name);
    if (!sanitizedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const sanitizedPassword = sanitizeTextInput(password, { maxLength: 128 });
    if (!sanitizedPassword) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    try {
      const passwordHash = await hashPassword(sanitizedPassword, 10);
      const existingUser = await getUserByName(sanitizedName);

      if (existingUser) {
        await updateUser(existingUser.id, {
          name: undefined,
          role: 'admin',
          passwordHash,
          updateName: false,
          updateRole: true,
          updatePassword: true,
        });

        const refreshedUser = await getUserByName(sanitizedName);

        if (!refreshedUser) {
          res.status(500).json({ error: 'Updated admin user but could not re-fetch record' });
          return;
        }

        res.status(200).json({
          created: false,
          user: serializeUser(refreshedUser),
        });
        return;
      }

      const createdUser = await fetchSingleFromProcedure<UserRecord>('create_user', [
        sanitizedName,
        'admin',
        passwordHash,
      ]);

      const hydratedUser = createdUser ?? (await getUserByName(sanitizedName));

      if (!hydratedUser) {
        res.status(201).json({ message: 'Admin user created but could not re-fetch record' });
        return;
      }

      res.status(201).json({
        created: true,
        user: serializeUser(hydratedUser),
      });
    } catch (error) {
      console.error('Failed to bootstrap admin user', error);
      res.status(500).json({ error: 'Failed to bootstrap admin user' });
    }
  });
}
