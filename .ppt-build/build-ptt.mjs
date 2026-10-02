import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const { SKILL_DIR, TMP_DIR, WORKSPACE_DIR, FINAL_PPTX } = process.env;
const { resolvePresentationFont } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
const family = resolvePresentationFont({ fontFamily: 'Manrope' });
const bodyFamily = 'Source Sans 3';
const W = 1280, H = 720;
const C = { navy: '#102A43', navy2: '#173F5F', ink: '#172B4D', teal: '#2A9D8F', sky: '#E8F1F5', mist: '#F5F7F8', line: '#D6E0E5', white: '#FFFFFF', gold: '#D7A84B', red: '#B54747', green: '#2F855A' };
const logoNavy = await fs.readFile(path.join(WORKSPACE_DIR, 'website/assets/rrc-logo-navy.png'));
const logoWhite = await fs.readFile(path.join(WORKSPACE_DIR, 'website/assets/rrc-logo-white.png'));

const p = Presentation.create({ slideSize: { width: W, height: H } });
const rect = (s, x, y, w, h, fill, radius = 0, line = 'none') => s.shapes.add({ geometry: radius ? 'roundRect' : 'rect', position: { left: x, top: y, width: w, height: h }, fill, borderRadius: radius || undefined, line: line === 'none' ? { fill: 'none', width: 0 } : { fill: line, width: 1 } });
const line = (s, x1, y1, x2, y2, color = C.line, width = 2) => s.shapes.add({ geometry: 'line', position: { left: x1, top: y1, width: x2 - x1, height: y2 - y1 }, line: { fill: color, width } });
const text = (s, value, x, y, w, h, size = 24, color = C.ink, opts = {}) => { const sh = s.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { fill: 'none', width: 0 } }); sh.text = value; sh.text.style = { typeface: opts.typeface || bodyFamily, fontSize: size, color, bold: !!opts.bold, alignment: opts.align || 'left', verticalAlignment: opts.valign || 'top', lineSpacing: opts.lineSpacing || 1.08 }; return sh; };
const logo = (s, bytes, x, y, w, h) => s.images.add({ blob: bytes, contentType: 'image/png', alt: 'Rosefood Realty Corporation logo', fit: 'contain', position: { left: x, top: y, width: w, height: h } });
const footer = (s, n, dark = false) => { text(s, 'ROSEFOOD REALTY CORPORATION', 64, 684, 360, 18, 11, dark ? '#D8E4EA' : '#69808D', { bold: true, typeface: family }); text(s, `PTT presentation  |  ${String(n).padStart(2, '0')}`, 930, 684, 285, 18, 11, dark ? '#D8E4EA' : '#69808D', { align: 'right', typeface: family }); };
const title = (s, kicker, heading, sub = '') => { text(s, kicker.toUpperCase(), 64, 42, 450, 20, 12, C.teal, { bold: true, typeface: family }); text(s, heading, 64, 76, 1120, 64, 34, C.navy, { bold: true, typeface: family }); if (sub) text(s, sub, 66, 143, 980, 34, 18, '#526777', { typeface: bodyFamily }); };
const note = (s, value) => s.speakerNotes.textFrame.setText(value);
const pill = (s, label, x, y, w, fill, color = C.white) => { rect(s, x, y, w, 28, fill, 14); text(s, label, x, y + 5, w, 18, 12, color, { bold: true, align: 'center', typeface: family }); };

// 1 Cover
{ const s = p.slides.add(); s.background.fill = C.navy; rect(s, 0, 0, 18, H, C.teal); logo(s, logoWhite, 64, 54, 145, 78); text(s, 'PROPERTY OPERATIONS\nPLATFORM', 64, 190, 720, 150, 46, C.white, { bold: true, typeface: family, lineSpacing: 0.95 }); text(s, 'PTT presentation for Walter', 68, 372, 520, 32, 24, '#C6D6DF', { typeface: bodyFamily }); text(s, 'A practical roadmap from the current website to a connected leasing, renter and accounting workflow', 68, 430, 620, 65, 22, C.white, { typeface: bodyFamily }); rect(s, 846, 104, 330, 490, C.navy2, 24); text(s, 'RRC', 900, 184, 220, 112, 92, C.teal, { bold: true, typeface: family, align: 'center' }); line(s, 910, 330, 1114, 330, '#4B6B80', 2); text(s, 'Website\nAvailability\nLeasing\nBilling\nRenter access', 910, 370, 200, 150, 25, C.white, { bold: true, typeface: family, align: 'center', lineSpacing: 1.3 }); text(s, '30 September 2026', 68, 650, 300, 20, 13, '#C6D6DF', { typeface: bodyFamily }); note(s, 'Purpose: introduce the proposed property operations platform. Current project materials support the website and preview workflows. The platform roadmap is a proposed direction for discussion, not an existing feature claim.'); }

