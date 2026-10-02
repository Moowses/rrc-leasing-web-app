import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4180),
  DATABASE_URL: z.string().url(),
  RRC_PLATFORM_ORIGINS: z.string().min(1),
  RRC_AUTH_PROVIDER: z.enum(['unconfigured', 'microsoft-entra', 'google-workspace']).default('unconfigured'),
});

export type PlatformConfig = z.infer<typeof configSchema> & { origins: ReadonlySet<string> };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const parsed = configSchema.parse(env);
  const origins = new Set(parsed.RRC_PLATFORM_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || url.pathname !== '/') throw new Error('RRC_PLATFORM_ORIGINS must contain exact origins only.');
  }
  return { ...parsed, origins };
}
