# Repository Guidelines

## Project Structure & Module Organization
- `Site/` contains the Angular 18 SPA; feature modules live under `src/app`, environment settings in `src/environments`, and shared assets in `src/assets`.
- `API/` is an Express + TypeScript service; endpoints are organised by feature via `src/routes`, `src/controllers`, and `src/services`, with shared utilities in `src/utils` and DB access in `src/db`.
- `DB/` tracks schema artefacts; use `prisma/schema.prisma` for modelling and `sql/` for stored procedures and seed views.
- Docker build contexts live beside each app (`Site/Dockerfile`, `API/Dockerfile`); `docker-compose.yaml` in `Site/` wires the SPA to the API for local containers.

## Build, Test, and Development Commands
- Frontend: `cd Site && npm install` to bootstrap, `npm run watch` for the live dev server at `http://localhost:4200`, `npm run build` for production bundles, and `npm start` to serve the compiled dist folder.
- API: `cd API && npm install`, `npm run dev` launches the TypeScript server with hot reload, `npm run build` emits JS to `dist/`, and `npm start` runs the compiled server.
- Database: run Prisma tools such as `npx prisma migrate dev` from `DB/` and apply SQL helpers in `DB/sql/` as needed.

## Coding Style & Naming Conventions
- Maintain 2-space indentation and TypeScript strictness; favour `const` and arrow functions for helpers, `PascalCase` for classes, and `camelCase` for variables and services.
- Keep Angular components standalone where practical and colocate templates/styles with their component folders.
- API routes adopt kebab-case paths (for example `/api/tab-groups`) and should return typed DTOs from `src/serializers`.

## Testing Guidelines
- The Angular app relies on the CLI test runner; add Jasmine/Karma specs under `Site/src/**/*.spec.ts` and run with `npm test`.
- The API currently lacks automated tests—add Jest or Supertest suites under `API/src/**/__tests__` when introducing new endpoints, and mock MySQL connections through the service layer.
- Favour integration tests for cookie-based auth flows to exercise both csrf headers and credentialed fetches.

## Commit & Pull Request Guidelines
- Commit history uses short, imperative messages (`Remove console log`, `Update favicon monogram`); match that tone and keep scope focused.
- Reference tickets in the body when relevant, list manual test commands, and include screenshots or API examples for UI changes.
- PRs should call out schema or environment variable changes (`JWT_SECRET`, `AUTH_COOKIE_SECURE`, `CORS_ORIGIN`, DB credentials) so deployers can update Coolify or Docker configs.

## Security & Configuration Tips
- Secrets load via `.env` in `API/`; set JWT TTLs (`JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`), DB credentials, and cookie flags (`AUTH_COOKIE_SECURE`, `AUTH_COOKIE_PATH`).
- The SPA reads runtime overrides from `Site/src/environments/environment*.ts`; provide `ENV_VERSION` or `API_BASE_URL` through Coolify env vars to avoid rebuilding for each change.
- Enable HTTPS in deployment so secure cookies and CORS credentials remain honoured, and avoid persisting auth tokens in browser storage—sessions rely on httpOnly cookies.