// 2 Current state
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Current state', 'The website is the public front door', 'The next step is to connect the work behind the website.'); rect(s, 64, 220, 510, 350, C.mist, 20); logo(s, logoNavy, 104, 252, 160, 70); text(s, 'What exists today', 104, 346, 330, 30, 24, C.navy, { bold: true, typeface: family }); text(s, '• Property browsing and area filters\n• Commercial and residential application previews\n• Careers form with optional email delivery\n• Viewing request workflow\n• Local preview server and tests', 104, 394, 400, 140, 20, C.ink, { typeface: bodyFamily, lineSpacing: 1.25 }); rect(s, 648, 220, 568, 350, C.navy, 20); text(s, 'What staff still need', 696, 258, 430, 30, 24, C.white, { bold: true, typeface: family }); text(s, '• One trusted property and unit record\n• Availability managed by authorized staff\n• Application-to-lease tracking\n• Monthly billing and payment review\n• Renter communication and reports', 696, 312, 470, 170, 21, '#E6EFF3', { typeface: bodyFamily, lineSpacing: 1.3 }); pill(s, 'PROPOSED DIRECTION', 696, 510, 190, C.teal); footer(s, 2); note(s, 'The current handover documents describe the website as a preview and explicitly identify the missing administration, tenant intake and Collo work.'); }

// 3 platform view
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Platform view', 'One operating model connects four experiences', 'Each team sees the work that belongs to them.'); const items = [
  ['PUBLIC WEBSITE', 'Availability, property details, viewing requests', C.sky, C.navy],
  ['STAFF PORTAL', 'Leasing, accounting, maintenance and reports', '#EAF5F2', C.navy],
  ['RENTER PORTAL', 'Lease, bills, payment proof and requests', '#F8F1E4', C.navy],
  ['SHARED RECORDS', 'Properties, units, leases, charges and audit history', C.navy, C.white],
];
  items.forEach((it, i) => { const x = 64 + (i % 2) * 590, y = 230 + Math.floor(i / 2) * 190; rect(s, x, y, 520, 130, it[2], 18); text(s, it[0], x + 28, y + 24, 450, 20, 13, it[3] === C.white ? C.teal : C.teal, { bold: true, typeface: family }); text(s, it[1], x + 28, y + 54, 455, 52, 24, it[3], { bold: true, typeface: family }); }); line(s, 584, 360, 696, 360, C.teal, 3); line(s, 640, 294, 640, 426, C.teal, 3); text(s, 'The record moves with the property, unit and lease. Staff do not rebuild the same information in separate spreadsheets.', 350, 610, 580, 40, 18, '#526777', { align: 'center', typeface: bodyFamily }); footer(s, 3); note(s, 'This is the proposed product boundary: the public website remains a customer-facing channel while protected portals operate the leasing lifecycle.'); }

// 4 record model
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Data model', 'Availability starts with one trusted property record', 'An area can contain many properties, units and leases.'); const levels = [
  ['AREA', 'Davao City · Indangan', C.sky], ['PROPERTY', 'RRC-owned building or development', '#EAF5F2'], ['UNIT / SPACE', 'C-101 · commercial · available', '#F8F1E4'], ['LEASE', 'approved renter · term · rent', '#EFEAF5'], ['BILLING', 'monthly charges · payment status', C.navy]
];
levels.forEach((it, i) => { const y = 205 + i * 78, x = 126 + i * 45, w = 960 - i * 90; rect(s, x, y, w, 56, it[2], 14); text(s, it[0], x + 22, y + 9, 150, 18, 12, it[2] === C.navy ? C.teal : C.teal, { bold: true, typeface: family }); text(s, it[1], x + 180, y + 8, w - 210, 30, 21, it[2] === C.navy ? C.white : C.navy, { bold: true, typeface: family }); }); text(s, 'When availability changes, the public listing, leasing queue and reporting view update from the same source.', 180, 612, 920, 42, 20, C.ink, { align: 'center', typeface: bodyFamily }); footer(s, 4); note(s, 'This hierarchy is a proposed foundation for the CMS and property operations database.'); }

