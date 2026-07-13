# FlightDeck

A fresh Go rebuild of the FlightDeck browser launcher. The server embeds and serves the plain HTML, CSS, and JavaScript UI. User, group, tab, environment, and refresh-token data lives in a local [libSQL](https://turso.tech/libsql) database, which is Turso's SQLite-compatible database engine. The libSQL client uses the pure-Go SQLite engine for local `file:` URLs.

## Run locally

The Docker path keeps the database in the named `flightdeck-data` volume:

```sh
JWT_SECRET="use-a-long-random-value" docker compose up --build
```

Open http://localhost:8082 when using Docker. A directly run Go service listens on http://localhost:8080 by default. Create an account. Stop Docker with `docker compose down`; the database persists. To remove everything deliberately, run `docker compose down -v`.

For a non-container development run, use:

```sh
JWT_SECRET="use-a-long-random-value" go run ./cmd/flightdeck
```

This creates `flightdeck.db`.

## Authentication

- Passwords are stored with bcrypt hashes.
- Access JWTs are httpOnly, same-site cookies and expire after 15 minutes by default.
- Refresh tokens are stored only as hashes, rotate on every refresh, and last 30 days by default.
- Set `COOKIE_SECURE=true` behind HTTPS in production.

FlightDeck caches page URLs and their discovered favicon URLs in the local database. It does not store image bytes; the browser handles normal favicon image caching.

## Import the old database

The one-time importer copies old MySQL users, tab groups, tabs, and environments into a fresh FlightDeck database. It preserves each old user's bcrypt password hash and username, so they can sign in using their existing username and password. It intentionally does not copy old refresh-token sessions.

First run a read-only validation. Supply a normal MySQL DSN (for example `user:password@tcp(host:3306)/flightdeck`) either directly or through `OLD_DATABASE_URL`:

```sh
go run ./cmd/migrate -source "$OLD_DATABASE_URL" -target "file:flightdeck.db" -dry-run
```

Then import into a fresh, empty target database:

```sh
go run ./cmd/migrate -source "$OLD_DATABASE_URL" -target "file:flightdeck.db"
```

The import refuses to merge into a non-empty database. Back up the old MySQL database and the target volume first.

The production image also contains the importer. Once it is built, run it against the stopped CCM volume (replace `<flightdeck-volume>` with the exact result from `docker volume ls`):

```sh
docker run --rm \
  -v <flightdeck-volume>:/data \
  --entrypoint migrate \
  ghcr.io/<owner>/flightdeck:<sha> \
  -source "$OLD_DATABASE_URL" \
  -target "file:/data/flightdeck.db"
```

Then start or redeploy FlightDeck normally. If the old MySQL server is reachable only through the Docker host's loopback address, add `--network host` on Linux.

## Reset a password

With FlightDeck stopped, the production image can reset a user's password in the persistent volume. This reads the new password from the terminal rather than shell history:

```sh
read -rs NEW_PASSWORD; echo
printf '%s\n' "$NEW_PASSWORD" | docker run --rm -i \
  -v <flightdeck-volume>:/data \
  --entrypoint reset-password \
  ghcr.io/<owner>/flightdeck:<sha> \
  -database 'file:/data/flightdeck.db' \
  -username 'USERNAME' \
  -password-stdin
unset NEW_PASSWORD
```


## CCM deployment

The GitHub workflow builds a SHA-tagged GHCR image and submits `deploy/docker-compose.yml` to CCM. Configure a GitHub environment named `flightdeck` with the `JWT_SECRET` secret and a `CCM_URL` variable. Its CCM stack ID is `flightdeck`; add a matching target and stack entry to CCM:

```yaml
stacks:
  flightdeck:
    target: app-host
    deploy_subdir: flightdeck
```

The target Docker host must be able to pull the GHCR image. CCM creates the named `flightdeck-data` Docker volume on that host, so database data persists across container restarts and redeployments.
