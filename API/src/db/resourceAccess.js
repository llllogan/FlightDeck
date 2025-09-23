const { querySingle, queryAll } = require('./helpers');

async function getUserById(userId) {
  return querySingle('SELECT id, name, createdAt, updatedAt FROM users WHERE id = ?', [userId]);
}

async function getTabGroupById(tabGroupId) {
  return querySingle('SELECT * FROM user_tabgroups_view WHERE tabGroupId = ?', [tabGroupId]);
}

async function getLatestTabGroupForUser(userId) {
  return querySingle(
    'SELECT * FROM user_tabgroups_view WHERE userId = ? ORDER BY tabGroupCreatedAt DESC LIMIT 1',
    [userId],
  );
}

async function listTabGroupsForUser(userId) {
  return queryAll('SELECT * FROM user_tabgroups_view WHERE userId = ?', [userId]);
}

async function getTabById(tabId) {
  return querySingle('SELECT * FROM tab_detail_view WHERE tabId = ?', [tabId]);
}

async function getLatestTabForGroup(tabGroupId) {
  return querySingle(
    'SELECT * FROM tab_detail_view WHERE tabGroupId = ? ORDER BY tabCreatedAt DESC LIMIT 1',
    [tabGroupId],
  );
}

async function listTabsForUser(userId) {
  return queryAll('SELECT * FROM tab_detail_view WHERE userId = ?', [userId]);
}

async function getEnvironmentById(environmentId) {
  return querySingle('SELECT * FROM environment_detail_view WHERE environmentId = ?', [environmentId]);
}

async function getLatestEnvironmentForTab(tabId) {
  return querySingle(
    'SELECT * FROM environment_detail_view WHERE tabId = ? ORDER BY environmentCreatedAt DESC LIMIT 1',
    [tabId],
  );
}

async function listEnvironmentsForUser(userId) {
  return queryAll('SELECT * FROM environment_detail_view WHERE userId = ?', [userId]);
}

async function getTabGroupSummaryForUser(userId) {
  return queryAll('SELECT * FROM tabgroup_summary_view WHERE userId = ?', [userId]);
}

module.exports = {
  getUserById,
  getTabGroupById,
  getLatestTabGroupForUser,
  listTabGroupsForUser,
  getTabById,
  getLatestTabForGroup,
  listTabsForUser,
  getEnvironmentById,
  getLatestEnvironmentForTab,
  listEnvironmentsForUser,
  getTabGroupSummaryForUser,
};
