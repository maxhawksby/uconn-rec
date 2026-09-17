import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.dev-cache');
mkdirSync(cache, { recursive: true });
mkdirSync(path.join(root, 'public'), { recursive: true });
const lan = Object.values(os.networkInterfaces()).flat().find(x => x && x.family === 'IPv4' && !x.internal)?.address;
const port = process.env.PORT || '8081';
if (lan) {
  const url = `exp://${lan}:${port}`;
  await QRCode.toFile(path.join(root, 'public', 'expo-go.png'), url, { width: 280, margin: 3, color: { dark: '#071C3E', light: '#FFFFFF' } });
  console.log(`iPhone Expo Go: ${url}\nScan the QR at http://localhost:${port}/connect.html (same Wi-Fi).`);
}
const env = { ...process.env, DOTSLASH_CACHE: path.join(cache, 'dotslash'), EXPO_NO_TELEMETRY: '1' };
// Share the normal per-user Expo login with `npx expo login` in a terminal.
delete env.__UNSAFE_EXPO_HOME_DIRECTORY;
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'expo', 'bin', 'cli'), 'start', '--go', '--lan', '--port', port, ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env,
});
child.on('error', () => { console.error('Unable to start Expo. Check the project dependencies.'); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 0));
