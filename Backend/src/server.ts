import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp(config);

const stop = async (signal: string) => {
  app.log.info({ signal }, 'Stopping RRC property operations platform');
  await app.close();
  process.exit(0);
};

process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));

try {
  await app.listen({ port: config.PORT, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
