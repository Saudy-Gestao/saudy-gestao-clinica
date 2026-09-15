import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.resolve(frontDir, '../saudy-api-monolith');
const composeFile = path.join(apiDir, 'docker-compose.e2e.yml');
const fixturePath = path.join(frontDir, 'e2e/.runtime/fixture.json');

const e2eDatabaseUrl = 'postgresql://saudy_e2e:saudy_e2e_password@127.0.0.1:55433/saudy_e2e';
const e2eEnv = {
  ...process.env,
  DATABASE_URL: e2eDatabaseUrl,
  DIRECT_URL: e2eDatabaseUrl,
  JWT_SECRET: 'saudy-e2e-only-jwt-secret',
  CORS_ORIGIN: 'http://127.0.0.1:4173,http://localhost:4173',
  PORT: '3301',
  NODE_ENV: 'test',
  WHATSAPP_HSM_SYNC_INTERVAL_MINUTES: '1440',
  WHATSAPP_AUTOMATION_INTERVAL_MINUTES: '1440',
  WHATSAPP_HUMAN_TIMEOUT_INTERVAL_MINUTES: '1440',
  E2E_FIXTURE_PATH: fixturePath,
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || frontDir,
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
};

try {
  if (process.argv.includes('--down')) {
    run('docker', ['compose', '-f', composeFile, 'down'], { cwd: apiDir });
    process.exit(0);
  }

  run('docker', ['compose', '-f', composeFile, 'up', '-d', '--wait'], { cwd: apiDir });
  run('pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force', '--schema', 'prisma/schema.prisma'], {
    cwd: apiDir,
    env: e2eEnv,
  });

  const seedResult = run('node', ['scripts/seed-e2e.cjs'], {
    cwd: apiDir,
    env: e2eEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (seedResult.stderr) process.stderr.write(seedResult.stderr);
  if (seedResult.stdout) process.stdout.write(seedResult.stdout);
} catch (error) {
  console.error(`E2E preparation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
