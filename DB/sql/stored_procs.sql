DELIMITER $$

DROP PROCEDURE IF EXISTS create_user $$
CREATE PROCEDURE create_user (
    IN p_name VARCHAR(255)
)
BEGIN
    INSERT INTO users (id, name)
    VALUES (UUID(), p_name);
END $$

DROP PROCEDURE IF EXISTS create_tab_group $$
CREATE PROCEDURE create_tab_group (
    IN p_user_id CHAR(36),
    IN p_title   VARCHAR(255)
)
BEGIN
    INSERT INTO tabgroups (id, userId, title)
    VALUES (UUID(), p_user_id, p_title);
END $$

DROP PROCEDURE IF EXISTS create_tab $$
CREATE PROCEDURE create_tab (
    IN p_tab_group_id CHAR(36),
    IN p_title        VARCHAR(255)
)
BEGIN
    INSERT INTO tabs (id, tabGroupId, title)
    VALUES (UUID(), p_tab_group_id, p_title);
END $$

DROP PROCEDURE IF EXISTS create_environment $$
CREATE PROCEDURE create_environment (
    IN p_tab_id CHAR(36),
    IN p_name   VARCHAR(255),
    IN p_url    TEXT
)
BEGIN
    INSERT INTO environments (id, tabId, name, url)
    VALUES (UUID(), p_tab_id, p_name, p_url);
END $$

DROP PROCEDURE IF EXISTS rename_tab_group $$
CREATE PROCEDURE rename_tab_group (
    IN p_tab_group_id CHAR(36),
    IN p_title        VARCHAR(255)
)
BEGIN
    UPDATE tabgroups
    SET title = p_title,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_tab_group_id;
END $$

DROP PROCEDURE IF EXISTS rename_tab $$
CREATE PROCEDURE rename_tab (
    IN p_tab_id CHAR(36),
    IN p_title  VARCHAR(255)
)
BEGIN
    UPDATE tabs
    SET title = p_title,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_tab_id;
END $$

DROP PROCEDURE IF EXISTS update_environment $$
CREATE PROCEDURE update_environment (
    IN p_environment_id CHAR(36),
    IN p_name           VARCHAR(255),
    IN p_url            TEXT
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
    IN p_tab_group_id CHAR(36)
)
BEGIN
    DELETE FROM tabgroups
    WHERE id = p_tab_group_id;
END $$

DROP PROCEDURE IF EXISTS delete_tab $$
CREATE PROCEDURE delete_tab (
    IN p_tab_id CHAR(36)
)
BEGIN
    DELETE FROM tabs
    WHERE id = p_tab_id;
END $$

DROP PROCEDURE IF EXISTS delete_environment $$
CREATE PROCEDURE delete_environment (
    IN p_environment_id CHAR(36)
)
BEGIN
    DELETE FROM environments
    WHERE id = p_environment_id;
END $$

DROP PROCEDURE IF EXISTS delete_user $$
CREATE PROCEDURE delete_user (
    IN p_user_id CHAR(36)
)
BEGIN
    DELETE FROM users
    WHERE id = p_user_id;
END $$

DELIMITER ;
