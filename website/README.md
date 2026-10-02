# RRC leasing and careers website

A working, interactive website prototype for leasing RRC's own commercial and residential properties in the Philippines, with a separate Careers section. It is a local preview and has not been published.

## Open the preview

Open PowerShell in this folder and run:

```powershell
node server.mjs
```

Or use the launcher, which prefers the installed Codex runtime and falls back to Node.js on PATH:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-RRC-Preview.ps1
```

Open **http://127.0.0.1:4173** in your browser. Leave the terminal running; press **Ctrl+C** to stop. Node.js 20 or newer is required. The preview needs no package installation or frontend build step. To enable live recruitment email later, run `npm install --omit=dev` in this folder to install the mail dependency, then privately configure Zoho and explicitly enable sending as described in `EMAIL-SETUP.md`.

If that port is occupied, set an unused port first:

```powershell
$env:PORT = '4174'
node server.mjs
```

Then open **http://127.0.0.1:4174**. The server accepts connections only from this computer.

## What to review

- Commercial and Residential leasing entry points on the home page.
- Property browsing grouped by area, with filters and property details.
- Property photo galleries capped at 20 images.
- Paperless application steps using Philippine fields and requirements appropriate to each lease type.
- A Careers page with the nine roles supplied by RRC, expandable draft qualifications and job responsibilities, and an embedded application with required first name, last name, email, and resume attachment.
- Wide desktop layouts with panoramic banners, grey search and listing sections, a deep navy footer with white text, and responsive phone layouts.

Property records and images included for demonstration do not establish actual RRC inventory, current availability, asking rents, or approved leasing terms. Supply verified records and owned or licensed property photographs before publication. The leasing and recruitment email addresses were supplied by RRC; confirm mailbox access and the staff responsible for each before launch.

The tenant application flow is a preview: there is no application submission backend, website staff review inbox, file storage service, automated email delivery, or Collo synchronization. Do not enter real applicant information or upload real identity documents while reviewing it. The signed-in Collo account was inaccessible during development, so its actual tenant fields and integration options remain unverified.

## Applications and email routing

| Purpose | Destination | Current website behavior |
| --- | --- | --- |
| Leasing enquiries and tenant applications | `leasing@rosefoodrealtycorp.com` | Contact links open an email application. The multistep tenant application is still a demonstration and does not submit data. |
| Recruitment applications | `recruitment@rosefoodrealtycorp.com` | Applicants choose a listed role, complete the embedded form, and attach a resume. Live delivery requires the server-side email service to be configured; the local preview does not send applications. |
| Property viewing requests | `leasing@rosefoodrealtycorp.com` | The property-specific form sends contact details and the preferred date/time through the optional mail service when configured and enabled. Until then it remains an explicitly unsent preview. A request does not confirm an appointment. |

The intended recruitment experience stays on the website: applicants complete the form and attach their resume there. Zoho is RRC's confirmed email provider. Once its server-side mail settings are configured privately, the backend sends the application and resume attachment directly to `recruitment@rosefoodrealtycorp.com`. Live sending is disabled in this local preview. Do not use real personal information or a real resume for preview testing.

For production tenant intake, the intended sequence is: securely save the application and documents, issue a reference number, acknowledge receipt to the applicant, and notify the leasing mailbox with a link for authorized staff to review. Email notification is not the application record and should not contain identity documents. Only after authorized leasing approval should necessary tenant information move to Collo through a confirmed supported integration or approved staff entry/import.

Recruitment remains separate from tenant intake and Collo. Production recruitment needs configured Zoho mail transport, validated resume uploads, truthful submission status, and a retention process controlled by HR. Recruitment applications must never be routed into Collo. See `EMAIL-SETUP.md` for private mail configuration and `DEPLOYMENT.md` for the implementation handover.

The current vacancy list supplied by RRC is: Project Engineer, Collections Officer, Design Architect, Maintenance Head, Fabrication Head, Leasing Supervisor, Leasing Coordinator, Finance Head, and Accounting Staff. Draft qualifications and job responsibilities were written at RRC's request and are clearly marked for review. HR must approve them before publication; salaries, locations, deadlines and fixed years of experience were not invented. See `JOB-DESCRIPTIONS-DRAFT.md`.

## Administrator access

There is no administrator login or content management system in this version. Properties and vacancies are currently maintained in the source files. `ADMIN-MANAGEMENT-PLAN.md` describes the proposed protected Leasing, HR and Super Administrator access for a production system. `FINAL-REVIEW.md` distinguishes tested preview features from work still needed before public launch.

## Edit and prepare for launch

- `index.html`, `styles.css`, `redesign.css`, and `app.js`: presentation and property browsing. `redesign.css` contains the landscape layout and Renshaw-inspired visual refinements.
- `properties.js`: property records, exposed as `window.RRCProperties`.
- Only records with `available: true` are shown in the public preview. Set it to `false` to remove a space from browsing and applications. The demonstration records use fictional rents, specifications and availability.
- `application.js` and `application.css`: the application experience, exposed as `window.RRCApplication`.
- `careers.js` and `careers.css`: the vacancy list and embedded recruitment form with resume attachment.
- `vacancies.js`: nine role titles, draft overviews, qualifications and responsibilities. Title changes must also be reflected in the allowed positions in `recruitment-mail.mjs` until a shared content database is implemented.
- `viewing-mail.mjs`: validation and optional email delivery of property viewing requests to Leasing.
- `assets/`: local brand, property-image, and font assets.
- `assets/ASSET-NOTES.md`: asset provenance, source-slide references, and limitations.
- `DEPLOYMENT.md`: the remaining production work.
- `PHASE-1-FOUNDATION.md`: the implemented runtime and deployment foundation.
- `EMAIL-SETUP.md`: Zoho recruitment email configuration and verification steps; keep credentials out of website files.

The preview server serves only approved website files and image/font assets, plus recruitment and viewing status/submission API routes. Documentation, server source, and package metadata are not accessible over HTTP. Both mail flows stay disabled until their separate opt-in flags, the mail dependency, and private Zoho settings are present. A configured status does not verify mailbox authentication or inbox delivery; that requires an authorized end-to-end test. Tenant intake and Collo integration remain unimplemented. Saved Properties and its heart buttons have been removed; old saved-page bookmarks lead to all properties.

The local font assets are genuine **Manrope** and **Source Sans 3**, matching the supplied brand book. Manrope was copied unchanged from the installed font; its provenance is documented in `assets/ASSET-NOTES.md`, with license text in `assets/Manrope-OFL.txt`. Source Sans 3 was downloaded from the [official Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/sourcesans3), with its SIL Open Font License in `assets/SourceSans3-OFL.txt`. Fonts are served locally, so viewing the site does not require a Google Fonts request. The source notes distinguish brand-book concept illustrations from actual RRC property photographs.

## Phase 1 runtime foundation

The server remains localhost-only unless `RRC_PUBLIC_ORIGINS` is explicitly configured with exact HTTPS origins. `RRC_BIND_HOST` controls the listening interface and defaults to `127.0.0.1`. The `/healthz` endpoint is suitable for a reverse-proxy or process-manager health check. See `PHASE-1-FOUNDATION.md`; configuring a public origin does not implement authentication, database storage or tenant intake.

## References supplied for this project

- `C:/Users/emman/Desktop/RRC Brand Book.pptx` — brand reference.
- `D:/WALTER CAPILI WORK/RRC PROPERTY MANAGEMENT/Tenant Application Form.docx` — residential application reference.
- `D:/WALTER CAPILI WORK/RRC PROPERTY MANAGEMENT/RRC COMMERCIAL TENANT APPLICATION FORM.docx` — commercial application reference.
- [Renshaw properties for rent](https://www.rentrenshaw.com/properties-for-rent) — leasing layout inspiration; US-specific requirements do not define this Philippine flow.
- [Collo Leasing](https://leasing.collo.ph/) — intended property management destination; direct account access and integration are pending.

The supplied forms informed the application design. Their old logos are not the branding source. RRC leases its own properties; the website does not offer property management services for other owners.
