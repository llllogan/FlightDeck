/**
 * @typedef {import('../models/requestBodies').CreateTabRequest} CreateTabRequest
 * @typedef {import('../models/requestBodies').RenameTabRequest} RenameTabRequest
 */

const { callStoredProcedure } = require('../db/helpers');
const {
  getTabGroupById,
  getTabById,
  getLatestTabForGroup,
  listTabsForUser,
} = require('../db/resourceAccess');

async function listTabs(req, res) {
  try {
    const tabs = await listTabsForUser(req.userId);
    return res.json(tabs);
  } catch (error) {
    console.error('Failed to list tabs', error);
    return res.status(500).json({ error: 'Failed to list tabs' });
  }
}

async function createTab(req, res) {
  /** @type {CreateTabRequest} */
  const payload = req.body || {};
  const { tabGroupId, title } = payload;

  if (!tabGroupId || typeof tabGroupId !== 'string') {
    return res.status(400).json({ error: 'tabGroupId is required' });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const tabGroup = await getTabGroupById(tabGroupId);

    if (!tabGroup) {
      return res.status(404).json({ error: 'Tab group not found' });
    }

    if (tabGroup.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab group' });
    }

    await callStoredProcedure('create_tab', [tabGroupId, title.trim()]);
    const created = await getLatestTabForGroup(tabGroupId);

    if (!created) {
      return res.status(201).json({ message: 'Tab created but could not retrieve record' });
    }

    return res.status(201).json({ tab: created });
  } catch (error) {
    console.error('Failed to create tab', error);
    return res.status(500).json({ error: 'Failed to create tab' });
  }
}

async function renameTab(req, res) {
  const { tabId } = req.params;

  /** @type {RenameTabRequest} */
  const payload = req.body || {};
  const { title } = payload;

  if (!tabId) {
    return res.status(400).json({ error: 'tabId path parameter is required' });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const tab = await getTabById(tabId);

    if (!tab) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    if (tab.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab' });
    }

    await callStoredProcedure('rename_tab', [tabId, title.trim()]);
    const updated = await getTabById(tabId);
    return res.json({ tab: updated });
  } catch (error) {
    console.error('Failed to rename tab', error);
    return res.status(500).json({ error: 'Failed to rename tab' });
  }
}

async function deleteTab(req, res) {
  const { tabId } = req.params;

  if (!tabId) {
    return res.status(400).json({ error: 'tabId path parameter is required' });
  }

  try {
    const tab = await getTabById(tabId);

    if (!tab) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    if (tab.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab' });
    }

    await callStoredProcedure('delete_tab', [tabId]);
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete tab', error);
    return res.status(500).json({ error: 'Failed to delete tab' });
  }
}

module.exports = {
  listTabs,
  createTab,
  renameTab,
  deleteTab,
};
