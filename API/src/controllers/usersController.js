/**
 * @typedef {import('../models/requestBodies').CreateUserRequest} CreateUserRequest
 */

const { callStoredProcedure, querySingle, queryAll } = require('../db/helpers');

async function createUser(req, res) {
  /** @type {CreateUserRequest} */
  const payload = req.body || {};
  const { name } = payload;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const sanitizedName = name.trim();
    await callStoredProcedure('create_user', [sanitizedName]);

    const createdUser = await querySingle(
      'SELECT id, name, createdAt, updatedAt FROM users WHERE name = ? ORDER BY createdAt DESC LIMIT 1',
      [sanitizedName],
    );

    if (!createdUser) {
      return res.status(201).json({ message: 'User created but could not retrieve record' });
    }

    return res.status(201).json({ user: createdUser });
  } catch (error) {
    console.error('Failed to create user', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

async function deleteUser(req, res) {
  const { userId } = req;

  try {
    const existingUser = await querySingle('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await callStoredProcedure('delete_user', [userId]);
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

async function getUserSummary(req, res) {
  const { userId } = req;

  try {
    const summary = await querySingle('SELECT * FROM user_hierarchy_summary_view WHERE userId = ?', [userId]);

    if (!summary) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(summary);
  } catch (error) {
    console.error('Failed to fetch user summary', error);
    return res.status(500).json({ error: 'Failed to fetch user summary' });
  }
}

async function getUserTabGroups(req, res) {
  const { userId } = req;

  try {
    const rows = await queryAll('SELECT * FROM user_tabgroups_view WHERE userId = ?', [userId]);
    return res.json(rows);
  } catch (error) {
    console.error('Failed to fetch user tab groups', error);
    return res.status(500).json({ error: 'Failed to fetch user tab groups' });
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUserSummary,
  getUserTabGroups,
};
