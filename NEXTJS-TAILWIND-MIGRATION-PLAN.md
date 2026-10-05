# RRC Leasing — Next.js and Tailwind Migration Plan

## Decision

Move the public website and the staff workspace to **Next.js (App Router) with TypeScript and Tailwind CSS**. Keep the current TypeScript/Fastify/Prisma service as the dedicated **Node.js API** until the new frontend is fully verified. PostgreSQL remains the only system of record.

This is a frontend migration, not a database rewrite. The current website must remain online while the replacement is built and verified in parallel.

## Design reference

The J4 Dental Clinic project was reviewed as a workflow reference. It is a Laravel Blade/Vite application rather than Next.js, but it demonstrates a useful interaction model:

- a clear, persistent multi-step indicator;
- one stable form step at a time;
- familiar labelled fields and visible validation;
- calm navy/white operational surfaces.

The RRC implementation will use the same *interaction structure* while preserving RRC’s brand: RRC navy, gold accent, Manrope headings, Source Sans body text, existing logo, and property imagery. It will not reuse J4 Dental Clinic source files, Bootstrap assets, or clinic branding.

## Target architecture

```text
Browser
  └─ Next.js web app (SSR public pages + client form islands)
       └─ HTTPS Node.js API (Fastify + Prisma)
            └─ PostgreSQL
```

- **Next.js**: public listings, property pages, application/resubmission pages, staff workspace UI, route-level loading/error states.
- **Tailwind CSS**: one token-driven RRC design system; reusable buttons, inputs, cards, modals, table/list layouts, and responsive breakpoints.
- **Node.js API**: preserve authentication, staff roles, property CRUD, application records, documents, notifications, resubmission links, and email delivery.
- **Prisma/PostgreSQL**: keep the existing schema and migrations. Do not duplicate data in Next.js.
- **File storage**: keep the current database-backed document storage for the first migration release; move to private object storage only as a separately planned hardening project.

## Form behavior that fixes the current issue

The application will use a stable client-side step controller instead of rebuilding the whole form on field changes.

1. Each step is a single React component with local state.
2. Typing updates only that field; it never reloads the route, rebuilds the form, or changes the page scroll.
3. Step data is persisted only on **Continue**, **Back**, explicit Save, page-hide, and successful file upload.
4. Conditional fields (for example, fit-out details) expand in place without remounting unrelated inputs.
5. Selected documents upload independently with visible `Uploading`, `Uploaded`, `Failed`, and retry states.
6. The final submit response must include the saved document count; the success page displays that exact count.
7. The admin detail view separates **Application details**, **Documents**, **Activity**, and **Request documents** into stable sections/tabs.

## Proposed repository layout

```text
rrc-leasing-web-app/
  apps/
    web/                 # New Next.js + Tailwind frontend
    api/                 # Current Fastify/Prisma service, moved without behavior changes
  packages/
    contracts/           # Shared Zod schemas and TypeScript API types
    ui/                  # RRC Tailwind components and design tokens
  docs/
    migration/           # API inventory, test cases, rollout runbook
```

Initially, `platform/` can remain in place as the API package. The folder move should happen only after the Next.js application is working and tested, to avoid unnecessary deployment risk.

## Delivery phases

### Phase 0 — Freeze and document the current contract

- Export the current API endpoint list, request/response schemas, authentication rules, and Apache proxy routes.
- Add integration tests for: property listing, viewing request, application with documents, staff login, request review, resubmission upload, and all email notifications.
- Capture current production database backup and verify the restore procedure.
- Record the present RRC visual tokens and reusable content blocks.

**Exit condition:** API contract and rollback steps are documented; no production behavior changes.

### Phase 1 — Create the design system and Next.js shell

- Create `apps/web` with Next.js, TypeScript, Tailwind CSS, ESLint, and test tooling.
- Define RRC tokens: navy, gold, surface, ink, muted text, success, error, focus ring, spacing, radius, and shadows.
- Build reusable components: `SiteHeader`, `Footer`, `Button`, `TextField`, `SelectField`, `FileUpload`, `Dialog`, `StatusBadge`, `DataCard`, `EmptyState`, and `Stepper`.
- Match existing RRC public-page design, with responsive layouts at 375px, 768px, 1024px, and 1440px.

