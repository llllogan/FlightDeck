/**
 * @typedef {import('../models/requestBodies').CreateTabGroupRequest} CreateTabGroupRequest
 * @typedef {import('../models/requestBodies').RenameTabGroupRequest} RenameTabGroupRequest
 */

const { callStoredProcedure } = require('../db/helpers');
const {
  getUserById,
  getTabGroupById,
  getLatestTabGroupForUser,
  listTabGroupsForUser,
  getTabGroupSummaryForUser,
} = require('../db/resourceAccess');

async function listTabGroups(req, res) {
  try {
    const groups = await listTabGroupsForUser(req.userId);
    return res.json(groups);
  } catch (error) {
    console.error('Failed to list tab groups', error);
    return res.status(500).json({ error: 'Failed to list tab groups' });
  }
}

async function createTabGroup(req, res) {
  /** @type {CreateTabGroupRequest} */
  const payload = req.body || {};
  const { title } = payload;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sanitizedTitle = title.trim();
    await callStoredProcedure('create_tab_group', [req.userId, sanitizedTitle]);
    const createdGroup = await getLatestTabGroupForUser(req.userId);

    if (!createdGroup) {
      return res.status(201).json({ message: 'Tab group created but could not retrieve record' });
    }

    return res.status(201).json({ tabGroup: createdGroup });
  } catch (error) {
    console.error('Failed to create tab group', error);
    return res.status(500).json({ error: 'Failed to create tab group' });
  }
}

async function renameTabGroup(req, res) {
  const { tabGroupId } = req.params;

  /** @type {RenameTabGroupRequest} */
  const payload = req.body || {};
  const { title } = payload;

  if (!tabGroupId) {
    return res.status(400).json({ error: 'tabGroupId path parameter is required' });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const existing = await getTabGroupById(tabGroupId);

    if (!existing) {
      return res.status(404).json({ error: 'Tab group not found' });
    }

    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab group' });
    }

    await callStoredProcedure('rename_tab_group', [tabGroupId, title.trim()]);
    const updated = await getTabGroupById(tabGroupId);
    return res.json({ tabGroup: updated });
  } catch (error) {
    console.error('Failed to rename tab group', error);
    return res.status(500).json({ error: 'Failed to rename tab group' });
  }
}

async function deleteTabGroup(req, res) {
  const { tabGroupId } = req.params;

  if (!tabGroupId) {
    return res.status(400).json({ error: 'tabGroupId path parameter is required' });
  }

  try {
    const existing = await getTabGroupById(tabGroupId);

    if (!existing) {
      return res.status(404).json({ error: 'Tab group not found' });
    }

    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab group' });
    }

    await callStoredProcedure('delete_tab_group', [tabGroupId]);
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete tab group', error);
    return res.status(500).json({ error: 'Failed to delete tab group' });
  }
}

async function getTabGroupSummary(req, res) {
  try {
    const summary = await getTabGroupSummaryForUser(req.userId);
    return res.json(summary);
  } catch (error) {
    console.error('Failed to fetch tab group summary', error);
    return res.status(500).json({ error: 'Failed to fetch tab group summary' });
  }
}

module.exports = {
  listTabGroups,
  createTabGroup,
  renameTabGroup,
  deleteTabGroup,
  getTabGroupSummary,
};
