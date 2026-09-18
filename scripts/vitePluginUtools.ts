import fs from 'node:fs';
import path from 'node:path';
import { type Plugin, type ViteDevServer } from 'vite';
import * as esbuild from 'esbuild';

export interface UtoolsPluginOptions {
  /**
   * utools 源码目录，默认 'utools'
   */
  srcDir?: string;
  /**
   * 输出目录，默认 'dist'
   */
  outDir?: string;
}

/**
 * 生成开发模式下的独立窗口/主窗口重定向兜底 index.html
 */
function createDevRedirectHtml(devUrl: string): string {
  return `<!DOCTYPE html>
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
          const devServer = '${devUrl}';
          const search = window.location.search || '';
          const hash = window.location.hash || '';
          window.location.replace(devServer + '/' + search + hash);
        }
      })();
    </script>
  </body>
</html>`;
}

/**
 * 复制静态文件并生成对应环境的 plugin.json
 */
function syncUtoolsAssets(srcDir: string, destDir: string, isDev: boolean, devUrl?: string) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 1. 复制除 preload 之外的所有 utools 资源（如 logo.png 等）
  if (fs.existsSync(srcDir)) {
    const items = fs.readdirSync(srcDir);
    for (const item of items) {
      if (item === 'preload' || item === 'plugin.json') continue;
      const srcItem = path.join(srcDir, item);
      const destItem = path.join(destDir, item);
      fs.cpSync(srcItem, destItem, { recursive: true });
    }
  }

  // 2. 复制 preload/package.json
  const preloadPkgSrc = path.join(srcDir, 'preload/package.json');
  if (fs.existsSync(preloadPkgSrc)) {
    const preloadDestDir = path.join(destDir, 'preload');
    if (!fs.existsSync(preloadDestDir)) {
      fs.mkdirSync(preloadDestDir, { recursive: true });
    }
    fs.copyFileSync(preloadPkgSrc, path.join(preloadDestDir, 'package.json'));
  }

  // 3. 处理 plugin.json
  const pluginJsonSrc = path.join(srcDir, 'plugin.json');
  if (fs.existsSync(pluginJsonSrc)) {
    const pluginConfig = JSON.parse(fs.readFileSync(pluginJsonSrc, 'utf-8'));
    if (isDev && devUrl) {
      pluginConfig.development = { main: devUrl };
    } else {
      delete pluginConfig.development;
    }
    const pluginJsonDest = path.join(destDir, 'plugin.json');
    fs.writeFileSync(pluginJsonDest, JSON.stringify(pluginConfig, null, 2), 'utf-8');
  }

  // 4. 开发模式下如果尚未生成 dist/index.html，生成重定向兜底文件
  if (isDev && devUrl) {
    const distIndexPath = path.join(destDir, 'index.html');
    if (!fs.existsSync(distIndexPath)) {
      fs.writeFileSync(distIndexPath, createDevRedirectHtml(devUrl), 'utf-8');
    }
  }
}

/**
 * 打包 Preload 脚本
 */
async function buildPreload(
  srcDir: string,
  destDir: string,
  isDev: boolean,
  watch = false
): Promise<esbuild.BuildContext | null> {
  const preloadEntry = fs.existsSync(path.join(srcDir, 'preload/services.ts'))
    ? path.join(srcDir, 'preload/services.ts')
    : path.join(srcDir, 'preload/services.js');

  if (!fs.existsSync(preloadEntry)) {
    return null;
  }

  const destPreloadDir = path.join(destDir, 'preload');
  if (!fs.existsSync(destPreloadDir)) {
    fs.mkdirSync(destPreloadDir, { recursive: true });
  }

  const buildOptions: esbuild.BuildOptions = {
    entryPoints: [preloadEntry],
    outfile: path.join(destDir, 'preload/services.js'),
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    external: ['electron'],
    define: {
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
    }
  };

  if (watch) {
    const ctx = await esbuild.context({
      ...buildOptions,
      plugins: [
        {
          name: 'preload-watch-logger',
          setup(build) {
            let count = 0;
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error('\x1b[31m[uTools Preload] 构建失败\x1b[0m', result.errors);
              } else {
                count++;
                if (count > 1) {
                  console.log('\x1b[32m[uTools Preload] 检测到代码更新，已重新编译\x1b[0m');
                }
              }
            });
          }
        }
      ]
    });
    await ctx.watch();
    return ctx;
  } else {
    await esbuild.build(buildOptions);
    return null;
  }
}

/**
 * uTools Vite 插件
 */
export function utoolsPlugin(options: UtoolsPluginOptions = {}): Plugin {
  const srcDir = path.resolve(options.srcDir || 'utools');
  const outDir = path.resolve(options.outDir || 'dist');
  let watchCtx: esbuild.BuildContext | null = null;

  return {
    name: 'vite-plugin-utools',
    async configureServer(server: ViteDevServer) {
      server.httpServer?.once('listening', async () => {
        const address = server.httpServer?.address();
        let port = 4021;
        if (address && typeof address === 'object') {
          port = address.port;
        }

        const devUrl = `http://127.0.0.1:${port}`;

        // 1. 同步静态文件与开发版 plugin.json
        syncUtoolsAssets(srcDir, outDir, true, devUrl);

        // 2. 开启 preload 监听与实时构建
        try {
          watchCtx = await buildPreload(srcDir, outDir, true, true);
        } catch (err) {
          console.error('\x1b[31m[uTools Preload] 初始化构建失败:\x1b[0m', err);
        }

        // 3. 终端友好提示
        console.log(
          `\x1b[36m[uTools]\x1b[0m 开发模式已就绪，可在 uTools 开发者工具中导入: \x1b[33m${path.join(outDir, 'plugin.json')}\x1b[0m`
        );
        console.log(
          `\x1b[36m[uTools]\x1b[0m 本地开发服务地址: \x1b[32m${devUrl}\x1b[0m (支持 Vite HMR 热更新 & Preload 实时编译)`
        );
      });

      server.httpServer?.on('close', async () => {
        if (watchCtx) {
          await watchCtx.dispose();
          watchCtx = null;
        }
      });
    },

    async closeBundle() {
      // 生产环境打包后处理
      syncUtoolsAssets(srcDir, outDir, false);
      try {
        await buildPreload(srcDir, outDir, false, false);
      } catch (err) {
        console.error('\x1b[31m[uTools Preload] 生产构建失败:\x1b[0m', err);
      }
    }
  };
}