**Exit condition:** static home, listing, property, and empty admin-shell pages match approved RRC design without API calls.

### Phase 2 — Public catalogue and requests

- Replace hash routing with normal Next.js routes:
  - `/`
  - `/commercial`
  - `/residential`
  - `/properties/[reference]`
  - `/apply/[reference]`
  - `/resubmit/[token]`
- Fetch properties from the Node API using server-side rendering where appropriate.
- Rebuild the viewing-request modal with an explicit close button, keyboard support, and no accidental outside-click dismissal.
- Add loading, success, error, and offline states.

**Exit condition:** public browsing and viewing requests work against the production-compatible API in a staging environment.

### Phase 3 — Application and document workflow

- Build the stable five-step application form using React Hook Form and Zod.
- Use field-level validation on blur and step-level validation on Continue.
- Add draft persistence at step boundaries, not per-keystroke page rendering.
- Upload documents immediately with progress and retry; retain document IDs in the draft.
- Add an explicit review screen showing application details, document file names, sizes, and uploaded status.
- Show a final receipt with reference number and verified attachment count.
- Rebuild the resubmission page with the same stepper, compact RRC header, requested-document checklist, and upload receipt.

**Exit condition:** an end-to-end test submits an application with documents and the exact documents appear in the staff workspace.

### Phase 4 — Staff workspace

- Rebuild `/admin` as a protected Next.js route that consumes the same Node API.
- Use a unified request queue with filters for Viewing, Application, New, In review, and Completed.
- Request detail layout:
  - Overview
  - Applicant details
  - Attachments
  - Activity and email delivery status
  - Request missing documents
- Preserve Super Admin and Leasing permissions.
- Keep the approved support-chat widget in the staff shell only.

**Exit condition:** staff can manage listings, review applications, view documents, update status, request documents, and verify emails without the legacy admin UI.

### Phase 5 — Security, performance, and accessibility

- Add CSRF/origin protections appropriate to the chosen cookie/session model.
- Ensure document API responses are no-store and require authenticated staff sessions.
- Add rate limits, audit events, structured logging, and health/readiness checks.
- Verify keyboard navigation, visible focus states, 4.5:1 contrast, semantic labels, reduced motion, and 44px interactive targets.
- Run browser tests for Chrome, Edge, mobile viewport, slow network, and interrupted uploads.

**Exit condition:** security review and UAT pass; all critical workflow tests pass in staging.

### Phase 6 — Cutover and rollback

- Deploy the Next.js app beside the legacy website under a temporary staging hostname.
- Point only internal testers to it first.
- Switch Apache public routes to Next.js after acceptance.
- Keep the legacy website available for immediate rollback until at least one complete business cycle has passed.
- Do not change the API host, database, mail configuration, or document store during the frontend cutover.

## Deployment target

On the existing Windows server, run three local services behind Apache:

- Next.js web server: `127.0.0.1:4173` (replaces the current website process)
- Fastify API: `127.0.0.1:4180` (existing platform process)
- PostgreSQL: existing local service

Apache continues to terminate HTTPS and proxy `/`, `/admin`, `/api`, and secure document routes. The exact routes will be reduced after Next.js owns both public and staff rendering.

## Acceptance checklist

- Typing into any application field never scrolls or resets the form.
- Moving between steps preserves values and focus intentionally.
- A document marked uploaded is present in the admin attachments list after final submission.
- A failed upload cannot be silently represented as an attached document.
- Existing public URLs and `/admin` continue to work after cutover.
- Viewing request, application, review-status, and resubmission emails are delivered to both intended parties.
- Staff accounts, sessions, and Super Admin permissions remain intact.
- Rollback is a one-command Apache route/service change with no database rollback required.

## Recommended order of work

Start with Phase 0 and Phase 1 only. Do not begin the rewrite directly on the production server. Build the Next.js application locally, verify it against a staging copy of the API/database, then move each workflow one at a time.
