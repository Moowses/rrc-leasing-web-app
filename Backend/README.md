# RRC Backend

This Fastify API uses PostgreSQL through Prisma for staff accounts/sessions, property listings, viewing requests, lease applications and documents, notifications, email delivery records, consent, audit history, and HR jobs/applications. The current public site and admin interface run in `../Front end` on port 4181.

## Local running

Keep the private `.env` in this folder. Its database, mail, and allowed-origin values are server configuration; `.env.example` is the setup template. For the new front end, `RRC_PLATFORM_ORIGINS` must include `http://localhost:4181,http://127.0.0.1:4181`.

On an existing configured installation:

```powershell
cd "D:\RRC-Website-IT-Handover\Backend"
npm run preview
```

The preview command builds and runs a fixed version of the API with the local `.env` loaded and no source-file watcher. The API runs on port 4180. Start the front end with its preview command in a second terminal and use `http://localhost:4181/admin` for the current staff interface. `http://127.0.0.1:4180/healthz` returns the API health status. Use `npm run dev` when editing code; it deliberately restarts the API after source changes.

For a fresh local installation, configure `.env`, start PostgreSQL (`docker compose up -d` for the included development database), install dependencies with `npm ci`, generate Prisma Client with `npm run db:generate`, apply the existing migrations with `npm run db:deploy`, and then run the API. Preserve an existing database and its backups when applying migrations.

## Folder responsibilities

- `src/` — API, validation, authorization, audit, and email logic.
- `prisma/` — database schema and migration history.
- `test/` — backend checks; run with `npm test`.
- `public/` — assets for the backend portal routes. `public/brand/` holds the logo, fonts, and sample images needed by those routes and the sample-data function.
- `dist/`, `node_modules/`, and `.npm-cache/` — generated build/dependency files.
- `backups/` — local database backups.

The backend no longer reads brand files from the old website folder. Current database relationships and branding records are in `../docs`. Historical phase notes are in `../Archive/2026-10-12-cleanup/superseded-docs`.
Server cutover instructions and the optional staff-account helper are documented in `../docs/WINDOWS-DEPLOYMENT.md`.
