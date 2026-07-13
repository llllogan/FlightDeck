// Command migrate imports a FlightDeck "old world" MySQL database into the
// current local libSQL/SQLite schema. It is deliberately a one-time tool.
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/llllogan/flightdeck/internal/schema"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

type legacyUser struct{ id, name, passwordHash, createdAt, updatedAt string }
type legacyGroup struct {
	id, userID, title, createdAt, updatedAt string
	sortOrder                               int
}
type legacyTab struct {
	id, groupID, title, createdAt, updatedAt string
	sortOrder                                int
}
type legacyEnvironment struct {
	id, tabID, name, url, createdAt, updatedAt string
	sortOrder                                  int
}
type legacyData struct {
	users        []legacyUser
	groups       []legacyGroup
	tabs         []legacyTab
	environments []legacyEnvironment
}

func main() {
	defaultSource := os.Getenv("OLD_DATABASE_URL")
	sourceDSN := flag.String("source", defaultSource, "old MySQL DSN (or set OLD_DATABASE_URL)")
	targetURL := flag.String("target", "file:flightdeck.db", "target libSQL/SQLite database URL")
	dryRun := flag.Bool("dry-run", false, "validate and report without writing the target database")
	flag.Parse()
	if *sourceDSN == "" {
		log.Fatal("-source is required (or set OLD_DATABASE_URL)")
	}

	source, err := sql.Open("mysql", *sourceDSN)
	if err != nil {
		log.Fatalf("open old MySQL database: %v", err)
	}
	defer source.Close()
	if err := source.Ping(); err != nil {
		log.Fatalf("connect to old MySQL database: %v", err)
	}
	data, err := readLegacy(source)
	if err != nil {
		log.Fatalf("read old database: %v", err)
	}
	if err := validateLegacy(data); err != nil {
		log.Fatalf("old database cannot be imported safely: %v", err)
	}
	fmt.Printf("Found %d users, %d groups, %d tabs, and %d environments.\n", len(data.users), len(data.groups), len(data.tabs), len(data.environments))
	if *dryRun {
		fmt.Println("Dry run complete. The target database was not changed.")
		return
	}

	target, err := sql.Open("libsql", *targetURL)
	if err != nil {
		log.Fatalf("open target database: %v", err)
	}
	defer target.Close()
	target.SetMaxOpenConns(1)
	if err := target.Ping(); err != nil {
		log.Fatalf("connect to target database: %v", err)
	}
	if err := schema.Ensure(target); err != nil {
		log.Fatalf("prepare target schema: %v", err)
	}
	if err := assertEmpty(target); err != nil {
		log.Fatal(err)
	}
	if err := writeLegacy(target, data); err != nil {
		log.Fatalf("import failed (transaction rolled back): %v", err)
	}
	fmt.Println("Import complete. Old refresh-token sessions were not migrated; users must sign in again.")
}

