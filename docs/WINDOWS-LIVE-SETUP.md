# Installed Windows Server setup

Deployment verified on 12 October 2026. Application code: `4b71f95` on `main`.

## Active installation

- Server: `192.168.1.8`.
- Repository: `C:\RRC Web Server\rrc-leasing-web-app`.
- Next.js: `Front end`, bound to `127.0.0.1:4181`, running the production build (not development/watch mode).
- API: `Backend`, bound to `127.0.0.1:4180`.
- Database: the existing `rrc_platform` PostgreSQL database. It was not reset or replaced.
- Private settings: `Backend\.env.production` and `Front end\.env.production`, readable by Administrators and SYSTEM; not in Git.
- Scheduled tasks: `RRC Leasing Platform` and `RRC Leasing Website`, running as SYSTEM with startup triggers and restart-on-failure settings.
- Public site: `https://rosefoodrealtycorp.com/`.
- Staff dashboard: `https://rosefoodrealtycorp.com/admin`.

Only the canonical RRC HTTPS virtual host was changed to forward to Next.js. Its certificates, HTTP redirect, www redirect, and the other hosted sites were preserved.

## Preserved data and recovery material

The upgrade preserved six properties, six units, six leasing/viewing requests, two documents, and one staff account. Document/image byte totals, staff/password hashes, and unit price/availability hashes matched the pre-upgrade baseline. The existing Super Admin account was not reset.

Recovery folder: `C:\RRC Web Server\RRC-Backups\20261012-121906`.

It contains a verified PostgreSQL custom-format backup, the previous private environment file, exported scheduled tasks, Apache configuration backups, tracked legacy source, and the recoverably archived `legacy-platform` and `legacy-website` folders. Nothing was permanently deleted. The active repository remained at its original location; do not move that whole folder using the separate-release cleanup example in `WINDOWS-DEPLOYMENT.md`.

## Checks completed

- Homepage, admin HTML, catalogue, and an existing listing image returned HTTP 200 over certificate-validated HTTPS using the server's loopback address with the correct hostname/SNI.
- The public catalogue contained all six listings.
- Unauthenticated staff API access returned HTTP 401.
- Old resubmission paths redirected to the new fragment-token URL.
- HTML had one nonce-based CSP; its script nonces matched and no development HMR client was present.
- Zoho SMTP connection and authentication passed with the existing credentials. The old `RRC_SMTP_USERNAME` and `RRC_SMTP_FROM_ADDRESS` settings were mapped to the new `RRC_SMTP_USER` and `RRC_SMTP_FROM` names. No test email or real application was submitted during deployment, so inbox delivery is not proven by this authentication check.

The dependency audit reported three high-severity entries in the Prisma tooling dependency chain. No automatic dependency or major-version upgrade was performed during the production cutover; this requires a separately tested maintenance update.

## Office access

At deployment time the development laptop's Ethernet adapter used public DNS, resolving the hostname to `136.239.185.10`. Inside the office, that route reached the router and produced a certificate warning. Querying pfSense at `192.168.1.1` instead returned the configured internal website address, `192.168.1.8`.

The user chose to leave laptop DNS unchanged. No hosts-file override, certificate bypass, or router change was applied. Normal domain access from that laptop therefore remains a network-routing limitation, separate from the verified server deployment. Browser UI sign-in on the live hostname was not tested through that blocked route.

## Restart and health checks

Run PowerShell as Administrator on the server. There is no `Restart-ScheduledTask` cmdlet; stop and start the tasks explicitly:

```powershell
Stop-ScheduledTask -TaskName 'RRC Leasing Platform'
Stop-ScheduledTask -TaskName 'RRC Leasing Website'
Start-ScheduledTask -TaskName 'RRC Leasing Platform'
Start-ScheduledTask -TaskName 'RRC Leasing Website'

Invoke-WebRequest 'http://127.0.0.1:4180/healthz' -UseBasicParsing | Select-Object StatusCode,Content
Invoke-WebRequest 'http://127.0.0.1:4181/' -UseBasicParsing | Select-Object StatusCode
Get-ScheduledTask -TaskName 'RRC Leasing Platform','RRC Leasing Website' | Select-Object TaskName,State
```

For later code updates, stop both tasks before dependency installation/building, take a new database backup before migrations, install build dependencies with `npm ci --include=dev`, explicitly generate Prisma, build both projects, and use only `prisma migrate deploy`. Check every command's exit code before continuing. Keep the two server environment files and existing database. Do not run `migrate reset`, `db push`, sample seeding, or a staff password reset as part of an update.

Apache logs for this site are `C:\WebServer\apache\logs\rosefoodrealtycorp.com-ssl-error.log` and `rosefoodrealtycorp.com-ssl-access.log`. Application email delivery records are available in the admin dashboard; SMTP authentication alone does not establish recipient delivery.
