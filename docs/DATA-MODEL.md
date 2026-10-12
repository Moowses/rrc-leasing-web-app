# RRC operations data model

The PostgreSQL database remains the source of truth; Next.js renders the public site and staff workspace, while the Fastify API owns validation, authorization, state transitions, mail dispatch, and audit writes. Existing leasing records remain in place.

## Main relationships

```text
StaffUser ──< StaffSession
    ├───────< AuditEvent
    ├───────< CareerApplicationEvent
    └───────< Notification (optional recipient)

Area ──< Property ──< Unit
             ├──────< PropertyImage
             └──────< LeasingRequest ──< ApplicationDocument
                           ├───────────< ApplicationResubmissionLink
                           ├───────────< Notification (polymorphic entity reference)
                           └───────────< EmailDelivery (polymorphic entity reference)

JobPosting ──< CareerApplication ──< CareerDocument
                       ├───────────< CareerApplicationEvent ── StaffUser (optional actor)
                       ├───────────< Notification (polymorphic entity reference)
                       └───────────< EmailDelivery (polymorphic entity reference)

ConsentRecord: indexed polymorphic subjectType + subjectId for LeasingRequest/CareerApplication
```

## Responsibilities and invariants

- `Property.status` is the editorial lifecycle (`DRAFT`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`); `Unit.availability` is the operational availability. The public query requires both a published property and an available unit. Rent changes and publication/status changes are recorded with actor, previous value, next value, timestamp, and request metadata in `AuditEvent`.
- `LeasingRequest` stores the submitted contact/details and consent reference. The related `ConsentRecord` captures purpose, policy version, acceptance timestamp, IP, and user agent. Viewing and application requests share a queue but retain a distinct request type.
- `ApplicationDocument` keeps private uploaded bytes associated with one application. An `ApplicationResubmissionLink` stores only a SHA-256 token hash, requested document kinds, expiry, and use time; the raw token is delivered once in email and never stored in plaintext.
- `EmailDelivery` records each recipient/template attempt, status, provider message ID, timestamp, and a non-secret error code. It intentionally does not store bodies or credentials.
- `StaffRole` gates the API: Super Admin manages users; Leasing handles applicant records; Content Manager edits listings; HR Manager creates and manages positions; HR Staff reviews applicants; Admin has broad operational access; Auditor reads audit events. Backend checks—not hidden UI buttons—are authoritative.
- `JobPosting` has the same draft/publish/unpublish/archive pattern. `CareerApplication` and its documents, status events, consent, notifications, and email attempts remain separate from leasing applicants.

## Migration and retention note

The accompanying additive migration preserves current property/request rows and maps legacy `isPublished=true` properties into `PUBLISHED`. The six previous migrations and their `ApplicationUploadDraft`/`ApplicationDraftDocument` models remain in the backend for compatibility with existing databases. Before production cutover, back up PostgreSQL, apply this migration, generate Prisma Client from the updated schema, and verify it in staging. Define approved retention/deletion periods for identity/resume files and consent/audit records with RRC before accepting real personal data. Binary database storage is the compatibility path; private object storage is the scale-out target.
