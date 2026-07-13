// Command reset-password sets a FlightDeck user's bcrypt password hash in a
// local libSQL/SQLite database. It is intended for recovery on the Docker host.
package main

import (
	"bufio"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

func main() {
	databaseURL := flag.String("database", "file:flightdeck.db", "local libSQL/SQLite database URL")
	username := flag.String("username", "", "username to reset")
	password := flag.String("password", "", "new password (prefer -password-stdin instead)")
	passwordStdin := flag.Bool("password-stdin", false, "read the new password from standard input")
	flag.Parse()
	if strings.TrimSpace(*username) == "" {
		log.Fatal("-username is required")
	}
	if *passwordStdin == (*password != "") {
		log.Fatal("provide exactly one of -password or -password-stdin")
	}
	newPassword := *password
	if *passwordStdin {
		line, err := bufio.NewReader(os.Stdin).ReadString('\n')
		if err != nil && len(line) == 0 {
			log.Fatalf("read password: %v", err)
		}
		newPassword = strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
	}
	if len(newPassword) < 6 {
		log.Fatal("password must contain at least 6 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}
	db, err := sql.Open("libsql", *databaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	result, err := db.Exec(`UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE login_name = ? COLLATE NOCASE`, string(hash), strings.TrimSpace(*username))
	if err != nil {
		log.Fatalf("update password: %v", err)
	}
	updated, _ := result.RowsAffected()
	if updated != 1 {
		log.Fatalf("found %d users named %q", updated, *username)
	}
	fmt.Printf("Password reset for %s.\n", strings.TrimSpace(*username))
}
