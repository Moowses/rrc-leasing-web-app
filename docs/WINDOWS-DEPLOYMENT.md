# Windows Server deployment

Release branch: `release/rrc-nextjs-windows` in `https://github.com/Moowses/rrc-leasing-web-app`.

This release uses `Front end` (Next.js on loopback port 4181) and `Backend` (Fastify on loopback port 4180). Apache serves the public HTTPS hostname and forwards to Next.js. Use the existing PostgreSQL database and existing server staff accounts. Local laptop accounts, SMTP credentials, `.env` files, dependencies, build output, backups, and `Archive` are not included in Git.

## 1. Fetch into a separate release folder

Run PowerShell as Administrator on the server. Use the installed Git executable if `git` is not on PATH.

```powershell
$releaseRoot = 'C:\RRC Web Server\rrc-nextjs-release'
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$npmExe = 'C:\Program Files\nodejs\npm.cmd'
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
git clone --branch release/rrc-nextjs-windows --single-branch https://github.com/Moowses/rrc-leasing-web-app.git $releaseRoot
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed.' }
```

For later updates, run `git pull --ff-only` inside that release folder. Keep the previous `rrc-leasing-web-app` checkout for rollback.

## 2. Preserve server configuration and take a database backup

Copy the existing server environment file once into the new backend:

```powershell
$backendDir = Join-Path $releaseRoot 'Backend'
$frontendDir = Join-Path $releaseRoot 'Front end'
Copy-Item -LiteralPath 'C:\RRC Web Server\rrc-leasing-web-app\platform\.env.production' -Destination (Join-Path $backendDir '.env.production')
notepad (Join-Path $backendDir '.env.production')
```

Set these values in `Backend/.env.production`, preserving the existing `DATABASE_URL` and private SMTP settings:

```dotenv
NODE_ENV=production
PORT=4180
RRC_PLATFORM_ORIGINS=https://rosefoodrealtycorp.com,https://www.rosefoodrealtycorp.com
RRC_PUBLIC_SITE_ORIGIN=https://rosefoodrealtycorp.com
```

The backend mailer uses `RRC_OPERATIONAL_EMAIL_ENABLED`, `RRC_SMTP_HOST`, `RRC_SMTP_PORT`, `RRC_SMTP_USER`, `RRC_SMTP_PASSWORD`, `RRC_SMTP_FROM`, `RRC_LEASING_RECIPIENT`, and `RRC_RECRUITMENT_RECIPIENT`. Confirm these names in the server file; `MAIL_*` aliases alone do not configure this backend.

Create `Front end/.env.production` in Notepad with:

```dotenv
NODE_ENV=production
RRC_PLATFORM_API_ORIGIN=http://127.0.0.1:4180
```

Take a PostgreSQL custom-format backup of `rrc_platform` using the server's existing backup process or `pg_dump -Fc`, and verify that the backup file exists before step 4. Keep the server's private environment files and exported Scheduled Task XML with the rollback material. Do not copy the laptop database over the server database.

## 3. Install and build before cutover

```powershell
Set-Location -LiteralPath $backendDir
& $npmExe ci
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
& $nodeExe --env-file=.env.production .\node_modules\prisma\build\index.js generate
if ($LASTEXITCODE -ne 0) { throw 'Prisma generation failed.' }
& $npmExe run build
if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }

Set-Location -LiteralPath $frontendDir
& $npmExe ci
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
& $npmExe run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
```

If updating an already running release, stop the API before `npm ci` or `prisma generate` so Windows releases the Prisma DLL. Stop the Next.js task before replacing its production build. Run the commands in the order shown; do not continue after a native command fails.

## 4. Apply migrations and point Scheduled Tasks to the new code

After the backup, during the cutover window:

