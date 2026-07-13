import { Router } from 'express';
import { hash as hashPassword } from 'bcryptjs';
import { fetchSingleFromProcedure } from '../db/helpers';
import {
  getUserByName,
  getUserWithPasswordByName,
  updateUser,
  listUsers,
  type UserRecord,
} from '../db/resourceAccess';
import { serializeUser } from '../serializers';
import { sanitizeTextInput } from '../utils/sanitizers';

const router = Router();

function isProduction(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

router.get('/users', async (_req, res) => {
  if (isProduction()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const users = await listUsers();
    const payload = await Promise.all(
      users.map(async (user) => {
        const authRecord = await getUserWithPasswordByName(user.name);
        return {
          ...serializeUser(user),
          hasPassword: Boolean(authRecord?.passwordHash),
        };
      }),
    );
    res.json(payload);
  } catch (error) {
    console.error('Failed to fetch debug users', error);
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

router.post('/bootstrap-admin', async (req, res) => {
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

export default router;
