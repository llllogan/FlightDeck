# FlightDeck

A fresh Go rebuild of the FlightDeck browser launcher. The server embeds and serves the plain HTML, CSS, and JavaScript UI. User, group, tab, environment, and refresh-token data lives in a local [libSQL](https://turso.tech/libsql) database, which is Turso's SQLite-compatible database engine. The libSQL client uses the pure-Go SQLite engine for local `file:` URLs.

## Run locally

The Docker path keeps the database in the named `flightdeck-data` volume:

```sh
cd new
JWT_SECRET="use-a-long-random-value" docker compose up --build
```

Open http://localhost:8080 when using Docker, or http://localhost:8082 when running the Go service directly. Create an account. Stop Docker with `docker compose down`; the database persists. To remove everything deliberately, run `docker compose down -v`.

For a non-container development run, use:

```sh
cd new
JWT_SECRET="use-a-long-random-value" go run ./cmd/flightdeck
```

This creates `new/flightdeck.db`.

## Authentication

- Passwords are stored with bcrypt hashes.
- Access JWTs are httpOnly, same-site cookies and expire after 15 minutes by default.
- Refresh tokens are stored only as hashes, rotate on every refresh, and last 30 days by default.
- Set `COOKIE_SECURE=true` behind HTTPS in production.

FlightDeck caches page URLs and their discovered favicon URLs in the local database. It does not store image bytes; the browser handles normal favicon image caching.

## CCM deployment

The GitHub workflow builds a SHA-tagged GHCR image and submits `deploy/docker-compose.yml` to CCM. Configure a GitHub environment named `flightdeck` with the `JWT_SECRET` secret and a `CCM_URL` variable. Its CCM stack ID is `flightdeck`; add a matching target and stack entry to CCM:

```yaml
stacks:
  flightdeck:
    target: app-host
    deploy_subdir: flightdeck
```

The target Docker host must be able to pull the GHCR image. CCM creates the named `flightdeck-data` Docker volume on that host, so database data persists across container restarts and redeployments.
