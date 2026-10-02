# RRC website administration plan

## Current preview

The website currently has no administrator login or content management system. Property listings are maintained in `properties.js`, and vacancies and their descriptions are maintained in `vacancies.js`. Updating these files changes the website content; staff cannot yet edit listings through a private dashboard.

Recruitment applications are intended to go directly to `recruitment@rosefoodrealtycorp.com` through Zoho, with the applicant’s résumé attached. Live delivery still requires private server configuration and a successful delivery test. There is no applicant dashboard or stored recruitment inbox in the website yet. A tenant application review dashboard is also future work.

## Proposed production setup

Use one protected administration area with separate staff accounts and permissions:

| Account | Management access |
| --- | --- |
| Leasing | Add and edit RRC properties, categories and areas, rental information, availability, descriptions, and up to 20 photos per listing. Access only leasing applications if an application dashboard is implemented. |
| HR / Recruitment | Add and edit vacancies, qualifications, and job roles; open or close vacancies. Access only recruitment applications if an applicant dashboard is implemented. |
| Super administrator | Create and disable staff accounts, assign access permissions, and manage website configuration. |

Closing a vacancy should remove its application option while retaining the record for HR. Marking a property unavailable should stop new applications for that listing while retaining its history. Changes should be logged with the staff account and time.

## Required implementation

- A server and database to save property, vacancy, and account changes.
- Authenticated staff login with server-enforced permissions, secure sessions, and account recovery; a hidden URL alone is not protection.
- Controlled photo and document uploads, including type and size checks, private application attachments, and authorized access.
- Private email configuration for Zoho, clear delivery status, and tested receipt of résumé attachments by Recruitment.
- Backups, a staff activity log, and agreed retention and deletion rules for applicant information.

The practical next build is property and vacancy management first. Application dashboards can then be added if RRC wants staff to review submissions within the website; email delivery alone does not create those dashboards. This is a proposed setup, not a currently available administrator login.
