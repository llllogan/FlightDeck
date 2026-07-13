package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/llllogan/flightdeck/internal/schema"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite" // Provides the local SQLite engine used by libSQL for file: URLs.
)

//go:embed web/*
var webFiles embed.FS

const (
	accessCookie  = "flightdeck_access"
	refreshCookie = "flightdeck_refresh"
)

type app struct {
	db            *sql.DB
	jwtSecret     []byte
	secureCookies bool
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

type user struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
type environment struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	URL       string `json:"url"`
	SortOrder int    `json:"sortOrder"`
}
type tab struct {
	ID           string        `json:"id"`
	Title        string        `json:"title"`
	SortOrder    int           `json:"sortOrder"`
	Environments []environment `json:"environments"`
}
type group struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	SortOrder int    `json:"sortOrder"`
	Tabs      []tab  `json:"tabs"`
}

func main() {
	db, err := sql.Open("libsql", env("DATABASE_URL", "file:flightdeck.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	// SQLite foreign-key enforcement is connection-local. One shared connection also
	// keeps the embedded, local launcher database pleasantly small and predictable.
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		log.Fatalf("database connection: %v", err)
	}
	if err := migrate(db); err != nil {
		log.Fatalf("database setup: %v", err)
	}

	secret := env("JWT_SECRET", "change-me-before-production")
	if secret == "change-me-before-production" {
		log.Print("WARNING: using development JWT_SECRET")
	}
	a := &app{db: db, jwtSecret: []byte(secret), secureCookies: env("COOKIE_SECURE", "false") == "true", accessTTL: durationEnv("JWT_ACCESS_TTL", 15*time.Minute), refreshTTL: durationEnv("JWT_REFRESH_TTL", 30*24*time.Hour)}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.HandleFunc("POST /api/auth/signup", a.signup)
	mux.HandleFunc("POST /api/auth/login", a.login)
	mux.HandleFunc("POST /api/auth/refresh", a.refresh)
	mux.HandleFunc("POST /api/auth/logout", a.logout)
	mux.HandleFunc("GET /api/auth/me", a.requireAuth(a.me))
	mux.HandleFunc("GET /api/workspace", a.requireAuth(a.workspace))
	mux.HandleFunc("GET /api/search", a.requireAuth(a.search))
	mux.HandleFunc("GET /api/favicon", a.requireAuth(a.favicon))
	mux.HandleFunc("POST /api/groups", a.requireAuth(a.createGroup))
	mux.HandleFunc("PUT /api/groups/{id}", a.requireAuth(a.updateGroup))
	mux.HandleFunc("DELETE /api/groups/{id}", a.requireAuth(a.deleteGroup))
	mux.HandleFunc("POST /api/groups/{id}/move", a.requireAuth(a.moveGroup))
	mux.HandleFunc("POST /api/groups/{id}/tabs", a.requireAuth(a.createTab))
	mux.HandleFunc("PUT /api/tabs/{id}", a.requireAuth(a.updateTab))
	mux.HandleFunc("DELETE /api/tabs/{id}", a.requireAuth(a.deleteTab))
	mux.HandleFunc("POST /api/tabs/{id}/move", a.requireAuth(a.moveTab))
	static, _ := fs.Sub(webFiles, "web")
	mux.Handle("/", http.FileServer(http.FS(static)))
	addr := env("ADDR", ":8080")
	log.Printf("FlightDeck listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, securityHeaders(mux)))
}

func (a *app) health(w http.ResponseWriter, _ *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "same-origin")
		next.ServeHTTP(w, r)
	})
}

