DELIMITER $$

DROP PROCEDURE IF EXISTS create_user $$
CREATE PROCEDURE create_user (
    IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_new_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    SET v_role = NULLIF(TRIM(p_role), '');
    SET v_password_hash = NULLIF(p_password_hash, '');
    SET v_new_id = UUID();

    INSERT INTO users (id, name, role, passwordHash, createdAt, updatedAt)
    VALUES (v_new_id, p_name, v_role, v_password_hash, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    SELECT id, name, role, createdAt, updatedAt
      FROM users
     WHERE id = v_new_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS update_user $$
CREATE PROCEDURE update_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_update_name TINYINT,
    IN p_update_role TINYINT,
    IN p_update_password TINYINT
)
BEGIN
    DECLARE v_role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_should_update TINYINT;

    SET v_role = NULLIF(TRIM(p_role), '');
    SET v_password_hash = NULLIF(p_password_hash, '');
    SET v_should_update = p_update_name OR p_update_role OR p_update_password;

    UPDATE users
    SET
        name = CASE WHEN p_update_name = 1 THEN p_name ELSE name END,
        role = CASE WHEN p_update_role = 1 THEN v_role ELSE role END,
        passwordHash = CASE WHEN p_update_password = 1 THEN v_password_hash ELSE passwordHash END,
        updatedAt = CASE WHEN v_should_update = 1 THEN CURRENT_TIMESTAMP ELSE updatedAt END
    WHERE id = p_user_id;
END $$

DROP PROCEDURE IF EXISTS create_tab_group $$
CREATE PROCEDURE create_tab_group (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_title   VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE nextOrder INT;

    SELECT COALESCE(MAX(sortOrder), 0) + 1
      INTO nextOrder
      FROM tabgroups
     WHERE userId = p_user_id;

    INSERT INTO tabgroups (id, userId, title, sortOrder, createdAt, updatedAt)
    VALUES (UUID(), p_user_id, p_title, nextOrder, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END $$

DROP PROCEDURE IF EXISTS create_tab $$
CREATE PROCEDURE create_tab (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_title        VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE nextOrder INT;

    SELECT COALESCE(MAX(sortOrder), 0) + 1
      INTO nextOrder
      FROM tabs
     WHERE tabGroupId = p_tab_group_id;

    INSERT INTO tabs (id, tabGroupId, title, sortOrder, createdAt, updatedAt)
    VALUES (UUID(), p_tab_group_id, p_title, nextOrder, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END $$

DROP PROCEDURE IF EXISTS create_environment $$
CREATE PROCEDURE create_environment (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_name   VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_url    TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO environments (id, tabId, name, url, createdAt, updatedAt)
    VALUES (UUID(), p_tab_id, p_name, p_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END $$

DROP PROCEDURE IF EXISTS rename_tab_group $$
CREATE PROCEDURE rename_tab_group (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_title        VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE tabgroups
    SET title = p_title,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_tab_group_id;
END $$

DROP PROCEDURE IF EXISTS rename_tab $$
CREATE PROCEDURE rename_tab (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_title  VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE tabs
    SET title = p_title,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_tab_id;
END $$

DROP PROCEDURE IF EXISTS update_environment $$
CREATE PROCEDURE update_environment (
    IN p_environment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_name           VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_url            TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE environments
    SET name = p_name,
        url = p_url,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_environment_id;
END $$

DROP PROCEDURE IF EXISTS delete_tab_group $$
CREATE PROCEDURE delete_tab_group (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM tabgroups
    WHERE id = p_tab_group_id;
END $$

DROP PROCEDURE IF EXISTS delete_tab $$
CREATE PROCEDURE delete_tab (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM tabs
    WHERE id = p_tab_id;
END $$

DROP PROCEDURE IF EXISTS delete_environment $$
CREATE PROCEDURE delete_environment (
    IN p_environment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM environments
    WHERE id = p_environment_id;
END $$

DROP PROCEDURE IF EXISTS move_tab_group $$
CREATE PROCEDURE move_tab_group (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_direction ENUM('up', 'down')
)
BEGIN
    DECLARE v_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_current_order INT;
    DECLARE v_neighbor_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_neighbor_order INT;

    SELECT userId, sortOrder
      INTO v_user_id, v_current_order
      FROM tabgroups
     WHERE id = p_tab_group_id
     LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        IF p_direction = 'up' THEN
            SELECT id, sortOrder
              INTO v_neighbor_id, v_neighbor_order
              FROM tabgroups
             WHERE userId = v_user_id
               AND sortOrder < v_current_order
             ORDER BY sortOrder DESC
             LIMIT 1;
        ELSEIF p_direction = 'down' THEN
            SELECT id, sortOrder
              INTO v_neighbor_id, v_neighbor_order
              FROM tabgroups
             WHERE userId = v_user_id
               AND sortOrder > v_current_order
             ORDER BY sortOrder ASC
             LIMIT 1;
        END IF;

        IF v_neighbor_id IS NOT NULL THEN
            UPDATE tabgroups
               SET sortOrder = v_neighbor_order,
                   updatedAt = CURRENT_TIMESTAMP
             WHERE id = p_tab_group_id;

            UPDATE tabgroups
               SET sortOrder = v_current_order,
                   updatedAt = CURRENT_TIMESTAMP
             WHERE id = v_neighbor_id;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS move_tab $$
CREATE PROCEDURE move_tab (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_direction ENUM('up', 'down')
)
BEGIN
    DECLARE v_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_current_order INT;
    DECLARE v_neighbor_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_neighbor_order INT;

    SELECT tabGroupId, sortOrder
      INTO v_tab_group_id, v_current_order
      FROM tabs
     WHERE id = p_tab_id
     LIMIT 1;

    IF v_tab_group_id IS NOT NULL THEN
        IF p_direction = 'up' THEN
            SELECT id, sortOrder
              INTO v_neighbor_id, v_neighbor_order
              FROM tabs
             WHERE tabGroupId = v_tab_group_id
               AND sortOrder < v_current_order
             ORDER BY sortOrder DESC
             LIMIT 1;
        ELSEIF p_direction = 'down' THEN
            SELECT id, sortOrder
              INTO v_neighbor_id, v_neighbor_order
              FROM tabs
             WHERE tabGroupId = v_tab_group_id
               AND sortOrder > v_current_order
             ORDER BY sortOrder ASC
             LIMIT 1;
        END IF;

        IF v_neighbor_id IS NOT NULL THEN
            UPDATE tabs
               SET sortOrder = v_neighbor_order,
                   updatedAt = CURRENT_TIMESTAMP
             WHERE id = p_tab_id;

            UPDATE tabs
               SET sortOrder = v_current_order,
                   updatedAt = CURRENT_TIMESTAMP
             WHERE id = v_neighbor_id;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS search_user_tabs $$
CREATE PROCEDURE search_user_tabs (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_query   VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE sanitized_query VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE like_pattern VARCHAR(515) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    SET sanitized_query = TRIM(COALESCE(p_query, ''));

    IF sanitized_query = '' THEN
        SELECT
            userId,
            tabId,
            tabTitle,
            tabSortOrder,
            tabCreatedAt,
            tabUpdatedAt,
            tabGroupId,
            tabGroupTitle,
            tabGroupSortOrder,
            tabGroupCreatedAt,
            tabGroupUpdatedAt,
            environmentId,
            environmentName,
            environmentUrl,
            environmentCreatedAt,
            environmentUpdatedAt
        FROM tab_search_view
        WHERE 1 = 0;
    ELSE
        SET like_pattern = REPLACE(sanitized_query, '\\', '\\\\');
        SET like_pattern = REPLACE(like_pattern, '%', '\\%');
        SET like_pattern = REPLACE(like_pattern, '_', '\\_');
        SET like_pattern = CONCAT('%', like_pattern, '%');

        SELECT
            userId,
            tabId,
            tabTitle,
            tabSortOrder,
            tabCreatedAt,
            tabUpdatedAt,
            tabGroupId,
            tabGroupTitle,
            tabGroupSortOrder,
            tabGroupCreatedAt,
            tabGroupUpdatedAt,
            environmentId,
            environmentName,
            environmentUrl,
            environmentCreatedAt,
            environmentUpdatedAt
        FROM tab_search_view
        WHERE userId = p_user_id
          AND (
              tabTitle LIKE like_pattern COLLATE utf8mb4_unicode_ci ESCAPE '\\'
              OR (
                  environmentUrl IS NOT NULL
                  AND environmentUrl LIKE like_pattern COLLATE utf8mb4_unicode_ci ESCAPE '\\'
              )
          )
        ORDER BY
            tabGroupSortOrder ASC,
            tabGroupCreatedAt ASC,
            tabSortOrder ASC,
            tabCreatedAt ASC,
            tabId ASC,
            environmentCreatedAt ASC;
    END IF;
END $$

DROP PROCEDURE IF EXISTS get_user_by_id $$
CREATE PROCEDURE get_user_by_id (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT id,
           name,
           role,
           createdAt,
           updatedAt
      FROM users
     WHERE id = p_user_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_user_with_password_by_name $$
CREATE PROCEDURE get_user_with_password_by_name (
    IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT id,
           name,
           role,
           passwordHash,
           createdAt,
           updatedAt
      FROM users
     WHERE name = p_name
     ORDER BY createdAt DESC
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_user_by_name $$
CREATE PROCEDURE get_user_by_name (
    IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT id,
           name,
           role,
           createdAt,
           updatedAt
      FROM users
     WHERE name = p_name
     ORDER BY createdAt DESC
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS list_users $$
CREATE PROCEDURE list_users ()
BEGIN
    SELECT id,
           name,
           role,
           createdAt,
           updatedAt
      FROM users
     ORDER BY createdAt ASC;
END $$

DROP PROCEDURE IF EXISTS get_user_summary $$
CREATE PROCEDURE get_user_summary (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM user_hierarchy_summary_view
     WHERE userId = p_user_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_tab_group_by_id $$
CREATE PROCEDURE get_tab_group_by_id (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM user_tabgroups_view
     WHERE tabGroupId = p_tab_group_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_latest_tab_group_for_user $$
CREATE PROCEDURE get_latest_tab_group_for_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM user_tabgroups_view
     WHERE userId = p_user_id
     ORDER BY tabGroupCreatedAt DESC
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS list_tab_groups_for_user $$
CREATE PROCEDURE list_tab_groups_for_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM user_tabgroups_view
     WHERE userId = p_user_id
     ORDER BY tabGroupSortOrder ASC,
              tabGroupCreatedAt ASC;
END $$

DROP PROCEDURE IF EXISTS get_tab_by_id $$
CREATE PROCEDURE get_tab_by_id (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM tab_detail_view
     WHERE tabId = p_tab_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_latest_tab_for_group $$
CREATE PROCEDURE get_latest_tab_for_group (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM tab_detail_view
     WHERE tabGroupId = p_tab_group_id
     ORDER BY tabCreatedAt DESC
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS list_tabs_for_tab_group $$
CREATE PROCEDURE list_tabs_for_tab_group (
    IN p_tab_group_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM tab_detail_view
     WHERE tabGroupId = p_tab_group_id
     ORDER BY tabSortOrder ASC,
              tabCreatedAt ASC;
END $$

DROP PROCEDURE IF EXISTS get_environment_by_id $$
CREATE PROCEDURE get_environment_by_id (
    IN p_environment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM environment_detail_view
     WHERE environmentId = p_environment_id
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS get_latest_environment_for_tab $$
CREATE PROCEDURE get_latest_environment_for_tab (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM environment_detail_view
     WHERE tabId = p_tab_id
     ORDER BY environmentCreatedAt DESC
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS list_environments_for_tab $$
CREATE PROCEDURE list_environments_for_tab (
    IN p_tab_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM environment_detail_view
     WHERE tabId = p_tab_id;
END $$

DROP PROCEDURE IF EXISTS get_tab_group_summary_for_user $$
CREATE PROCEDURE get_tab_group_summary_for_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
      FROM tabgroup_summary_view
     WHERE userId = p_user_id;
END $$

DROP PROCEDURE IF EXISTS save_refresh_token $$
CREATE PROCEDURE save_refresh_token (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_token_hash CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_expires_at DATETIME
)
BEGIN
    INSERT INTO user_refresh_tokens (userId, tokenHash, expiresAt)
    VALUES (p_user_id, p_token_hash, p_expires_at);
END $$

DROP PROCEDURE IF EXISTS find_refresh_token $$
CREATE PROCEDURE find_refresh_token (
    IN p_token_hash CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT id,
           userId,
           tokenHash,
           expiresAt,
           createdAt
      FROM user_refresh_tokens
     WHERE tokenHash = p_token_hash
     LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS delete_refresh_token $$
CREATE PROCEDURE delete_refresh_token (
    IN p_token_hash CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM user_refresh_tokens
     WHERE tokenHash = p_token_hash;
END $$

DROP PROCEDURE IF EXISTS delete_refresh_token_by_id $$
CREATE PROCEDURE delete_refresh_token_by_id (
    IN p_id BIGINT UNSIGNED
)
BEGIN
    DELETE FROM user_refresh_tokens
     WHERE id = p_id;
END $$

DROP PROCEDURE IF EXISTS delete_refresh_tokens_for_user $$
CREATE PROCEDURE delete_refresh_tokens_for_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM user_refresh_tokens
     WHERE userId = p_user_id;
END $$

DROP PROCEDURE IF EXISTS ensure_refresh_token_table $$
CREATE PROCEDURE ensure_refresh_token_table ()
BEGIN
    CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        tokenHash CHAR(64) NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_refresh_tokens_userId (userId),
        UNIQUE INDEX idx_user_refresh_tokens_tokenHash (tokenHash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
END $$

DROP PROCEDURE IF EXISTS list_refresh_tokens $$
CREATE PROCEDURE list_refresh_tokens ()
BEGIN
    SELECT ur.id,
           ur.userId,
           ur.expiresAt,
           ur.createdAt,
           u.name AS userName,
           u.role AS userRole
      FROM user_refresh_tokens ur
      JOIN users u ON u.id = ur.userId
     ORDER BY ur.createdAt DESC;
END $$

DROP PROCEDURE IF EXISTS delete_user $$
CREATE PROCEDURE delete_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM users
    WHERE id = p_user_id;
END $$

DELIMITER ;
