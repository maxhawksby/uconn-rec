import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.dev-cache');
mkdirSync(cache, { recursive: true });
mkdirSync(path.join(root, 'public'), { recursive: true });
const lan = Object.values(os.networkInterfaces()).flat().find(x => x && x.family === 'IPv4' && !x.internal && !x.address.startsWith('169.254.'))?.address;
const port = process.env.PORT || '8081';
const tunnel = process.argv.includes('--tunnel');
if (lan && !tunnel) {
  const url = `exp://${lan}:${port}`;
  await QRCode.toFile(path.join(root, 'public', 'expo-go.png'), url, { width: 280, margin: 3, color: { dark: '#14161B', light: '#FFFFFF' } });
  console.log(`iPhone Expo Go: ${url}\nScan the QR at http://localhost:${port}/connect.html (same Wi-Fi).`);
}
const env = { ...process.env, DOTSLASH_CACHE: path.join(cache, 'dotslash'), EXPO_NO_TELEMETRY: '1' };
// Backend: the local Supabase stack when it's running (`npm run db:start`), else demo data.
// Phones reach it over Wi-Fi, so it's addressed by this computer's LAN IP. `--demo` forces
// demo data; an EXPO_PUBLIC_SUPABASE_URL you set yourself always wins.
if (!process.argv.includes('--demo') && !env.EXPO_PUBLIC_SUPABASE_URL) {
  const status = spawnSync(path.join(root, 'node_modules', '.bin', 'supabase'), ['status', '-o', 'json'], { cwd: root, encoding: 'utf8' });
  let local = null;
  try { local = JSON.parse(status.stdout); } catch { /* not running */ }
  if (local?.API_URL && local?.PUBLISHABLE_KEY) {
    const host = tunnel || !lan ? '127.0.0.1' : lan;
    env.EXPO_PUBLIC_SUPABASE_URL = local.API_URL.replace('127.0.0.1', host);
    env.EXPO_PUBLIC_SUPABASE_KEY = local.PUBLISHABLE_KEY;
    env.EXPO_PUBLIC_DEV_INBOX_URL = local.MAILPIT_URL?.replace('127.0.0.1', host);
    console.log(`Backend: local Supabase at ${env.EXPO_PUBLIC_SUPABASE_URL} (sign-up codes: ${env.EXPO_PUBLIC_DEV_INBOX_URL})`);
  } else {
    console.log('Backend: demo data. Run `npm run db:start` first to use the local Supabase.');
  }
}
// Share the normal per-user Expo login with `npx expo login` in a terminal.
delete env.__UNSAFE_EXPO_HOME_DIRECTORY;
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'expo', 'bin', 'cli'), 'start', '--go', ...(tunnel ? [] : ['--lan']), '--port', port, ...process.argv.slice(2).filter(a => a !== '--demo')], {
  cwd: root, stdio: 'inherit', env,
});
child.on('error', () => { console.error('Unable to start Expo. Check the project dependencies.'); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 0));
