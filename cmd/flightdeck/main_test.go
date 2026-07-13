package main

import (
	"bytes"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

func TestMoveTabChangesSortOrder(t *testing.T) {
	db, err := sql.Open("libsql", "file:"+filepath.Join(t.TempDir(), "flightdeck.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if err := migrate(db); err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO users (id,name,email,login_name,password_hash) VALUES ('user','User','user@example.test','user','hash');
		INSERT INTO tab_groups (id,user_id,title,sort_order) VALUES ('group','user','Group',0);
		INSERT INTO tabs (id,group_id,title,sort_order) VALUES ('first','group','First',0),('second','group','Second',1)`)
	if err != nil {
		t.Fatal(err)
	}

	a := &app{db: db}
	request := httptest.NewRequest(http.MethodPost, "/api/tabs/second/move", bytes.NewBufferString(`{"direction":"up"}`))
	request.SetPathValue("id", "second")
	response := httptest.NewRecorder()
	a.moveTab(response, request, user{ID: "user"})
	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}

	var first, second int
	if err := db.QueryRow("SELECT sort_order FROM tabs WHERE id='first'").Scan(&first); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow("SELECT sort_order FROM tabs WHERE id='second'").Scan(&second); err != nil {
		t.Fatal(err)
	}
	if first != 1 || second != 0 {
		t.Fatalf("sort orders = first:%d second:%d; want first:1 second:0", first, second)
	}
}

func TestUpdateGroupUsesCurrentUserOwnership(t *testing.T) {
	db, err := sql.Open("libsql", "file:"+filepath.Join(t.TempDir(), "flightdeck.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if err := migrate(db); err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO users (id,name,email,login_name,password_hash) VALUES ('user','User','user@example.test','user','hash');
		INSERT INTO tab_groups (id,user_id,title,sort_order) VALUES ('group','user','Original',0)`)
	if err != nil {
		t.Fatal(err)
	}

	a := &app{db: db}
	request := httptest.NewRequest(http.MethodPut, "/api/groups/group", bytes.NewBufferString(`{"title":"Renamed"}`))
	request.SetPathValue("id", "group")
	response := httptest.NewRecorder()
	a.updateGroup(response, request, user{ID: "user"})
	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var title string
	if err := db.QueryRow("SELECT title FROM tab_groups WHERE id='group'").Scan(&title); err != nil {
		t.Fatal(err)
	}
	if title != "Renamed" {
		t.Fatalf("title = %q, want Renamed", title)
	}
}

func TestLoginAcceptsMigratedUsername(t *testing.T) {
	db, err := sql.Open("libsql", "file:"+filepath.Join(t.TempDir(), "flightdeck.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if err := migrate(db); err != nil {
		t.Fatal(err)
	}
	hash, err := hashPassword("a-long-password")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users (id,name,email,login_name,password_hash) VALUES ('old-user','Logan','old-user@migrated.flightdeck.invalid','Logan',?)`, hash); err != nil {
		t.Fatal(err)
	}
	a := &app{db: db, jwtSecret: []byte("test-secret"), accessTTL: time.Minute, refreshTTL: time.Hour}
	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(`{"identifier":"logan","password":"a-long-password"}`))
	response := httptest.NewRecorder()
	a.login(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(response.Result().Cookies()) != 2 {
		t.Fatalf("cookies = %d, want access and refresh cookies", len(response.Result().Cookies()))
	}
}