// 5 roles
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Roles', 'The system makes ownership visible', 'Permissions follow the work, not just the screen.'); const rows = [
  ['Leasing / Property', 'Listings, availability, applications, leases', C.sky],
  ['Accounting', 'Bills, adjustments, payment review, reports', '#EAF5F2'],
  ['Maintenance', 'Requests, assignments, costs, completion', '#F8F1E4'],
  ['Renter', 'Lease, bills, payment proof, requests', '#EFEAF5'],
  ['Super Admin', 'Staff accounts, settings, audit access', C.navy],
];
  rect(s, 64, 206, 1152, 52, C.navy, 10); text(s, 'ROLE', 94, 222, 250, 20, 13, C.white, { bold: true, typeface: family }); text(s, 'PRIMARY RESPONSIBILITY', 410, 222, 600, 20, 13, C.white, { bold: true, typeface: family });
  rows.forEach((r, i) => { const y = 258 + i * 66; rect(s, 64, y, 1152, 62, r[2], i === rows.length - 1 ? 10 : 0, i === rows.length - 1 ? r[2] : C.line); text(s, r[0], 94, y + 19, 280, 22, 20, r[2] === C.navy ? C.white : C.navy, { bold: true, typeface: family }); text(s, r[1], 410, y + 20, 700, 22, 19, r[2] === C.navy ? '#E6EFF3' : C.ink, { typeface: bodyFamily }); }); text(s, 'Every change is attributable to a staff member and timestamped.', 64, 610, 700, 28, 18, '#526777', { typeface: bodyFamily }); footer(s, 5); note(s, 'Proposed role separation prevents HR, Leasing, Accounting and Maintenance from seeing or changing records outside their responsibility.'); }

// 6 renter journey
{ const s = p.slides.add(); s.background.fill = C.navy;
  text(s, 'RENTER DASHBOARD', 64, 42, 450, 20, 12, C.teal, { bold: true, typeface: family }); text(s, 'A clear path from approval to payment', 64, 76, 1120, 64, 34, C.white, { bold: true, typeface: family }); text(s, 'The renter sees the same lease record that Accounting manages.', 66, 143, 980, 34, 18, '#C6D6DF', { typeface: bodyFamily });
  const steps = [['01', 'Lease approved', 'Renter receives a secure invite'], ['02', 'Bill issued', 'Monthly rent and other charges appear'], ['03', 'Payment submitted', 'Renter uploads proof and payment details'], ['04', 'Accounting review', 'Staff approve, reject or request clarification']];
  steps.forEach((it, i) => { const x = 64 + i * 292; rect(s, x, 245, 252, 250, i === 3 ? '#244B63' : '#173F5F', 18); text(s, it[0], x + 26, 270, 60, 30, 26, C.teal, { bold: true, typeface: family }); text(s, it[1], x + 26, 330, 200, 60, 23, C.white, { bold: true, typeface: family }); text(s, it[2], x + 26, 412, 195, 55, 18, '#C6D6DF', { typeface: bodyFamily }); }); text(s, 'Bill status and notifications stay visible until the next action is complete.', 250, 570, 780, 32, 20, C.white, { align: 'center', typeface: bodyFamily }); footer(s, 6, true); note(s, 'First release recommendation: accept payment proof and reconcile manually. Direct payment processing can follow after RRC selects an approved provider and confirms finance requirements.'); }

// 7 billing
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Billing and accounting', 'Bills become a controlled monthly workflow', 'Accounting can explain every amount and every status.'); rect(s, 64, 220, 430, 320, C.navy, 18); text(s, 'MONTHLY BILL', 104, 258, 300, 20, 13, C.teal, { bold: true, typeface: family }); text(s, 'C-101 · August 2026', 104, 304, 320, 34, 25, C.white, { bold: true, typeface: family }); line(s, 104, 360, 436, 360, '#4B6B80', 1); text(s, 'Monthly rent                  ₱45,000\nUtilities                         ₱3,200\nOther charge                    ₱1,000', 104, 386, 300, 95, 20, '#E6EFF3', { typeface: bodyFamily, lineSpacing: 1.35 }); text(s, 'TOTAL DUE                  ₱49,200', 104, 510, 310, 24, 20, C.white, { bold: true, typeface: family }); rect(s, 580, 220, 636, 320, C.mist, 18); text(s, 'Accounting controls', 622, 258, 430, 28, 25, C.navy, { bold: true, typeface: family }); text(s, '• Recurring rent rules\n• Utility and one-time adjustments\n• Due dates and overdue status\n• Payment proof review\n• Receipt and reconciliation history\n• Property-level reporting', 622, 315, 500, 175, 20, C.ink, { typeface: bodyFamily, lineSpacing: 1.28 }); pill(s, 'AUDITABLE', 622, 496, 110, C.teal); footer(s, 7); note(s, 'Illustrative bill only. Amounts are examples for explaining the proposed workflow and do not represent approved RRC rates.'); }

