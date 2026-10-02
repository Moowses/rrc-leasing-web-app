# RRC website — final preview review

Reviewed: 30 September 2026

**The local website preview is ready for RRC review. It is not yet ready for public application intake or independent staff administration.**

## Current state

| Area | Result |
| --- | --- |
| Commercial and Residential browsing | Working locally: category pages, area and budget filters, sorting, property details, photo navigation and viewing-request preview. |
| Recruitment form | Required First name, Last name, Email address, resume attachment and acknowledgement. Optional mobile number and message. PDF, DOC or DOCX, maximum 5 MB. |
| Vacancy information | Nine supplied positions, each with expandable qualifications and job responsibilities. Descriptions are drafts for RRC/HR review. |
| Recruitment email | Server-side sending code prepared for Zoho and fixed to recruitment@rosefoodrealtycorp.com. Private configuration and a real delivery test are still pending; sending is disabled. |
| Viewing email | Server-side sending code prepared for Zoho and fixed to leasing@rosefoodrealtycorp.com. Includes trusted property details, contact information and preferred Philippine date/time. Configuration and a real delivery test are pending; a request never confirms an appointment. |
| Saved Properties | Removed from navigation, listings and property pages. Old saved-page links redirect to all properties. |
| Tenant applications | Both guided application previews work. Secure live submission, leasing notifications and Collo transfer are still pending. |
| Website administration | No admin login or content management system exists yet. Property and vacancy content currently lives in source files. |
| Property content | Six clearly labelled sample listings and illustrative images; replace these with verified RRC inventory and real photographs. |
| Public launch | Not published. The review server is available only on this computer. |

## Checks completed

- Commercial and Residential navigation, combined area/budget filters, empty-result reset, rent sorting within each area, gallery next/previous/escape and viewing-dialog access.
- Navigation to the home page, leasing guide, About, privacy page, lease selection and Careers. Referenced scripts, styles and property images exist.
- Recruitment required-field errors and an explicitly unsent review with separate multi-word first and last names, email and a synthetic PDF resume.
- All nine job detail panels contain four qualifications and five responsibilities; frontend job titles match the server's allowed vacancies.
- Expanded job details, name fields and navigation at 390, 1024 and 1440 px widths, without horizontal page overflow. No browser console errors were observed during these checks.
- Both tenant preview flows passed local lifecycle checks, including commercial fit-out requirements, supporting-document limits and clearing application details on completion/navigation.
- Eleven backend tests passed with synthetic data and fake mail transports, including name/email/resume validation, Unicode names, attachment size/type checks, fixed recipient, mail acceptance/rejection, origin/host checks, rate limiting and private-file restrictions. No Zoho connection or email was sent.
- Corrected the two-photo property layout so both images fill the gallery without a blank grid cell.
- Nine viewing backend tests passed with fake mail transports, covering the fixed Leasing recipient, trusted catalog lookup, contact and calendar validation, Philippine date boundaries, disabled sending, acceptance/rejection, request limits and private-file restrictions. No email was sent.
- Browser verification confirmed the old Saved Properties route redirects to all listings, save controls are absent, and the updated viewing form completes an explicitly unsent preview with optional phone/message fields.

## How administrators will manage the live website

Implement a separate authenticated management area backed by a database and controlled file storage. Leasing staff should manage property details, areas, prices, availability and up to 20 photographs. HR should manage vacancy titles, qualifications, responsibilities and open/closed status. A Super Administrator should manage staff accounts and permissions. Permissions must be enforced by the server, not merely by hiding navigation links.

The recruitment workflow currently targets the HR mailbox directly; an applicant management dashboard is not implemented. See ADMIN-MANAGEMENT-PLAN.md for the proposed setup.

## Remaining work before launch

1. Build administrator authentication, staff permissions and property/vacancy editing backed by persistent storage.
2. Supply real property records and photos; approve the draft job descriptions and final public content.
3. Configure Zoho privately on the production server and verify an authorized recruitment test arrives with its resume attached and a viewing request arrives at Leasing. The two flows have separate activation flags.
4. Implement secure tenant application storage and leasing notifications; confirm the supported Collo transfer or staff-entry process.
5. Configure the approved domain and HTTPS hosting, then verify the complete live workflows.

Supporting files: README.md, JOB-DESCRIPTIONS-DRAFT.md, ADMIN-MANAGEMENT-PLAN.md, EMAIL-SETUP.md and DEPLOYMENT.md.