func readLegacy(db *sql.DB) (legacyData, error) {
	var data legacyData
	rows, err := db.Query(`SELECT id, name, passwordHash, DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%sZ') FROM users ORDER BY createdAt, id`)
	if err != nil {
		return data, err
	}
	for rows.Next() {
		var u legacyUser
		var password sql.NullString
		if err := rows.Scan(&u.id, &u.name, &password, &u.createdAt, &u.updatedAt); err != nil {
			rows.Close()
			return data, err
		}
		u.passwordHash = password.String
		data.users = append(data.users, u)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return data, err
	}
	if err := rows.Close(); err != nil {
		return data, err
	}

	rows, err = db.Query(`SELECT id, userId, title, sortOrder, DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%sZ') FROM tabgroups ORDER BY userId, sortOrder, id`)
	if err != nil {
		return data, err
	}
	for rows.Next() {
		var g legacyGroup
		if err := rows.Scan(&g.id, &g.userID, &g.title, &g.sortOrder, &g.createdAt, &g.updatedAt); err != nil {
			rows.Close()
			return data, err
		}
		data.groups = append(data.groups, g)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return data, err
	}
	if err := rows.Close(); err != nil {
		return data, err
	}

	rows, err = db.Query(`SELECT id, tabGroupId, title, sortOrder, DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%sZ') FROM tabs ORDER BY tabGroupId, sortOrder, id`)
	if err != nil {
		return data, err
	}
	for rows.Next() {
		var t legacyTab
		if err := rows.Scan(&t.id, &t.groupID, &t.title, &t.sortOrder, &t.createdAt, &t.updatedAt); err != nil {
			rows.Close()
			return data, err
		}
		data.tabs = append(data.tabs, t)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return data, err
	}
	if err := rows.Close(); err != nil {
		return data, err
	}

	rows, err = db.Query(`SELECT id, tabId, name, url, DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%sZ') FROM environments ORDER BY tabId, createdAt, id`)
	if err != nil {
		return data, err
	}
	order := map[string]int{}
	for rows.Next() {
		var e legacyEnvironment
		if err := rows.Scan(&e.id, &e.tabID, &e.name, &e.url, &e.createdAt, &e.updatedAt); err != nil {
			rows.Close()
			return data, err
		}
		e.sortOrder = order[e.tabID]
		order[e.tabID]++
		data.environments = append(data.environments, e)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return data, err
	}
	if err := rows.Close(); err != nil {
		return data, err
	}
	return data, nil
}

func validateLegacy(data legacyData) error {
	userIDs, names := map[string]bool{}, map[string]bool{}
	for _, u := range data.users {
		if u.id == "" || strings.TrimSpace(u.name) == "" || u.passwordHash == "" {
			return fmt.Errorf("user %q is missing an id, username, or password hash", u.id)
		}
		key := strings.ToLower(strings.TrimSpace(u.name))
		if names[key] {
			return fmt.Errorf("username %q occurs more than once", u.name)
		}
		names[key] = true
		userIDs[u.id] = true
	}
	groupIDs := map[string]bool{}
	for _, g := range data.groups {
		if !userIDs[g.userID] {
			return fmt.Errorf("group %q references missing user %q", g.id, g.userID)
		}
		groupIDs[g.id] = true
	}
	tabIDs := map[string]bool{}
	for _, t := range data.tabs {
		if !groupIDs[t.groupID] {
			return fmt.Errorf("tab %q references missing group %q", t.id, t.groupID)
		}
		tabIDs[t.id] = true
	}
	for _, e := range data.environments {
		if !tabIDs[e.tabID] {
			return fmt.Errorf("environment %q references missing tab %q", e.id, e.tabID)
		}
	}
	return nil
}

func assertEmpty(db *sql.DB) error {
	for _, table := range []string{"users", "tab_groups", "tabs", "environments"} {
		var n int
		if err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&n); err != nil {
			return err
		}
		if n != 0 {
			return fmt.Errorf("target database is not empty (%s has %d rows); import into a fresh database or volume", table, n)
		}
	}
	return nil
}

func writeLegacy(db *sql.DB, data legacyData) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, u := range data.users {
		email := u.id + "@migrated.flightdeck.invalid"
		if _, err := tx.Exec(`INSERT INTO users (id,name,email,login_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`, u.id, u.name, email, u.name, u.passwordHash, u.createdAt, u.updatedAt); err != nil {
			return err
		}
	}
	for _, g := range data.groups {
		if _, err := tx.Exec(`INSERT INTO tab_groups (id,user_id,title,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?)`, g.id, g.userID, g.title, g.sortOrder, g.createdAt, g.updatedAt); err != nil {
			return err
		}
	}
	for _, t := range data.tabs {
		if _, err := tx.Exec(`INSERT INTO tabs (id,group_id,title,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?)`, t.id, t.groupID, t.title, t.sortOrder, t.createdAt, t.updatedAt); err != nil {
			return err
		}
	}
	for _, e := range data.environments {
		if _, err := tx.Exec(`INSERT INTO environments (id,tab_id,name,url,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`, e.id, e.tabID, e.name, e.url, e.sortOrder, e.createdAt, e.updatedAt); err != nil {
			return err
		}
	}
	return tx.Commit()
}