// 8 workflow
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Notifications', 'The right person receives the next action', 'The system should reduce follow-up work, not create another inbox.'); const blocks = [
  ['NEW VIEWING', 'Leasing', 'Review request and confirm schedule', C.sky],
  ['NEW APPLICATION', 'Leasing', 'Review documents and decision status', '#EAF5F2'],
  ['NEW BILL', 'Renter', 'Open bill and submit payment proof', '#F8F1E4'],
  ['PAYMENT SUBMITTED', 'Accounting', 'Review proof and reconcile invoice', '#EFEAF5'],
  ['MAINTENANCE UPDATE', 'Renter + Maintenance', 'Confirm access or completion', C.navy],
];
  blocks.forEach((b, i) => { const y = 205 + i * 74; rect(s, 64, y, 280, 56, b[3], 12); text(s, b[0], 86, y + 18, 240, 18, 13, b[3] === C.navy ? C.teal : C.teal, { bold: true, typeface: family }); rect(s, 394, y, 220, 56, C.white, 12, C.line); text(s, b[1], 414, y + 18, 180, 20, 18, C.navy, { bold: true, typeface: family }); rect(s, 664, y, 552, 56, C.mist, 12); text(s, b[2], 690, y + 18, 500, 20, 18, C.ink, { typeface: bodyFamily }); }); footer(s, 8); note(s, 'Notifications should be in-app first, with email delivery and delivery status as a secondary channel.'); }

// 9 roadmap
{ const s = p.slides.add(); s.background.fill = C.white; title(s, 'Roadmap', 'Build the operating core in controlled phases', 'Each phase creates a usable capability before the next one begins.'); const phases = [
  ['1', 'Foundation', 'Hosting, database, authentication, roles, audit log', C.navy],
  ['2', 'Property CMS', 'Areas, properties, units, photos, availability', C.teal],
  ['3', 'Leasing', 'Applications, approvals, leases, renter invitations', C.navy2],
  ['4', 'Renter portal', 'Bills, payment proof, notifications, maintenance', C.teal],
  ['5', 'Accounting', 'Recurring billing, reconciliation, reports, exports', C.navy2],
];
  phases.forEach((it, i) => { const x = 64 + i * 230; rect(s, x, 250, 190, 240, it[3], 18); text(s, it[0], x + 24, 276, 44, 42, 34, C.white, { bold: true, typeface: family }); text(s, it[1], x + 24, 344, 145, 52, 23, C.white, { bold: true, typeface: family }); text(s, it[2], x + 24, 420, 142, 62, 17, '#E6EFF3', { typeface: bodyFamily }); }); text(s, 'Direct online payments and Collo integration follow once the core records and approval controls are stable.', 184, 570, 910, 34, 19, '#526777', { align: 'center', typeface: bodyFamily }); footer(s, 9); note(s, 'Roadmap sequence is proposed. Production sequencing may change after hosting, Collo and accounting requirements are confirmed.'); }

// 10 decision
{ const s = p.slides.add(); s.background.fill = C.navy; logo(s, logoWhite, 64, 54, 145, 78); text(s, 'DECISION REQUEST', 64, 188, 400, 20, 13, C.teal, { bold: true, typeface: family }); text(s, 'Approve the direction\nfor a connected\nproperty operations system', 64, 235, 760, 200, 42, C.white, { bold: true, typeface: family, lineSpacing: 0.98 }); text(s, 'The current website remains the public front door. The new platform gives Leasing, Accounting, Maintenance and renters one controlled workflow.', 68, 470, 720, 62, 21, '#C6D6DF', { typeface: bodyFamily }); rect(s, 906, 190, 270, 300, '#173F5F', 20); text(s, 'First approval needed', 940, 230, 210, 25, 18, C.teal, { bold: true, typeface: family }); text(s, '1  Confirm roles\n2  Confirm billing rules\n3  Confirm hosting\n4  Confirm renter process', 940, 286, 210, 150, 23, C.white, { typeface: bodyFamily, lineSpacing: 1.35 }); text(s, 'Next step: Phase 1 foundation and product requirements workshop', 68, 650, 800, 20, 15, '#C6D6DF', { typeface: bodyFamily }); footer(s, 10, true); note(s, 'Decision request: confirm that RRC wants to proceed with a property operations platform, then schedule a requirements workshop with Leasing, Accounting and Maintenance.'); }

await fs.mkdir(TMP_DIR, { recursive: true });
const candidate = path.join(TMP_DIR, 'rrc-property-operations-ptt-draft.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
for (let i = 0; i < p.slides.items.length; i++) { const preview = await p.export({ slide: p.slides.items[i], format: 'png', scale: 1 }); await fs.writeFile(path.join(TMP_DIR, `slide-${i + 1}.png`), new Uint8Array(await preview.arrayBuffer())); }
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
const staging = path.join(WORKSPACE_DIR, '.codex-finalizer'); await fs.mkdir(staging, { recursive: true }); await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
await finalizePresentation({ workspaceDir: WORKSPACE_DIR, candidatePath: candidate, finalPath: FINAL_PPTX, pythonExecutable: process.env.RUNTIME_PYTHON, integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'), layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'), layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'], requiredNativeTableOwnerSlides: [], fontPolicy: { basis: 'design', families: ['Manrope', 'Source Sans 3'] }, verifyArtifactToolImport: true, receiptPath: path.join(staging, `${path.basename(FINAL_PPTX)}.validation.json`) });
