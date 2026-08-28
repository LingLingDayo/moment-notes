import fs from 'fs';
import path from 'path';
import { buildSync } from 'esbuild';

const srcDir = path.resolve('utools');
const destDir = path.resolve('dist');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 是否为开发模式
  const isDev = process.argv.includes('--dev');

  // 复制除了 preload 目录外的其他文件 (比如 logo.png, plugin.json)
  const items = fs.readdirSync(srcDir);
  for (const item of items) {
    if (item === 'preload') continue;
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    fs.cpSync(srcPath, destPath, { recursive: true });
  }

  // 使用 esbuild 打包 preload/services.ts
  console.log('正在使用 esbuild 打包 preload 服务...');
  try {
    const preloadEntry = fs.existsSync(path.join(srcDir, 'preload/services.ts'))
      ? path.join(srcDir, 'preload/services.ts')
      : path.join(srcDir, 'preload/services.js');

    buildSync({
      entryPoints: [preloadEntry],
      outfile: path.join(destDir, 'preload/services.js'),
      bundle: true,
      platform: 'node',
      target: 'node16',
      format: 'cjs',
      minify: !isDev,
      external: ['electron'],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
      }
    });
    console.log('preload 服务打包成功！');

    // 复制 preload/package.json
    const preloadPkgPath = path.join(srcDir, 'preload/package.json');
    if (fs.existsSync(preloadPkgPath)) {
      const destPreloadDir = path.join(destDir, 'preload');
      if (!fs.existsSync(destPreloadDir)) {
        fs.mkdirSync(destPreloadDir, { recursive: true });
      }
      fs.copyFileSync(preloadPkgPath, path.join(destPreloadDir, 'package.json'));
      console.log('已复制 preload/package.json');
    }
  } catch (err) {
    console.error('打包 preload 失败:', err);
    process.exit(1);
  }

  if (isDev) {
    // 注入开发模式配置
    console.log('正在注入开发模式配置...');
    const DEV_URL = 'http://localhost:4021';

    // 修改 dist/plugin.json，增加 development 配置
    const pluginJsonPath = path.join(destDir, 'plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      const pluginConfig = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
      pluginConfig.development = { main: DEV_URL };
      fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginConfig, null, 2));
      console.log(`已将开发服务器地址注入 plugin.json: ${DEV_URL}`);
    }

    // 开发模式下生成独立窗口重定向兜底 index.html
    const distIndexPath = path.join(destDir, 'index.html');
    if (!fs.existsSync(distIndexPath)) {
      const redirectHtml = `<!DOCTYPE html>
<html lang="zh-CN" class="detached-note-window">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>拾光便签</title>
    <style>
      html,
      body {
        background: transparent !important;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    </style>
  </head>
  <body class="detached-note-window">
    <script>
      (function () {
        if (window.location.protocol === 'file:') {
          const devServer = '${DEV_URL}';
          const search = window.location.search || '';
          const hash = window.location.hash || '';
          window.location.replace(devServer + '/' + search + hash);
        }
      })();
    </script>
  </body>
</html>`;
      fs.writeFileSync(distIndexPath, redirectHtml, 'utf-8');
    }
  }
} else {
  console.error('错误：找不到 utools 目录');
  process.exit(1);
}
