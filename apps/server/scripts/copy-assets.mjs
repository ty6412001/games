import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, '..');
const assets = [
  {
    from: resolve(serverDir, 'src/db/schema.sql'),
    to: resolve(serverDir, 'dist/db/schema.sql'),
  },
];

for (const asset of assets) {
  if (!existsSync(asset.from)) {
    continue;
  }
  mkdirSync(dirname(asset.to), { recursive: true });
  cpSync(asset.from, asset.to);
}
