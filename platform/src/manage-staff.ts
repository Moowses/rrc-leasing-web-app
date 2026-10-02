import { PrismaClient, StaffRole, StaffStatus } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { stdin as input, stdout as output } from 'node:process';

const db = new PrismaClient();
const scrypt = promisify(scryptCallback);
function option(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const derived = await scrypt(password, salt, 64) as Buffer; return `${salt}:${derived.toString('hex')}`; }
async function readPassword() {
  if (!input.isTTY) throw new Error('Run this command from an interactive terminal.');
  output.write('New password (minimum 12 characters): ');
  input.setRawMode(true); input.resume();
  return new Promise<string>((resolve, reject) => {
    let value = '';
    const done = () => { input.off('data', onData); input.setRawMode(false); output.write('\n'); };
    const onData = (chunk: Buffer) => {
      const key = chunk.toString('utf8');
      if (key === '\u0003') { done(); reject(new Error('Cancelled.')); return; }
      if (key === '\r' || key === '\n') { done(); resolve(value); return; }
      if (key === '\b' || key === '\u007f') { if (value) { value = value.slice(0, -1); output.write('\b \b'); } return; }
      if (/^[\x20-\x7e]$/.test(key)) { value += key; output.write('*'); }
    };
    input.on('data', onData);
  });
}

const email = option('--email')?.trim().toLowerCase();
const displayName = option('--name')?.trim();
const role = option('--role') === 'LEASING' ? StaffRole.LEASING : option('--role') === 'SUPER_ADMIN' ? StaffRole.SUPER_ADMIN : undefined;
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !displayName || !role) {
  console.error('Usage: npm run staff:upsert -- --email staff@example.com --name "Staff Name" --role SUPER_ADMIN|LEASING');
  process.exitCode = 1;
} else {
  const password = await readPassword();
  if (password.length < 12 || password.length > 128) { console.error('Password must contain 12 to 128 characters.'); process.exitCode = 1; }
  else {
    const passwordHash = await hashPassword(password);
    const user = await db.staffUser.upsert({ where: { email }, update: { displayName, role, status: StaffStatus.ACTIVE, passwordHash }, create: { email, displayName, role, status: StaffStatus.ACTIVE, passwordHash } });
    await db.staffSession.deleteMany({ where: { userId: user.id } });
    console.log(`Staff account is active for ${user.email}. Existing sessions were cleared.`);
  }
}
await db.$disconnect();
