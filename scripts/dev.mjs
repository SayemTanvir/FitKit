import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = [
  ['API', 'node_modules/tsx/dist/cli.mjs', ['watch', 'backend/server.ts']],
  ['Web', 'node_modules/vite/bin/vite.js', []],
];
const children = commands.map(([name, entry, args]) => {
  const child = spawn(process.execPath, [path.join(root, entry), ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} stopped with exit code ${code}.`);
      stop(code);
    }
  });
  return child;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
