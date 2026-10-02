# Production handover

This folder is an interactive preview. Publication and real applicant intake require the work below. The local server is intended only for review on one computer. The Careers page includes an embedded application form and resume attachment field; live email delivery remains unconfigured.

## Application ownership and destinations

- Leasing: `leasing@rosefoodrealtycorp.com` owns property enquiries and tenant application review.
- Recruitment: `recruitment@rosefoodrealtycorp.com` owns job enquiries and CV applications. Keep these records and staff permissions separate from leasing.

These are the recipients supplied by RRC. Displaying the addresses and application forms does not configure mail delivery, mailbox access, a staff dashboard, or a Collo connection. Zoho is the confirmed email provider. The recruitment backend is designed to remain disabled until its private mail configuration is supplied; no live mail or Collo integration is configured in this preview.

Property viewing requests have a separate optional server-side mail flow to `leasing@rosefoodrealtycorp.com`, activated with `RRC_VIEWING_SEND_ENABLED=true` only after private Zoho configuration. It sends the property reference/details, contact information and preferred schedule, with no calendar booking or automatic confirmation of a visit. Its status/submission routes are `/api/viewing/status` and `/api/viewing`. Verify its fixed recipient and complete delivery independently of recruitment. Tenant application storage/notification remains separate work.

## 1. Approve the public content

Replace demonstration listings with verified RRC-owned inventory. Assign a stable property/unit ID and area to each listing; confirm category, availability, rent in PHP (₱), floor area in m², lease terms, and an accurate address. Use approved property photos, limited to 20 per listing. Approve public contact details and inquiry recipients. Remove all demonstration labels only after replacement and verification.

## 2. Build real tenant application intake

Add a production backend over HTTPS. Validate every field and upload on the server, including conditional commercial/residential requirements; never rely on browser validation alone. Use Philippine addresses, phone numbers, PHP amounts, and m². Confirm the necessary applicant fields against the approved RRC process and actual Collo tenant record before deciding which are mandatory.

Create a durable application ID and prevent duplicate submissions with idempotency keys. Save the application and its status before returning a receipt. Send a confirmation only after successful storage; an application receipt is not tenancy approval. Provide a retry path and a way to recover from interrupted uploads. Add request size limits, rate limits, bot controls, and request-origin/CSRF protection appropriate to the authentication model. Keep sensitive data out of URLs, analytics, and routine logs.

Implement the tenant workflow in this order:

1. Receive and validate the tenant application, linked to a verified property/unit.
2. Save the application and supporting files securely; create its reference number and initial review status.
3. Acknowledge receipt to the applicant only after durable storage succeeds. State that review is pending.
4. Notify `leasing@rosefoodrealtycorp.com` with the reference, property, and an authenticated review link. Avoid sensitive identity details and document attachments in notification emails.
5. Allow authorized leasing staff to review, request information, and record their decision.
6. Transfer approved, necessary tenant information to Collo only after authorized leasing approval, using a supported method confirmed with Collo.

Configure a server-side email provider or the organization's supported mail service, including the approved sender and required domain authentication. Keep mail credentials outside browser code. Track and retry failed notifications without losing the stored application or creating a duplicate. A failed notification must remain visible to staff; it does not erase a successfully stored application. Keep `leasing@rosefoodrealtycorp.com` as the leasing reply destination.

## 3. Connect embedded recruitment applications to HR email

Applicants must choose a vacancy, complete the application on the website, and attach their resume there. The production backend must send the application details and resume as an email attachment directly to `recruitment@rosefoodrealtycorp.com`. This is a website submission workflow; applicants should not need to open a separate email application or attach the resume again.

The supplied vacancy titles are Project Engineer, Collections Officer, Design Architect, Maintenance Head, Fabrication Head, Leasing Supervisor, Leasing Coordinator, Finance Head, and Accounting Staff. Maintenance Head is the corrected title. Proposed qualifications and responsibilities are included in vacancies.js and JOB-DESCRIPTIONS-DRAFT.md; obtain HR approval before publication. Locations and closing dates remain unspecified. Provide a controlled way to close or remove filled roles, and validate the selected role on the server against the current approved list. The recruitment form requires first name and last name separately, email, a resume and the applicant acknowledgement; mobile and message are optional.

Configure Zoho SMTP on the server using the private environment settings described in `EMAIL-SETUP.md`. Confirm the correct SMTP hostname for RRC's Zoho account and use the account's supported authentication method. Use an authenticated RRC sender, set the applicant's validated address as Reply-To, and fix the recipient on the server to `recruitment@rosefoodrealtycorp.com`. Never accept a recipient from a browser field, expose credentials in frontend code, or send recruitment applications to the leasing mailbox. Domain authentication and allowed attachment sizes must match the Zoho account.

