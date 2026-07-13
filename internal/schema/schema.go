// Package schema owns the local FlightDeck database schema.
package schema

import "database/sql"

// Ensure creates the current schema and applies the small, in-place upgrades
// required by earlier development builds.
func Ensure(db *sql.DB) error {
	stmts := []string{
		`PRAGMA foreign_keys = ON`,
		`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,login_name TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE IF NOT EXISTS tab_groups (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE IF NOT EXISTS tabs (id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES tab_groups(id) ON DELETE CASCADE,title TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE IF NOT EXISTS environments (id TEXT PRIMARY KEY,tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,name TEXT NOT NULL,url TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE IF NOT EXISTS favicon_sources (page_url TEXT PRIMARY KEY,favicon_url TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE INDEX IF NOT EXISTS idx_groups_user ON tab_groups(user_id,sort_order)`,
		`CREATE INDEX IF NOT EXISTS idx_tabs_group ON tabs(group_id,sort_order)`,
		`CREATE INDEX IF NOT EXISTS idx_environments_tab ON environments(tab_id,sort_order)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	// Development builds before username sign-in did not have login_name.
	columns, err := db.Query("PRAGMA table_info(users)")
	if err != nil {
		return err
	}
	hasLoginName, hasLegacyRole := false, false
	for columns.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue sql.NullString
		if err := columns.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			_ = columns.Close()
			return err
		}
		switch name {
		case "login_name":
			hasLoginName = true
		case "role":
			hasLegacyRole = true
		}
	}
	if err := columns.Close(); err != nil {
		return err
	}
	if !hasLoginName {
		if _, err := db.Exec("ALTER TABLE users ADD COLUMN login_name TEXT"); err != nil {
			return err
		}
		if _, err := db.Exec("UPDATE users SET login_name=name WHERE login_name IS NULL OR login_name='' "); err != nil {
			return err
		}
	}
	if _, err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_name_nocase ON users(login_name COLLATE NOCASE)"); err != nil {
		return err
	}
	if hasLegacyRole {
		if _, err := db.Exec("ALTER TABLE users DROP COLUMN role"); err != nil {
			return err
		}
	}
	// Raw favicon blobs from an earlier development build are intentionally
	// discarded: FlightDeck now stores only the discovered source URL.
	_, err = db.Exec("DROP TABLE IF EXISTS favicon_cache")
	return err
}
