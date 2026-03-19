import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(projectRoot, '..');
const srcDir = path.join(rootDir, 'node_modules', '@ohif', 'viewer', 'dist');
const destDir = path.join(rootDir, 'public', 'ohif');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const sourceBundle = path.join(srcDir, 'index.umd.js');
  const targetBundle = path.join(destDir, 'index.umd.js');
  fs.copyFileSync(sourceBundle, targetBundle);

  console.log(`Copied OHIF viewer bundle from ${sourceBundle} to ${targetBundle}`);
} catch (err) {
  console.error('Failed to copy OHIF viewer build:', err);
  process.exit(1);
}
