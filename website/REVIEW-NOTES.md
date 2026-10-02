# RRC website review

The current version is a complete interactive frontend preview, using the current brand-book logo, Manrope headings and Source Sans 3 body text. It uses panoramic banners, wide desktop layouts, grey search and listing sections, and a deep navy footer with white text. Large controls, Philippine pesos and square metres are retained.

## Implemented

- Commercial and Residential entry points on the homepage.
- Available sample properties grouped by area, with search, budget and property-type filters, sorting within each area.
- Property detail pages, a photo gallery with thumbnails and keyboard navigation, and a maximum of 20 unique photos per property.
- Separate commercial and residential application paths with five steps, conditional fields, validation, document-selection checks, editable review and an honest preview completion.
- Viewing-request preview and a responsive mobile menu.
- Careers navigation and homepage section, nine user-supplied vacancies, and an embedded recruitment form with resume attachment.
- Separate leasing and recruitment contact addresses, plus an optional server-side Zoho recruitment mail service. Mail delivery is disabled until privately configured.

## Verified

Desktop browser checks covered category navigation, combined area/budget filtering and empty results, rent sorting, property details and next-photo navigation. Both commercial and residential applications completed using synthetic data. Checks covered required-field errors, retained answers after Back, commercial fit-out questions, DTI guidance, residential pet details, document checklists and review acknowledgement. No browser console errors were observed in these flows.

The phone layout was checked at 390 px wide for the homepage, listings and application form; no horizontal page overflow was observed. Static checks covered safe routing, restricted file serving, the gallery cap, markup escaping, attachment limits and application cleanup. The area-reset and application-restart issues found during review were fixed and regression checked.

This is not a claim of production security certification or exhaustive browser compatibility testing.

## Landscape visual revision

The Renshaw rental page was inspected for its panoramic banner, horizontal search controls, rent badges, viewing buttons, application links and dark footer. These patterns were adapted to RRC branding and Philippine leasing. Renshaw branding, US locations and owner-management services were not copied.

The revised listing layout was checked at 1024 px and 1440 px desktop widths. At 1024 px, neither the page nor the search panel or card action rows had horizontal overflow. The area filter and new Find a space button returned the expected sample result; its Request a viewing button opened the correct property dialog, and Apply online opened that property's commercial application. No browser console errors were observed in these checks. Updated homepage and footer preview images accompany the delivery.

## Pending before launch

1. Replace the clearly marked sample properties and concept imagery with verified available RRC inventory and up to 20 real photos per property.
2. Inspect the authorized Collo tenant/application screens and confirm its supported API or import method. The available browser could not load the supplied Collo URL and did not expose the user's signed-in session.
3. Confirm application fields and document requirements, actual leasing terms, contact details and the approved privacy notice.
4. Connect the tenant application backend, private document storage and staff review workflow. Configure and verify Zoho recruitment delivery separately using EMAIL-SETUP.md; publish to the chosen domain only after each live submission flow is verified.

## Recruitment verification

The Careers page lists Project Engineer, Collections Officer, Design Architect, Maintenance Head, Fabrication Head, Leasing Supervisor, Leasing Coordinator, Finance Head and Accounting Staff. Job titles were supplied by RRC. Draft qualifications and responsibilities were subsequently written at RRC's request and labelled for review; salaries, deadlines and locations were not invented.

Browser checks covered selecting Maintenance Head, required-field messages, selecting a synthetic PDF resume, consent, and the explicitly unsent preview review. Editing and switching to Accounting Staff retained the details and selected resume; leaving and returning cleared the form. The page had no horizontal overflow at 390, 1024 and 1440 px widths, and no browser console errors were observed.

Nine backend tests passed using injected fake mail transports: disabled configuration, all nine positions, optional phone, a 5 MiB attachment, rejected invalid input and files, fixed recipient, SMTP acceptance/rejection, request limits, origin/host checks, and private-file denial. These tests did not connect to Zoho or send email. End-to-end email delivery remains unverified until an authorized test is performed with privately configured Zoho settings.

## Final review updates

The recruitment form now requires separate first and last names, email, resume and acknowledgement. A synthetic browser application with a multi-word first name and surname and a PDF attachment reached the explicitly unsent review screen, showing each name separately. All nine vacancy panels contain qualifications and job responsibilities. Backend tests were expanded to 11 passing checks, including separate required names, Unicode/apostrophe names and header-injection rejection. Both commercial and residential tenant preview flows passed the local lifecycle checks. Filters, empty-result reset, sorting within areas, photo navigation and viewing-dialog access were checked in the browser. Two-photo gallery layout was corrected to fill the available grid.

There is no administrator login or CMS. FINAL-REVIEW.md and ADMIN-MANAGEMENT-PLAN.md record the current state and the remaining production work.

The older application-form logos were not used. Source documents were preserved. The website offers RRC's own spaces and does not advertise management services for other property owners.

## IT handover and viewing email update

Saved Properties and all heart controls have been removed. Old saved-page bookmarks redirect to all listings, and only the obsolete saved-property storage key is cleared. The browser verified the redirect and removed controls.

Viewing requests now have a separate optional server email flow to leasing@rosefoodrealtycorp.com using the shared private Zoho configuration. Name, email, an available property and preferred Philippine date/time are validated; phone and message are optional. Server-owned property data is used in the email. The request is never treated as an appointment confirmation. Nine fake-transport backend tests passed, and the disabled browser flow correctly showed an unsent preview. The viewing dialog and page had no horizontal overflow at 390 px.

No real email or Zoho connection was made. Hosting adaptation, private mail configuration, controlled inbox tests, real content, staff administration and secure tenant intake remain required. The IT handover ZIP includes source, assets, environment template, repeatable tests and installation notes.
