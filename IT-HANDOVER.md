# RRC website — IT handover

Prepared: 30 September 2026

**This package is the editable website and its current backend code. The local preview runs now; public launch requires the production work listed below. No admin login, tenant database or Collo integration is included.**

## Package contents

- `website/` — HTML, CSS, JavaScript, local logo/images/fonts and licenses, Node server, mail modules and detailed handover documents.
- `tests/` — repeatable checks using synthetic applications and fake mail transports; these tests do not send email.
- `config/server-environment.example` — empty server configuration template. No credentials are supplied.
- `preview/` — screenshots of the recruitment form, draft job descriptions and viewing request form.
- `CHECKSUMS.sha256` — file hashes for checking the package contents.

The website uses plain HTML/CSS/JavaScript. There is no frontend build step or CMS dependency. Node.js 20+ is the declared minimum; use a currently supported release compatible with the package. Nodemailer is the only declared package dependency and is loaded only when a mail flow is explicitly enabled and configured. The package does not bundle Node.js or `node_modules`.

## Run the local review

From the extracted package directory:

```text
cd website
node server.mjs
```

Open `http://127.0.0.1:4173` on that same computer. Leave the terminal open; Ctrl+C stops it. On a headless server, use your approved local access/tunnel arrangement rather than exposing the review port. The optional PowerShell launcher is for Windows; the Node command works independently of Codex.

Run the verification scripts from the extracted package directory in a separate terminal:

```text
node tests/verify-recruitment-mail.mjs
node tests/verify-viewing-mail.mjs
node tests/verify-application-lifecycle.mjs
```

Mail tests use injected fake transports and localhost HTTP requests. Successful local tests do not establish that Zoho login or inbox delivery works.

## Configure the two email flows

| Form | Recipient | Information |
| --- | --- | --- |
| Recruitment | recruitment@rosefoodrealtycorp.com | Position, first/last names, email, optional phone/message and attached PDF/DOC/DOCX resume (up to 5 MB). |
| Property viewing | leasing@rosefoodrealtycorp.com | Property reference/details, name, email, optional phone, preferred date/time and message. A request is not a confirmed appointment. |

Before a controlled delivery test, run `npm install --omit=dev` in `website/`. No lockfile is supplied, so use `npm install`, not `npm ci`; review and retain the resulting dependency lockfile for your deployment.

Read `website/EMAIL-SETUP.md`. The shared private SMTP settings are `RRC_SMTP_HOST`, `RRC_SMTP_PORT`, `RRC_SMTP_USER`, `RRC_SMTP_PASSWORD` and `RRC_SMTP_FROM`. Obtain the exact outgoing hostname from RRC's Zoho account; do not infer its data centre from the company's location. Use the authorized sending account/alias and the account's supported SMTP secret.

Recruitment and viewing have separate activation flags: `RRC_RECRUITMENT_SEND_ENABLED=true` and `RRC_VIEWING_SEND_ENABLED=true`. Keep both disabled until configuration and controlled testing are ready. The provided environment file is a template only: the current application reads the process environment and does **not** automatically load this file or `.env`.

Do not put actual secrets in frontend code, this ZIP, the web root or version control. Status endpoints report configuration readiness, not verified delivery. No real Zoho connection or email has been tested for this handover.

## Required production work

1. **Adapt hosting.** By default, `server.mjs` binds to `127.0.0.1` and accepts only its localhost Host/Origin values. For production, configure the exact HTTPS origins through `RRC_PUBLIC_ORIGINS`, keep the process behind an HTTPS reverse proxy, and apply deliberate trusted-proxy/IP handling; do not simply remove checks. Run under your service manager or container runtime. Static-only hosting cannot process the mail APIs. See `website/PHASE-1-FOUNDATION.md`.
2. **Keep private files private.** Do not expose the entire source folder as an unrestricted static directory. Preserve the public-file allowlist; server code, documents, package metadata, test files and secrets must remain outside public access. Preserve request/upload limits, SMTP timeouts, rate controls and attachment checks. Existing in-memory IP rate limits reset on restart and may treat all proxied visitors as one address unless adapted.
3. **Build staff administration.** Add authentication, persistent content storage and staff permissions: Leasing manages properties and up to 20 images; HR manages vacancies; a Super Administrator manages staff accounts. See `website/ADMIN-MANAGEMENT-PLAN.md`. There are no administrator credentials or login page in the current code.
4. **Implement tenant intake.** The commercial and residential forms remain local demonstrations. Add secure submission/document storage, leasing review and notifications, then verify a supported Collo transfer/import or staff-entry process. Do not treat tenant preview completion as a submitted application.
5. **Approve real content.** Replace the six sample properties and illustrative images. HR must approve the nine draft job descriptions. Currently properties are edited in `properties.js`; job descriptions are in `vacancies.js`, with accepted job titles also checked in `recruitment-mail.mjs`. A future CMS should provide a single source of truth. Restart the Node service after editing the property catalog, its availability or server-side vacancy titles: the viewing mailer loads its catalog at startup. Saved Properties has been removed.
6. **Verify before opening intake.** Test both mailbox destinations with approved synthetic submissions, attached resume integrity, Reply-To, failure handling, duplicate prevention and viewing scheduling follow-up. Configure private upload handling, operational backups, monitoring and the approved privacy/retention process for live applicant data.

IT will need the target server OS/hosting details, approved domain/DNS access, HTTPS arrangement, authorized Zoho SMTP settings, and decisions on the administrator/database implementation. No changes to RRC's server, DNS or mail account have been made by preparing this package.

The detailed scope and checks are in `website/FINAL-REVIEW.md`, `website/DEPLOYMENT.md`, `website/EMAIL-SETUP.md` and `website/ADMIN-MANAGEMENT-PLAN.md`.