func (a *app) signup(w http.ResponseWriter, r *http.Request) {
	var in struct{ Name, Email, Password string }
	if !decode(w, r, &in) {
		return
	}
	in.Name, in.Email = clean(in.Name, 100), strings.ToLower(clean(in.Email, 254))
	if in.Name == "" || !strings.Contains(in.Email, "@") || len(in.Password) < 6 {
		errorResponse(w, 400, "Name, a valid email, and a password of at least 6 characters are required.")
		return
	}
	hash, err := hashPassword(in.Password)
	if err != nil {
		errorResponse(w, 500, "Could not create account.")
		return
	}
	u := user{ID: newID(), Name: in.Name, Email: in.Email}
	_, err = a.db.Exec("INSERT INTO users (id,name,email,login_name,password_hash) VALUES (?,?,?,?,?)", u.ID, u.Name, u.Email, u.Name, hash)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			errorResponse(w, 409, "That email or username is already registered.")
		} else {
			errorResponse(w, 500, "Could not create account.")
		}
		return
	}
	a.startSession(w, u)
	jsonResponse(w, 201, map[string]user{"user": u})
}
func (a *app) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Identifier, Email, Password string }
	if !decode(w, r, &in) {
		return
	}
	in.Identifier = strings.ToLower(clean(in.Identifier, 254))
	if in.Identifier == "" { // Accept requests made by the previous email-only UI.
		in.Identifier = strings.ToLower(clean(in.Email, 254))
	}
	var u user
	var hash string
	err := a.db.QueryRow("SELECT id,name,email,password_hash FROM users WHERE email = ? COLLATE NOCASE OR login_name = ? COLLATE NOCASE LIMIT 1", in.Identifier, in.Identifier).Scan(&u.ID, &u.Name, &u.Email, &hash)
	if err != nil || !checkPassword(hash, in.Password) {
		errorResponse(w, 401, "Username, email, or password is incorrect.")
		return
	}
	a.startSession(w, u)
	jsonResponse(w, 200, map[string]user{"user": u})
}
func (a *app) refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		errorResponse(w, 401, "Your session has expired.")
		return
	}
	var u user
	var expires string
	err = a.db.QueryRow(`SELECT u.id,u.name,u.email,rt.expires_at FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token_hash=?`, tokenHash(c.Value)).Scan(&u.ID, &u.Name, &u.Email, &expires)
	if err != nil || expired(expires) {
		if err == nil {
			_, _ = a.db.Exec("DELETE FROM refresh_tokens WHERE token_hash=?", tokenHash(c.Value))
		}
		errorResponse(w, 401, "Your session has expired.")
		return
	}
	_, _ = a.db.Exec("DELETE FROM refresh_tokens WHERE token_hash=?", tokenHash(c.Value))
	a.startSession(w, u)
	jsonResponse(w, 200, map[string]user{"user": u})
}
func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(refreshCookie); err == nil {
		_, _ = a.db.Exec("DELETE FROM refresh_tokens WHERE token_hash=?", tokenHash(c.Value))
	}
	a.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}
func (a *app) me(w http.ResponseWriter, r *http.Request, u user) {
	jsonResponse(w, 200, map[string]user{"user": u})
}

func (a *app) startSession(w http.ResponseWriter, u user) {
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": u.ID, "exp": time.Now().Add(a.accessTTL).Unix()}).SignedString(a.jwtSecret)
	if err != nil {
		panic(err)
	}
	refresh := randomToken()
	_, err = a.db.Exec("INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)", newID(), u.ID, tokenHash(refresh), time.Now().Add(a.refreshTTL).UTC().Format(time.RFC3339))
	if err != nil {
		panic(err)
	}
	http.SetCookie(w, &http.Cookie{Name: accessCookie, Value: access, Path: "/", MaxAge: int(a.accessTTL.Seconds()), HttpOnly: true, Secure: a.secureCookies, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: refreshCookie, Value: refresh, Path: "/api/auth", MaxAge: int(a.refreshTTL.Seconds()), HttpOnly: true, Secure: a.secureCookies, SameSite: http.SameSiteLaxMode})
}
func (a *app) clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: accessCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: a.secureCookies, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: refreshCookie, Value: "", Path: "/api/auth", MaxAge: -1, HttpOnly: true, Secure: a.secureCookies, SameSite: http.SameSiteLaxMode})
}
func (a *app) requireAuth(next func(http.ResponseWriter, *http.Request, user)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(accessCookie)
		if err != nil {
			errorResponse(w, 401, "Authentication required.")
			return
		}
		token, err := jwt.Parse(c.Value, func(t *jwt.Token) (any, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}
			return a.jwtSecret, nil
		})
		if err != nil || !token.Valid {
			errorResponse(w, 401, "Authentication required.")
			return
		}
		claims := token.Claims.(jwt.MapClaims)
		id, _ := claims.GetSubject()
		var u user
		err = a.db.QueryRow("SELECT id,name,email FROM users WHERE id=?", id).Scan(&u.ID, &u.Name, &u.Email)
		if err != nil {
			errorResponse(w, 401, "Authentication required.")
			return
		}
		next(w, r, u)
	}
}
func (a *app) workspace(w http.ResponseWriter, _ *http.Request, u user) {
	groups, err := a.groupsForUser(u.ID)
	if err != nil {
		errorResponse(w, 500, "Could not load workspace.")
		return
	}
	jsonResponse(w, 200, map[string]any{"groups": groups})
}

