import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

for (const folder of ['docs', 'sample-data']) {
  const source = resolve(root, folder);
  const target = resolve(dist, folder);
  if (existsSync(source)) {
    cpSync(source, target, { recursive: true, force: true });
  }
}

const favicon = resolve(root, 'public', 'favicon.svg');
if (existsSync(favicon)) {
  cpSync(favicon, resolve(dist, 'favicon.svg'), { force: true });
}

console.log('Copied docs, sample-data, and favicon to dist.');
