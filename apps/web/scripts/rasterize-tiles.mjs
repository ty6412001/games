import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../public/assets/tiles/sources');
const OUT_DIR = resolve(__dirname, '../public/assets/tiles');
const SIZE = 256;

const rasterizeOne = async (file) => {
  if (!file.endsWith('.svg')) return;
  const id = file.replace(/\.svg$/, '');
  const svgBuf = await readFile(resolve(SRC_DIR, file));
  const pngBuf = await sharp(svgBuf)
    .resize({
      width: SIZE,
      height: SIZE,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(OUT_DIR, `${id}.png`), pngBuf);
  console.log(`✓ ${id}.png (${pngBuf.length} bytes)`);
};

const main = async () => {
  const files = await readdir(SRC_DIR);
  await Promise.all(files.map(rasterizeOne));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
