# RRC Property Operations Platform — Phase 2 foundation

This folder is the protected backend foundation for the future staff and renter portals. It does not replace the public website in `../website`.

## What is available now

- PostgreSQL schema for staff roles, areas, properties, units and audit events.
- Availability states designed for commercial and residential spaces.
- API foundation with `/healthz` and `/readyz`.
- Private runtime configuration with exact origin validation.
- Docker Compose development database.
- Authentication provider placeholder. No login is enabled until RRC selects Microsoft Entra ID or Google Workspace.
- Separate branded portal previews at `/admin` (staff) and `/client` (renters), intentionally outside the public website.
- Responsive, accessible navigation and clear no-data states; neither portal can create, view, or alter operational records before authenticated APIs exist.

## Not enabled yet

- Staff or renter sign-in.
- Live property CMS screens or availability records.
- Live renter dashboard data.
- Lease, invoice, payment or maintenance records.
- Payment processing.
- Public website synchronization.

## Local setup

1. Copy `.env.example` to a private `.env` file and replace the development database password.
2. Start PostgreSQL with `docker compose up -d`.
3. Install packages with `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Start the API with `npm run dev`.
6. Open `http://127.0.0.1:4180/admin` for the staff preview or `http://127.0.0.1:4180/client` for the renter preview.

Do not use the development database password, Docker configuration, or an unconfigured authentication provider in production.

## Route separation

The existing public leasing website remains in `../website` and runs independently. Do not add portal navigation or operational data to that public site. The platform service is the only home for `/admin` and `/client`:

- `/admin` — staff workspace for future property, availability, requests, reporting and settings workflows.
- `/client` — renter workspace for future lease, bill, payment-submission and maintenance workflows.

Until identity and access controls are configured, these pages are presentation-only and deliberately contain no property, renter, lease, bill, or payment data.
