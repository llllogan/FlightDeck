DROP VIEW IF EXISTS user_tabgroups_view;
CREATE OR REPLACE VIEW user_tabgroups_view AS
SELECT
    u.id        AS userId,
    u.name      AS userName,
    tg.id       AS tabGroupId,
    tg.title    AS tabGroupTitle,
    tg.sortOrder AS tabGroupSortOrder,
    tg.createdAt AS tabGroupCreatedAt,
    tg.updatedAt AS tabGroupUpdatedAt
FROM users u
LEFT JOIN tabgroups tg ON tg.userId = u.id;

DROP VIEW IF EXISTS tab_detail_view;
CREATE OR REPLACE VIEW tab_detail_view AS
SELECT
    t.id        AS tabId,
    t.title     AS tabTitle,
    t.sortOrder AS tabSortOrder,
    t.createdAt AS tabCreatedAt,
    t.updatedAt AS tabUpdatedAt,
    tg.id       AS tabGroupId,
    tg.title    AS tabGroupTitle,
    u.id        AS userId,
    u.name      AS userName
FROM tabs t
INNER JOIN tabgroups tg ON tg.id = t.tabGroupId
INNER JOIN users u ON u.id = tg.userId;

DROP VIEW IF EXISTS tab_search_view;
CREATE OR REPLACE VIEW tab_search_view AS
SELECT
    t.id        AS tabId,
    t.title     AS tabTitle,
    t.sortOrder AS tabSortOrder,
    t.createdAt AS tabCreatedAt,
    t.updatedAt AS tabUpdatedAt,
    tg.id       AS tabGroupId,
    tg.title    AS tabGroupTitle,
    tg.sortOrder AS tabGroupSortOrder,
    tg.createdAt AS tabGroupCreatedAt,
    tg.updatedAt AS tabGroupUpdatedAt,
    u.id        AS userId,
    u.name      AS userName,
    e.id        AS environmentId,
    e.name      AS environmentName,
    e.url       AS environmentUrl,
    e.createdAt AS environmentCreatedAt,
    e.updatedAt AS environmentUpdatedAt
FROM tabs t
INNER JOIN tabgroups tg ON tg.id = t.tabGroupId
INNER JOIN users u ON u.id = tg.userId
LEFT JOIN environments e ON e.tabId = t.id;

DROP VIEW IF EXISTS environment_detail_view;
CREATE OR REPLACE VIEW environment_detail_view AS
SELECT
    e.id        AS environmentId,
    e.name      AS environmentName,
    e.url       AS environmentUrl,
    e.createdAt AS environmentCreatedAt,
    e.updatedAt AS environmentUpdatedAt,
    t.id        AS tabId,
    t.title     AS tabTitle,
    tg.id       AS tabGroupId,
    tg.title    AS tabGroupTitle,
    u.id        AS userId,
    u.name      AS userName
FROM environments e
INNER JOIN tabs t ON t.id = e.tabId
INNER JOIN tabgroups tg ON tg.id = t.tabGroupId
INNER JOIN users u ON u.id = tg.userId;

DROP VIEW IF EXISTS user_hierarchy_summary_view;
CREATE OR REPLACE VIEW user_hierarchy_summary_view AS
SELECT
    u.id   AS userId,
    u.name AS userName,
    COUNT(DISTINCT tg.id) AS tabGroupCount,
    COUNT(DISTINCT t.id)  AS tabCount,
    COUNT(e.id)           AS environmentCount
FROM users u
LEFT JOIN tabgroups tg ON tg.userId = u.id
LEFT JOIN tabs t ON t.tabGroupId = tg.id
LEFT JOIN environments e ON e.tabId = t.id
GROUP BY u.id, u.name;

DROP VIEW IF EXISTS tabgroup_summary_view;
CREATE OR REPLACE VIEW tabgroup_summary_view AS
SELECT
    tg.id    AS tabGroupId,
    tg.title AS tabGroupTitle,
    u.id     AS userId,
    u.name   AS userName,
    COUNT(DISTINCT t.id) AS tabCount,
    COUNT(e.id)          AS environmentCount
FROM tabgroups tg
INNER JOIN users u ON u.id = tg.userId
LEFT JOIN tabs t ON t.tabGroupId = tg.id
LEFT JOIN environments e ON e.tabId = t.id
GROUP BY tg.id, tg.title, u.id, u.name;
