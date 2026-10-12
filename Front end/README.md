# RRC Front End

This Next.js App Router + Tailwind CSS 4 implementation uses RRC branding and the Fastify/PostgreSQL API in `../Backend` as its system of record. The earlier website and handover notes are preserved in `../Archive/2026-10-12-cleanup/legacy-handover`. This local project has not been deployed by the folder cleanup.

Current database relationships are documented in `../docs/DATA-MODEL.md`; asset provenance is in `../docs/BRANDING.md`.
Windows Server cutover commands are in `../docs/WINDOWS-DEPLOYMENT.md`. HTML pages render per request to attach CSP nonces to the Next.js scripts and styles; Apache must not add the earlier static script-blocking CSP on top of the app policy.

## Scope in this workspace

- Public published-property catalogue with viewing requests and multi-step lease applications, review-before-submit, applicant consent, optional supporting document upload, and an in-browser text draft. Form entry does not trigger a page reload; drafts save on step changes. Selected `File` objects intentionally stay in memory and are not silently copied into browser storage.
- Staff login and responsive operations dashboard with listings/CMS, application and viewing queues, document review, secure document-request email, notifications with a user-enabled chime, tracked email results, audit history, staff creation, and HR job/application management.
- Applicant resubmission page at `/resubmit#token`; the fragment is not sent to web-server access logs, the API expires each token after 72 hours, and the database stores only a hash.
- Prisma migration for explicit publication state, consent records, email delivery records, HR jobs/applications/events, and applicant documents.

## Local setup

1. Start PostgreSQL and configure `../Backend/.env` from `../Backend/.env.example`. Add the new local web origins to `RRC_PLATFORM_ORIGINS`; for this project use `http://localhost:4181,http://127.0.0.1:4181`.
2. Install the API dependencies in `../Backend`, generate the Prisma client, and apply migrations using the existing backend scripts (`npm install`, `npm run db:generate`, `npm run db:deploy`). Set SMTP credentials only in the private `../Backend/.env`; never commit real values.
3. Copy `.env.example` to `.env.local` and set `RRC_PLATFORM_API_ORIGIN=http://127.0.0.1:4180`.
4. Run `npm ci` and `npm run preview` in this folder. The app listens on port 4181. Stop any existing server on that port first.

`npm run preview` builds and starts a fixed version for form testing, without the development HMR client. Run it again after source changes. `npm run dev` is the coding mode: file edits trigger live updates. Tailwind scans only `app`, `components`, and `lib`; generated build files are outside those source paths. Public listing polling pauses while a viewing/application form is open and ignores unchanged listing responses.

SMTP configuration uses `RRC_OPERATIONAL_EMAIL_ENABLED`, `RRC_SMTP_HOST`, `RRC_SMTP_PORT`, `RRC_SMTP_USER`, `RRC_SMTP_PASSWORD`, and `RRC_SMTP_FROM`. Leasing and recruitment recipients are separately configurable. `EmailDelivery` retains recipient, template, state, provider message ID, and a safe error code—not SMTP credentials or message bodies.

## Data boundaries

PostgreSQL (through Prisma) remains authoritative for staff, property/unit inventory, viewing and lease requests, consents, documents, secure resubmission tokens, email delivery attempts, audit events, job postings, and career applications. The browser only holds an HttpOnly staff session cookie and non-sensitive form drafts; it must not be treated as an authority for roles, consent, prices, status, or link validity. API handlers enforce role checks and validate input. Applicant and candidate documents are currently stored as PostgreSQL `BYTEA` to fit the existing deployment; before scaling up, migrate binary files to private object storage with encryption, malware scanning, retention rules, and short-lived authorized download URLs.

## Production cutover checklist

Do not point public Apache traffic at this app until all checks are completed by RRC IT. Keep the existing website available while validating the parallel app.

- Apply the migration and generate/build the API client on a backed-up database; verify migration status and preserve a tested rollback/restore path.
- Configure the new platform allowed-origin list with the exact public HTTPS origin, and set SMTP/recipient/site-origin values using protected server secrets.
- Build and run Next.js as a separate loopback service on port 4181. Keep Fastify on loopback port 4180; do not expose the API directly to the internet.
- Validate TLS/Apache reverse-proxy routing for `/`, `/admin`, `/resubmit/*`, assets, and same-origin `/api/*` requests; verify cookie forwarding, request-size limits, CSP, health checks, logs, and restart behavior.
- Use a non-production test mailbox and test account to exercise listing publish/unpublish/archive, a viewing request, application with attachment, office/applicant email, status email, missing-document request, token expiry, upload, notification/chime, role denial, HR job/applicant workflow, and audit entries.
- Only after sign-off, change Apache routing. Keep a one-command rollback to the current website and preserve existing database data.

No production migration, server restart, Apache edit, DNS change, or email send was performed by creating this parallel codebase.
