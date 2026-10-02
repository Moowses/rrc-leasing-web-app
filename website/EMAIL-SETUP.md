# Recruitment and viewing email setup with Zoho

The Careers form sends a candidate's selected vacancy, first name, last name, email, optional phone and message, and one attached resume to **recruitment@rosefoodrealtycorp.com**. First name, last name, email and resume are required. That recipient is fixed on the server. Applicant email is used only for Reply-To; the sender must be an approved RRC mailbox or alias. There is no automatic applicant email, applicant database, HR dashboard or Collo connection.

**Current delivery state: disabled.** No Zoho credentials were entered, no SMTP connection was attempted and no test email was sent during development. The local preview can select and validate a resume but does not claim an application was submitted. Viewing requests have a separate optional email flow to Leasing, described below. Tenant application submission remains a preview.

## Mail configuration

An RRC administrator should read the outgoing hostname in the account's **Server Configuration Details**. Zoho's hostname depends on account type and data centre; do not choose it from the company's location. Use authenticated SMTP on port 465 (implicit TLS) or 587 (required STARTTLS). The From address must be the authenticated mailbox or its authorized alias. With two-factor authentication, Zoho may require an application-specific password. [Official Zoho SMTP instructions](https://www.zoho.com/mail/help/zoho-smtp.html).

Store the following in the hosting platform's server-side secret/environment settings. Do not place them in JavaScript served to visitors, a public folder, this document, a shared ZIP, or chat.

| Variable | Value |
| --- | --- |
| `RRC_SMTP_HOST` | Exact outgoing SMTP hostname shown in the RRC Zoho account |
| `RRC_SMTP_PORT` | `465` or `587` |
| `RRC_SMTP_USER` | Full address of the authorized sending mailbox |
| `RRC_SMTP_PASSWORD` | Mailbox's application password/approved SMTP secret |
| `RRC_SMTP_FROM` | Authorized RRC sender address ending in `@rosefoodrealtycorp.com` |
| `RRC_RECRUITMENT_SEND_ENABLED` | Leave unset/`false` for preview; set exactly `true` only when RRC authorizes activation |
| `RRC_VIEWING_SEND_ENABLED` | Separate viewing-request activation; leave unset/`false` until configured and ready for testing |

Use Node.js 20 or later. Before activation, run `npm install --omit=dev` in the website directory, then `npm start` with the environment supplied by the host. The package pins Nodemailer 10.0.11, whose declared runtime is Node 20+. [Official npm package](https://www.npmjs.com/package/nodemailer).

The package is loaded only when sending is explicitly enabled and configuration is complete. Without it, the server still runs and reports recruitment as unavailable. No SMTP call occurs on startup or on a status check. An enabled status means configuration and the library are present; it does **not** verify credentials or prove inbox delivery.

## What is implemented

- `GET /api/recruitment/status` returns only `{ "enabled": true/false }`.
- `POST /api/recruitment` accepts JSON with `position`, `firstName`, `lastName`, `email`, `phone`, `message`, `consent: true`, and `resume: { name, type, dataBase64 }`. First name and last name are separately required, at most 60 characters each. Their combined name is used in the email subject and Reply-To display name; both fields appear separately in the email body.
- The nine supplied vacancies are checked on the server. Resume formats are PDF, DOC and DOCX, maximum 5 MiB (shown as 5 MB in the form), with extension/type/signature checks and basic DOCX container checks. JSON requests are limited to 8 MiB.
- Email includes the resume as an attachment. The server accepts no browser-supplied recipient, sender, attachment path or external URL. Fields and uploads stay in request memory; application contents, filenames and credentials are not logged or written to disk by this code.
- Requests require the same origin, are limited to five attempts per address per 15 minutes, and at most four concurrent submissions. Limits are in memory and reset on restart.
- The server returns success only after the mail service reports the HR recipient as accepted. That is acceptance for delivery, not confirmation HR read the email or selected the candidate. A transport failure returns a generic error and advises contacting HR before retrying because a disconnected SMTP session can leave delivery uncertain.

TLS certificate checking is enabled, STARTTLS is required on port 587, and Nodemailer's external file/URL access and debug logging are disabled. [Nodemailer SMTP transport documentation](https://nodemailer.com/smtp).

## Activation and hosting handover

`server.mjs` remains **localhost-only by default**. Its production mode requires an explicit `RRC_PUBLIC_ORIGINS` allowlist of exact HTTPS origins; do not expose it publicly without configuring that allowlist and a reverse proxy. Preserve validation, fixed recipient, private server secrets and upload limits. Configure proxy timeouts to accommodate the SMTP response; do not trust arbitrary forwarded IP headers for rate limiting.

Before opening public intake, install and audit the pinned dependency, enforce bot protection and durable/shared rate limits at the host, configure malware screening/quarantine for incoming resumes, approve HR access and retention procedures, and prevent request bodies from entering proxy/application logs. Signature checks do not establish a document is harmless. DOC files can contain macros; mail security must inspect attachments before staff open them.

With RRC's approval, temporarily enable sending in a controlled test environment. Submit one clearly labelled synthetic test application through its HTTPS page, verify the resume arrives intact in the recruitment mailbox and confirm Reply-To. Also verify a rejection/timeout never displays a success receipt. No such external test has been performed yet. After these checks, activate public recruitment intake. Tenant application delivery and Collo integration require their separate implementation described in DEPLOYMENT.md.

This direct email workflow has no durable queue or application tracking reference. HR manages received applications in Zoho; failed attempts are not saved for later sending. If tracking, guaranteed retries or applicant status pages are required, add a private intake database/queue before promising those features.

## Property viewing requests to Leasing

Viewing requests use the same private SMTP connection settings, with the separate `RRC_VIEWING_SEND_ENABLED=true` flag. Their fixed recipient is **leasing@rosefoodrealtycorp.com**. The recruitment activation flag does not enable viewing delivery, and neither flag enables tenant application submission.

The viewing email includes the property reference and server-resolved property details, requester's name and email, optional phone, preferred date and time, and optional message. Reply-To uses the validated requester address. Leasing must confirm the appointment separately; successful email submission is not a booked viewing.

The interface checks `GET /api/viewing/status`. `POST /api/viewing` accepts `propertyId`, `name`, `email`, optional `phone`, `date` in YYYY-MM-DD format, `time` (Morning, Afternoon or Flexible), and optional `message`. The server checks the property against its available catalog; client-supplied property titles or recipients cannot redirect or relabel the message.

The local server's Host/Origin restrictions also apply to these routes and need deliberate production-domain adaptation. Test both flows separately after private configuration. No real viewing email has been sent or verified. As with recruitment, no durable queue, request database or calendar booking is implemented.
