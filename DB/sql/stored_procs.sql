DELIMITER $$

DROP PROCEDURE IF EXISTS create_user $$
CREATE PROCEDURE create_user (
    IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO users (id, name, createdAt, updatedAt)
    VALUES (UUID(), p_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
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

DROP PROCEDURE IF EXISTS delete_user $$
CREATE PROCEDURE delete_user (
    IN p_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DELETE FROM users
    WHERE id = p_user_id;
END $$

DELIMITER ;
