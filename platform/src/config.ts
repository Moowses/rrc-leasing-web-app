import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4180),
  DATABASE_URL: z.string().url(),
  RRC_PLATFORM_ORIGINS: z.string().min(1),
  // `local-password` is intentionally explicit: production staff sign-in is
  // disabled until an operator opts in through the production environment.
  RRC_AUTH_PROVIDER: z.enum(['unconfigured', 'local-password', 'microsoft-entra', 'google-workspace']).default('unconfigured'),
  // Email is opt-in. Keeping it disabled by default prevents accidental mail
  // delivery from development and incomplete production environments.
  RRC_OPERATIONAL_EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  RRC_LEASING_RECIPIENT: z.string().trim().email().default('leasing@rosefoodrealtycorp.com'),
  RRC_SMTP_HOST: z.string().trim().min(1).optional(),
  RRC_SMTP_PORT: z.coerce.number().int().refine(value => value === 465 || value === 587, 'Use SMTP port 465 or 587.').optional(),
  RRC_SMTP_USERNAME: z.string().trim().email().optional(),
  RRC_SMTP_PASSWORD: z.string().min(1).optional(),
  RRC_SMTP_FROM_ADDRESS: z.string().trim().email().optional(),
  RRC_SMTP_FROM_NAME: z.string().trim().min(1).max(120).default('Rosefood Realty Corporation'),
});

export type PlatformConfig = z.infer<typeof configSchema> & { origins: ReadonlySet<string>; primaryOrigin: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const parsed = configSchema.parse(env);
  const origins = new Set(parsed.RRC_PLATFORM_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || url.pathname !== '/') throw new Error('RRC_PLATFORM_ORIGINS must contain exact origins only.');
  }
  return { ...parsed, origins, primaryOrigin: [...origins][0]! };
}
