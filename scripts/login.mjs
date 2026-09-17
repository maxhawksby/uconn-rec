import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...process.env,
  EXPO_NO_TELEMETRY: '1',
};
delete env.__UNSAFE_EXPO_HOME_DIRECTORY;
delete env.EXPO_OFFLINE;
delete env.BROWSER;
console.log('Sign in with the same Expo account used on your iPhone.');
console.log('This uses your normal Expo CLI account, shared with npx expo login and npm start.');
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'expo', 'bin', 'cli'), 'login', '--browser'], {
  cwd: root, env, stdio: 'inherit',
});
child.on('error', () => { console.error('Unable to start Expo login. Check that Node.js and project dependencies are installed.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