The included backend uses Node.js 20 or newer and an optional Nodemailer dependency loaded only for explicitly enabled sending. Install it with `npm install --omit=dev`, supply the private environment settings, and restart the server only when ready for authorized delivery testing. The recruitment status endpoint confirms configuration readiness, not successful SMTP authentication or inbox delivery. Startup and status checks do not send messages.

Validate all form fields and the resume on the server. Check permitted file types, detected content type, and upload size, and reject unsafe files before mailing. Escape applicant-supplied values in email bodies and prevent mail-header injection. Add rate limits and appropriate anti-abuse controls. Keep resume files outside the public website; use private temporary storage or memory for processing and an explicit cleanup/retention schedule. Do not log resume contents or unnecessary personal information.

Track an application reference and delivery state so a failed mail attempt can be retried without creating duplicate applications. Show a success message only after the server confirms the stated outcome: queued securely for delivery or accepted by the mail service, as applicable. Mail-service acceptance is not evidence that HR has read the application. Show a clear retry path on failure; do not falsely claim a resume was emailed. Applicant acknowledgements must reflect the actual stored or queued state and must not imply hiring approval.

The local preview must continue to state that it does not send real applications until the mail service is configured and end-to-end delivery is verified. Keep recruitment records and any staff review tools restricted to HR, with a recruitment-specific privacy notice and retention process. Never create Collo tenants or send recruitment records to Collo. Leasing staff should not gain access to CVs through the leasing review system.

## 4. Protect documents and access

Store identity and supporting files in encrypted private storage, outside the public website. Validate permitted extensions, detected MIME type, and file size; scan files for malware before staff access and quarantine suspicious uploads. Use short-lived authorized download links. Encrypt transport and backups, restrict encryption-key access, and test restoration.

Require authenticated staff accounts with role-based access, least privilege, and audit logs. Authorized RRC staff must review applications and make leasing decisions. Add no automatic acceptance or adverse eligibility decision. Agree who may view identity documents, change status, approve a lease, export records, or delete data.

Approve the privacy notice, RRC privacy contact, lawful collection purposes, required versus optional fields, access/correction process, retention schedule, and secure deletion procedure before intake opens. Apply that schedule to rejected, withdrawn, incomplete, and approved applications as well as files and backups. Obtain Philippine privacy/legal review of the final notice and process.

## 5. Confirm Collo integration

Access the authorized account with RRC and inventory the actual tenant, applicant, property/unit, attachment, and lease fields. Confirm with Collo which official API or supported import workflow is available; this prototype does not establish that an API exists. Record an explicit field mapping, including required values, identifiers, date formats, status meanings, and commercial versus residential differences.

Use a server-side integration only. Keep credentials and tokens in a secret store, never browser code or downloadable files. Transfer only approved, necessary tenant data after authorized leasing staff approve the application. Track each transfer by application ID, prevent duplicate tenant creation, and handle retries with backoff and visible failure status. Reconcile source and destination IDs. Provide an authorized staff export/import or manual-entry fallback when the supported integration is unavailable. Human review must precede lease approval. Recruitment records are outside this integration.

## 6. Publish and verify

Implement authenticated administrator access and a content database before relying on staff to update the website independently. The current version has no admin page or login. See ADMIN-MANAGEMENT-PLAN.md for property/photo management, vacancy editing and separate Leasing/HR permissions; hiding a page link is not access control.

Choose the approved domain, hosting, backend, and private storage. Configure HTTPS, security headers, appropriate content security policy, monitoring, backups, and a documented support owner. Set `RRC_PUBLIC_ORIGINS` to the exact HTTPS origin(s) and keep the Node process behind the approved reverse proxy. Keep documents, application exports, credentials, and development files out of the public web root. The browser's production API destination must be explicitly allowed by the final policy.

Test real mobile and desktop browsers, keyboard operation, visible focus, labels/error messages, contrast, photo navigation, all filters, and the 20-image limit. Run end-to-end tests for residential and commercial tenant applications: validation failures, upload rejection, successful receipt, duplicates, interrupted connection, staff access restrictions, retention/deletion, and Collo failure/retry/manual fallback. Confirm that no submission is described as accepted until the responsible system has stored it successfully.

Test embedded recruitment independently: each supplied vacancy selects the correct role; required fields and resume checks work; permitted test resumes reach `recruitment@rosefoodrealtycorp.com` as attachments; invalid uploads fail; mail failures and retries are truthful; duplicate submissions are handled; and HR replies go to the applicant. Verify that no recruitment message reaches the leasing mailbox or Collo and that access and deletion rules remain separate from tenancy. Use clearly marked synthetic applications for delivery tests only when sending a test email is explicitly authorized.

Obtain RRC approval of inventory, branding, application fields, privacy content, and final workflow before enabling public intake.
