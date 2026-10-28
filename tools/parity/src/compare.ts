// So ảnh bằng pixelmatch (threshold 0.1) sau khi tô vùng mask giống nhau ở hai ảnh.
import fs from 'node:fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { ParityEntry } from '../parity.manifest';

const paint = (img: PNG, e: ParityEntry) => {
  const ox = e.clip?.x ?? 0;
  const oy = e.clip?.y ?? 0;
  for (const m of e.mask ?? []) {
    for (let y = Math.max(0, m.y - oy); y < Math.min(img.height, m.y - oy + m.height); y++) {
      for (let x = Math.max(0, m.x - ox); x < Math.min(img.width, m.x - ox + m.width); x++) {
        const i = (y * img.width + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 0;
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }
    }
  }
};

export interface CompareResult {
  diffPixels: number;
  total: number;
  ratio: number;
}

export function compareImages(basePath: string, appPath: string, diffPath: string, e: ParityEntry): CompareResult {
  const a = PNG.sync.read(fs.readFileSync(basePath));
  const b = PNG.sync.read(fs.readFileSync(appPath));
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  paint(a, e);
  paint(b, e);
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const total = a.width * a.height;
  return { diffPixels, total, ratio: diffPixels / total };
}