```powershell
Stop-ScheduledTask -TaskName 'RRC Leasing Platform'
Stop-ScheduledTask -TaskName 'RRC Leasing Website'
Set-Location -LiteralPath $backendDir
& $nodeExe --env-file=.env.production .\node_modules\prisma\build\index.js migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed. Do not start the release.' }

$backendArgs = '--env-file="' + (Join-Path $backendDir '.env.production') + '" --enable-source-maps "' + (Join-Path $backendDir 'dist\server.js') + '"'
$nextCli = Join-Path $frontendDir 'node_modules\next\dist\bin\next'
$frontendArgs = '"' + $nextCli + '" start -H 127.0.0.1 -p 4181'
$backendAction = New-ScheduledTaskAction -Execute $nodeExe -Argument $backendArgs -WorkingDirectory $backendDir
$frontendAction = New-ScheduledTaskAction -Execute $nodeExe -Argument $frontendArgs -WorkingDirectory $frontendDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'RRC Leasing Platform' -Action $backendAction -Trigger $trigger -Principal $principal -Settings $settings -Force
Register-ScheduledTask -TaskName 'RRC Leasing Website' -Action $frontendAction -Trigger $trigger -Principal $principal -Settings $settings -Force
Start-ScheduledTask -TaskName 'RRC Leasing Platform'
Start-ScheduledTask -TaskName 'RRC Leasing Website'
```

The migration chain retains all six previous migrations and adds the operations migration. Do not use `migrate reset` or `db push` on the server.

## 5. Route this site's Apache virtual host to Next.js

Back up the Apache virtual-host file. In the HTTPS virtual host for `rosefoodrealtycorp.com`, preserve its certificate paths and ACME challenge handling, remove the older RRC-specific `/admin` and `/api` proxy overrides, and use:

```apache
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
ProxyPass /.well-known/acme-challenge/ !
ProxyPass / http://127.0.0.1:4181/
ProxyPassReverse / http://127.0.0.1:4181/
```

This block belongs only in the RRC virtual host; other hosted sites keep their existing routing. Retain the existing HTTP-to-HTTPS redirect and ACME document root or alias.

Next.js now sends its own CSP with a fresh script/style nonce on each HTML response. Remove the old static `Header set/always set Content-Security-Policy ...` directive for this virtual host, including any inherited RRC-specific override. A second static `script-src 'self'` policy will block the Next.js startup scripts even when the application sends a valid nonce policy. Inspect the final HTTPS response: there should be one application CSP containing a nonce, not the old static policy. Keep the other Apache security headers and TLS settings.

```powershell
& 'C:\WebServer\apache\bin\httpd.exe' -t
if ($LASTEXITCODE -ne 0) { throw 'Apache configuration check failed.' }
Restart-Service -Name 'Apache2.4'
```

## 6. Verify the server release

```powershell
Invoke-WebRequest 'http://127.0.0.1:4180/healthz' -UseBasicParsing | Select-Object StatusCode,Content
Invoke-WebRequest 'http://127.0.0.1:4181/' -UseBasicParsing | Select-Object StatusCode
Get-ScheduledTask -TaskName 'RRC Leasing Platform','RRC Leasing Website' | Select-Object TaskName,State
```

Open `https://rosefoodrealtycorp.com/admin` and sign in using the existing server account. The local laptop's newly created account is not transferred by a code push. If an authorized server operator needs to create/reset a staff account, use the included password-masked helper:

```powershell
Set-Location -LiteralPath $backendDir
& $nodeExe --env-file=.env.production .\dist\manage-staff.js --email 'itadmin@rrc.local' --name 'RRC Super Admin' --role SUPER_ADMIN
```

That helper activates the specified account, sets the password entered at the prompt, clears that account's existing sessions, and records an audit event. Run it only when the server account needs creation/reset.

Use synthetic details to check a viewing, application with an attachment, review step, applicant/office email, admin notification, and resubmission link after cutover. Check the browser console for blocked CSP resources. The server must run the built services shown above, not `npm run dev`.

## Rollback

Stop the two release tasks, restore their exported previous XML/actions and the previous Apache virtual-host configuration, start the previous tasks, and validate/restart Apache. Preserve the additive database migration and all data when reverting code. Do not restore the database backup over newer submissions as a routine code rollback; database restoration is a separate recovery operation.
