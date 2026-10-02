# RRC Property Operations — Phase 3 data foundation

This phase turns the requested operating model into controlled records. It does not turn on access to those records until RRC selects and configures an identity provider.

## Covered requirements

| RRC requirement | Controlled records |
| --- | --- |
| Availability / vacancy database | `Area`, `Property`, `Unit`, `UnitAvailability` |
| CMS and images per property | `PropertyImage` with a private storage key, alt text, order and cover-image flag |
| Viewing and lease applications | `LeasingRequest` with distinct types and staff-managed status |
| Renter dashboard | `Renter`, `Lease`, `Invoice`, `InvoiceLine`, `PaymentSubmission`, `MaintenanceRequest` |
| Monthly rent plus other charges | Invoice lines for rent, utility, service charge, adjustment, late fee and other |
| Accounting review | Submitted payment proof, approval/rejection, reviewer, time and note |
| Notifications | Staff/renter queue with in-app/email channel and delivery/read status |
| Auditability | Existing `AuditEvent` model for protected actions |

## Required order before live records

1. RRC chooses Microsoft Entra ID or Google Workspace and creates staff groups for Super Admin, Leasing, Accounting, Maintenance and Auditor.
2. Start PostgreSQL, set private `DATABASE_URL`, generate Prisma client and apply the migration.
3. Add server-enforced authentication and role checks to every API route.
4. Add protected staff APIs for areas, properties, units and images, with an `AuditEvent` for each change.
5. Connect the public site only to published properties and available units.
6. Add leasing requests, renter invitations, leases, invoices, payments, maintenance, notifications and reporting in that order.

## Financial and privacy guardrails

- A payment submission is evidence for Accounting to review; it is never automatically treated as paid.
- Store document and payment-proof keys, not public file URLs; authorize every download.
- Keep issued invoices immutable; use corrective adjustment or void/reissue flows.
- Never expose another renter's lease, bill, payment proof or maintenance request.
- Agree finance, renter and application retention schedules before production data is entered.