var (
	linkTagPattern   = regexp.MustCompile(`(?is)<link\b[^>]*>`)
	attributePattern = regexp.MustCompile(`(?is)([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`)
)

func (a *app) favicon(w http.ResponseWriter, r *http.Request, _ user) {
	target := cleanURL(r.URL.Query().Get("url"))
	if target == "" {
		http.NotFound(w, r)
		return
	}
	var iconURL string
	cacheStatus := "hit"
	err := a.db.QueryRow("SELECT favicon_url FROM favicon_sources WHERE page_url=?", target).Scan(&iconURL)
	if err == sql.ErrNoRows {
		cacheStatus = "discovered"
		log.Printf("favicon cache miss: discovering icon for %s", target)
		iconURL, err = discoverPageFavicon(target)
		if err == nil {
			_, _ = a.db.Exec(`INSERT INTO favicon_sources (page_url,favicon_url,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(page_url) DO UPDATE SET favicon_url=excluded.favicon_url,updated_at=CURRENT_TIMESTAMP`, target, iconURL)
			log.Printf("favicon discovered: %s -> %s", target, iconURL)
		}
	}
	if err != nil || iconURL == "" {
		log.Printf("favicon discovery failed for %s: %v", target, err)
		http.NotFound(w, r)
		return
	}
	if cacheStatus == "hit" {
		log.Printf("favicon cache hit: %s -> %s", target, iconURL)
	}
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.Header().Set("X-FlightDeck-Favicon-Cache", cacheStatus)
	http.Redirect(w, r, iconURL, http.StatusFound)
}

