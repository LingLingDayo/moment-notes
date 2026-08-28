import fs from 'fs';
import path from 'path';

const filesToDelete = ['plugin.json', 'preload'];
const destDir = path.resolve('dist');

if (fs.existsSync(destDir)) {
  filesToDelete.forEach(file => {
    const filePath = path.join(destDir, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`已从 dist 目录移除: ${file}`);
      } catch (err) {
        console.error(`无法移除 ${file}:`, err.message);
      }
    }
  });
}
