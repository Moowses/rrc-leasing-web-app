import { PrismaClient, StaffRole, StaffStatus } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { stdin as input, stdout as output } from 'node:process';

const db = new PrismaClient();
const scrypt = promisify(scryptCallback);
const option = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function readPassword(): Promise<string> {
  if (!input.isTTY) throw new Error('Run this command in an interactive terminal.');
  output.write('New password (minimum 12 characters): ');
  input.setRawMode(true);
  input.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = () => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
    };
    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      if (text.startsWith('\u001b')) return;
      for (const character of text) {
        if (character === '\u0003') { done(); reject(new Error('Cancelled.')); return; }
        if (character === '\r' || character === '\n') { done(); resolve(value); return; }
        if (character === '\b' || character === '\u007f') {
          if (value) { value = value.slice(0, -1); output.write('\b \b'); }
        } else if (character.charCodeAt(0) >= 32) {
          value += character;
          output.write('*');
        }
      }
    };
    input.on('data', onData);
  });
}

try {
  const email = option('--email')?.trim().toLowerCase();
  const displayName = option('--name')?.trim();
  const role = option('--role') as StaffRole | undefined;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !displayName || displayName.length < 2 || displayName.length > 100 || !role || !Object.values(StaffRole).includes(role)) {
    throw new Error('Usage: --email staff@example.com --name "Staff Name" --role SUPER_ADMIN (or another StaffRole).');
  }
  const password = await readPassword();
  if (password.length < 12 || password.length > 128) throw new Error('Password must contain 12 to 128 characters.');
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  const passwordHash = `${salt}:${derived.toString('hex')}`;
  const user = await db.$transaction(async tx => {
    const exists = await tx.staffUser.findUnique({ where: { email } });
    const staff = await tx.staffUser.upsert({ where: { email }, update: { displayName, role, status: StaffStatus.ACTIVE, passwordHash }, create: { email, displayName, role, status: StaffStatus.ACTIVE, passwordHash } });
    await tx.staffSession.deleteMany({ where: { userId: staff.id } });
    await tx.auditEvent.create({ data: { action: exists ? 'STAFF_ACCOUNT_UPDATED' : 'STAFF_ACCOUNT_CREATED', entityType: 'StaffUser', entityId: staff.id, metadata: { source: 'staff-cli', email, role, sessionsCleared: true } } });
    return staff;
  });
  output.write(`Staff account is active for ${user.email}. Existing sessions were cleared.\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Staff account update failed.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