func discoverPageFavicon(rawURL string) (string, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	pageResponse, err := client.Get(rawURL)
	if err != nil {
		return "", err
	}
	defer pageResponse.Body.Close()
	if pageResponse.StatusCode < 200 || pageResponse.StatusCode >= 300 {
		return "", fmt.Errorf("page returned HTTP %d", pageResponse.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(pageResponse.Body, 1<<20))
	if err != nil {
		return "", err
	}
	return findPageIcon(pageResponse.Request.URL, string(body)).String(), nil
}

func findPageIcon(pageURL *url.URL, document string) *url.URL {
	for _, tag := range linkTagPattern.FindAllString(document, -1) {
		attrs := map[string]string{}
		for _, match := range attributePattern.FindAllStringSubmatch(tag, -1) {
			value := match[2]
			if value == "" {
				value = match[3]
			}
			if value == "" {
				value = match[4]
			}
			attrs[strings.ToLower(match[1])] = value
		}
		rel := " " + strings.ToLower(attrs["rel"]) + " "
		href := attrs["href"]
		if href != "" && strings.Contains(rel, "icon") {
			if candidate, err := pageURL.Parse(href); err == nil && (candidate.Scheme == "http" || candidate.Scheme == "https") {
				return candidate
			}
		}
	}
	return pageURL.ResolveReference(&url.URL{Path: "/favicon.ico"})
}

func (a *app) groupsForUser(userID string) ([]group, error) {
	rows, err := a.db.Query(`SELECT g.id,g.title,g.sort_order,t.id,t.title,t.sort_order,e.id,e.name,e.url,e.sort_order FROM tab_groups g LEFT JOIN tabs t ON t.group_id=g.id LEFT JOIN environments e ON e.tab_id=t.id WHERE g.user_id=? ORDER BY g.sort_order,t.sort_order,e.sort_order`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := []group{}
	gm := map[string]*group{}
	tm := map[string]*tab{}
	for rows.Next() {
		var gid, gtitle string
		var gs int
		var tid, ttitle, eid, ename, eurl sql.NullString
		var ts, es sql.NullInt64
		if err := rows.Scan(&gid, &gtitle, &gs, &tid, &ttitle, &ts, &eid, &ename, &eurl, &es); err != nil {
			return nil, err
		}
		g := gm[gid]
		if g == nil {
			groups = append(groups, group{ID: gid, Title: gtitle, SortOrder: gs, Tabs: []tab{}})
			g = &groups[len(groups)-1]
			gm[gid] = g
		}
		if tid.Valid {
			t := tm[tid.String]
			if t == nil {
				g.Tabs = append(g.Tabs, tab{ID: tid.String, Title: ttitle.String, SortOrder: int(ts.Int64), Environments: []environment{}})
				t = &g.Tabs[len(g.Tabs)-1]
				tm[tid.String] = t
			}
			if eid.Valid {
				t.Environments = append(t.Environments, environment{ID: eid.String, Name: ename.String, URL: eurl.String, SortOrder: int(es.Int64)})
			}
		}
	}
	return groups, rows.Err()
}
func (a *app) search(w http.ResponseWriter, r *http.Request, u user) {
	q := clean(r.URL.Query().Get("q"), 200)
	if q == "" {
		jsonResponse(w, 200, map[string]any{"tabs": []tab{}})
		return
	}
	rows, err := a.db.Query(`SELECT t.id,t.title,t.sort_order,e.id,e.name,e.url,e.sort_order FROM tabs t JOIN tab_groups g ON g.id=t.group_id LEFT JOIN environments e ON e.tab_id=t.id WHERE g.user_id=? AND (lower(t.title) LIKE lower(?) OR lower(e.url) LIKE lower(?)) ORDER BY t.sort_order,e.sort_order`, u.ID, "%"+q+"%", "%"+q+"%")
	if err != nil {
		errorResponse(w, 500, "Could not search tabs.")
		return
	}
	defer rows.Close()
	m := map[string]*tab{}
	out := []tab{}
	for rows.Next() {
		var id, title string
		var so int
		var eid, n, url sql.NullString
		var eo sql.NullInt64
		_ = rows.Scan(&id, &title, &so, &eid, &n, &url, &eo)
		t := m[id]
		if t == nil {
			out = append(out, tab{ID: id, Title: title, SortOrder: so, Environments: []environment{}})
			t = &out[len(out)-1]
			m[id] = t
		}
		if eid.Valid {
			t.Environments = append(t.Environments, environment{ID: eid.String, Name: n.String, URL: url.String, SortOrder: int(eo.Int64)})
		}
	}
	jsonResponse(w, 200, map[string]any{"tabs": out})
}

func (a *app) createGroup(w http.ResponseWriter, r *http.Request, u user) {
	var in struct{ Title string }
	if !decode(w, r, &in) {
		return
	}
	in.Title = clean(in.Title, 120)
	if in.Title == "" {
		errorResponse(w, 400, "A group title is required.")
		return
	}
	var n int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM tab_groups WHERE user_id=?", u.ID).Scan(&n)
	g := group{ID: newID(), Title: in.Title, SortOrder: n, Tabs: []tab{}}
	_, err := a.db.Exec("INSERT INTO tab_groups (id,user_id,title,sort_order) VALUES (?,?,?,?)", g.ID, u.ID, g.Title, g.SortOrder)
	if err != nil {
		errorResponse(w, 500, "Could not create group.")
		return
	}
	jsonResponse(w, 201, g)
}
func (a *app) updateGroup(w http.ResponseWriter, r *http.Request, u user) {
	var in struct{ Title string }
	if !decode(w, r, &in) {
		return
	}
	in.Title = clean(in.Title, 120)
	res, err := a.db.Exec("UPDATE tab_groups SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?", in.Title, pathValue(r), u.ID)
	if err != nil || affected(res) == 0 {
		errorResponse(w, 404, "Group not found.")
		return
	}
	w.WriteHeader(204)
}
func (a *app) deleteGroup(w http.ResponseWriter, r *http.Request, u user) {
	res, err := a.db.Exec("DELETE FROM tab_groups WHERE id=? AND user_id=?", pathValue(r), u.ID)
	if err != nil || affected(res) == 0 {
		errorResponse(w, 404, "Group not found.")
		return
	}
	w.WriteHeader(204)
}
func (a *app) moveGroup(w http.ResponseWriter, r *http.Request, u user) {
	a.move(w, r, u, "tab_groups", "user_id", "group_id")
}
func (a *app) moveTab(w http.ResponseWriter, r *http.Request, u user) {
	a.move(w, r, u, "tabs", "group_id", "")
}
func (a *app) move(w http.ResponseWriter, r *http.Request, u user, table, ownerCol, ignore string) {
	var in struct{ Direction string }
	if !decode(w, r, &in) {
		return
	}
	id := pathValue(r)
	ctx := context.Background()
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		errorResponse(w, 500, "Could not reorder.")
		return
	}
	defer tx.Rollback()
	var owner string
	q := fmt.Sprintf("SELECT %s FROM %s WHERE id=?", ownerCol, table)
	if err = tx.QueryRow(q, id).Scan(&owner); err != nil {
		errorResponse(w, 404, "Item not found.")
		return
	}
	if table == "tab_groups" && owner != u.ID {
		errorResponse(w, 404, "Item not found.")
		return
	}
	var current int
	_ = tx.QueryRow(fmt.Sprintf("SELECT sort_order FROM %s WHERE id=?", table), id).Scan(&current)
	cmp, order := "<", "DESC"
	if in.Direction == "down" {
		cmp, order = ">", "ASC"
	}
	var other string
	q = fmt.Sprintf("SELECT id FROM %s WHERE %s=? AND sort_order %s ? ORDER BY sort_order %s LIMIT 1", table, ownerCol, cmp, order)
	err = tx.QueryRow(q, owner, current).Scan(&other)
	if err == sql.ErrNoRows {
		w.WriteHeader(204)
		return
	}
	if err != nil {
		errorResponse(w, 500, "Could not reorder.")
		return
	}
	var otherOrder int
	if err = tx.QueryRow(fmt.Sprintf("SELECT sort_order FROM %s WHERE id=?", table), other).Scan(&otherOrder); err != nil {
		errorResponse(w, 500, "Could not reorder.")
		return
	}
	_, err = tx.Exec(fmt.Sprintf("UPDATE %s SET sort_order=CASE id WHEN ? THEN ? WHEN ? THEN ? END WHERE id IN (?,?)", table), id, otherOrder, other, current, id, other)
	if err != nil {
		errorResponse(w, 500, "Could not reorder.")
		return
	}
	if err = tx.Commit(); err != nil {
		errorResponse(w, 500, "Could not reorder.")
		return
	}
	w.WriteHeader(204)
}

type tabInput struct {
	Title        string `json:"title"`
	Environments []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"environments"`
}

func (a *app) createTab(w http.ResponseWriter, r *http.Request, u user) {
	var in tabInput
	if !decode(w, r, &in) {
		return
	}
	gid := pathValue(r)
	if !a.groupOwned(gid, u.ID) {
		errorResponse(w, 404, "Group not found.")
		return
	}
	if !validTabInput(in) {
		errorResponse(w, 400, "A title and at least one valid environment are required.")
		return
	}
	var n int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM tabs WHERE group_id=?", gid).Scan(&n)
	tid := newID()
	tx, _ := a.db.Begin()
	defer tx.Rollback()
	_, err := tx.Exec("INSERT INTO tabs (id,group_id,title,sort_order) VALUES (?,?,?,?)", tid, gid, clean(in.Title, 120), n)
	if err == nil {
		err = a.saveEnvironments(tx, tid, in)
	}
	if err != nil || tx.Commit() != nil {
		errorResponse(w, 500, "Could not save tab.")
		return
	}
	w.WriteHeader(201)
}
func (a *app) updateTab(w http.ResponseWriter, r *http.Request, u user) {
	var in tabInput
	if !decode(w, r, &in) {
		return
	}
	tid := pathValue(r)
	if !a.tabOwned(tid, u.ID) {
		errorResponse(w, 404, "Tab not found.")
		return
	}
	if !validTabInput(in) {
		errorResponse(w, 400, "A title and at least one valid environment are required.")
		return
	}
	tx, _ := a.db.Begin()
	defer tx.Rollback()
	_, err := tx.Exec("UPDATE tabs SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", clean(in.Title, 120), tid)
	if err == nil {
		_, err = tx.Exec("DELETE FROM environments WHERE tab_id=?", tid)
	}
	if err == nil {
		err = a.saveEnvironments(tx, tid, in)
	}
	if err != nil || tx.Commit() != nil {
		errorResponse(w, 500, "Could not save tab.")
		return
	}
	w.WriteHeader(204)
}
func (a *app) deleteTab(w http.ResponseWriter, r *http.Request, u user) {
	res, err := a.db.Exec("DELETE FROM tabs WHERE id=? AND group_id IN (SELECT id FROM tab_groups WHERE user_id=?)", pathValue(r), u.ID)
	if err != nil || affected(res) == 0 {
		errorResponse(w, 404, "Tab not found.")
		return
	}
	w.WriteHeader(204)
}
func (a *app) saveEnvironments(tx *sql.Tx, tid string, in tabInput) error {
	for i, e := range in.Environments {
		_, err := tx.Exec("INSERT INTO environments (id,tab_id,name,url,sort_order) VALUES (?,?,?,?,?)", newID(), tid, clean(e.Name, 80), cleanURL(e.URL), i)
		if err != nil {
			return err
		}
	}
	return nil
}
func validTabInput(in tabInput) bool {
	if clean(in.Title, 120) == "" || len(in.Environments) == 0 {
		return false
	}
	for _, e := range in.Environments {
		if clean(e.Name, 80) == "" || cleanURL(e.URL) == "" {
			return false
		}
	}
	return true
}
func (a *app) groupOwned(id, userID string) bool {
	var n int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM tab_groups WHERE id=? AND user_id=?", id, userID).Scan(&n)
	return n == 1
}
func (a *app) tabOwned(id, userID string) bool {
	var n int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM tabs t JOIN tab_groups g ON g.id=t.group_id WHERE t.id=? AND g.user_id=?", id, userID).Scan(&n)
	return n == 1
}
func migrate(db *sql.DB) error {
	return schema.Ensure(db)
}
func hashPassword(v string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(v), bcrypt.DefaultCost)
	return string(hash), err
}
func checkPassword(hash, password string) bool {
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil {
		return true
	}
	// The old Node service trimmed passwords and removed ASCII control
	// characters before hashing/comparing. Try that legacy normalization only
	// as a fallback, so passwords created by this Go service remain exact.
	legacy := legacyPassword(password)
	return legacy != password && bcrypt.CompareHashAndPassword([]byte(hash), []byte(legacy)) == nil
}
func legacyPassword(v string) string {
	v = strings.Map(func(r rune) rune {
		if r <= 8 || r == 11 || r == 12 || (r >= 14 && r <= 31) || r == 127 {
			return -1
		}
		return r
	}, v)
	v = strings.TrimSpace(v)
	if len(v) > 128 {
		return v[:128]
	}
	return v
}
func randomToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func newID() string             { return randomToken()[:32] }
func tokenHash(t string) string { h := sha256.Sum256([]byte(t)); return hex.EncodeToString(h[:]) }
func clean(v string, max int) string {
	v = strings.TrimSpace(v)
	if len(v) > max {
		v = v[:max]
	}
	return v
}
func cleanURL(v string) string {
	v = clean(v, 2048)
	if v == "" {
		return ""
	}
	if !strings.Contains(v, "://") {
		v = "https://" + v
	}
	u, err := url.ParseRequestURI(v)
	if err != nil || u.Scheme != "http" && u.Scheme != "https" || u.Host == "" {
		return ""
	}
	return u.String()
}
func expired(v string) bool {
	t, e := time.Parse(time.RFC3339, v)
	return e != nil || time.Now().After(t)
}
func durationEnv(k string, fallback time.Duration) time.Duration {
	v := os.Getenv(k)
	if v == "" {
		return fallback
	}
	d, e := time.ParseDuration(v)
	if e != nil {
		return fallback
	}
	return d
}
func env(k, f string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return f
}
func pathValue(r *http.Request) string {
	return r.PathValue("id")
}
func affected(r sql.Result) int64 { n, _ := r.RowsAffected(); return n }
func decode(w http.ResponseWriter, r *http.Request, target any) bool {
	de := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	de.DisallowUnknownFields()
	if err := de.Decode(target); err != nil {
		errorResponse(w, 400, "Invalid request body.")
		return false
	}
	return true
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func errorResponse(w http.ResponseWriter, status int, msg string) {
	jsonResponse(w, status, map[string]string{"error": msg})
}

var _ = sort.Strings
