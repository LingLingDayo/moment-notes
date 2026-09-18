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
  /**
   * 本地开发端口，默认 4021
   */
  port?: number;
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
      // 开发模式下将 main 与 development.main 均指向 Vite 开发服务器，确保 uTools 100% 走热更新服务
      pluginConfig.main = devUrl;
      pluginConfig.development = { main: devUrl };
    } else {
      pluginConfig.main = 'index.html';
      delete pluginConfig.development;
    }
    const pluginJsonDest = path.join(destDir, 'plugin.json');
    fs.writeFileSync(pluginJsonDest, JSON.stringify(pluginConfig, null, 2), 'utf-8');
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
  const defaultPort = options.port || 4021;
  let watchCtx: esbuild.BuildContext | null = null;
  let isUtoolsBuild = false;

  return {
    name: 'vite-plugin-utools',
    configResolved(config) {
      isUtoolsBuild = config.mode === 'utools';
    },

    async configureServer(server: ViteDevServer) {
      const devUrl = `http://127.0.0.1:${defaultPort}`;

      // 1. 在 Dev Server 启动时立即同步资源与生成开发版 plugin.json
      syncUtoolsAssets(srcDir, outDir, true, devUrl);

      // 2. 立即编译 Preload 并开启 watch 监听
      try {
        watchCtx = await buildPreload(srcDir, outDir, true, true);
      } catch (err) {
        console.error('\x1b[31m[uTools Preload] 初始化构建失败:\x1b[0m', err);
      }

      console.log(
        `\x1b[36m[uTools]\x1b[0m 开发模式已就绪，可在 uTools 开发者工具中导入: \x1b[33m${path.join(outDir, 'plugin.json')}\x1b[0m`
      );
      console.log(
        `\x1b[36m[uTools]\x1b[0m 本地开发服务地址: \x1b[32m${devUrl}\x1b[0m (支持 Vite HMR 热更新 & Preload 实时编译)`
      );

      server.httpServer?.on('close', async () => {
        if (watchCtx) {
          await watchCtx.dispose();
          watchCtx = null;
        }
      });
    },

    async closeBundle() {
      // 仅在 uTools 专属构建模式（--mode utools）下打包 uTools 相关资产
      if (!isUtoolsBuild) {
        return;
      }

      syncUtoolsAssets(srcDir, outDir, false);
      try {
        await buildPreload(srcDir, outDir, false, false);
        console.log('\x1b[32m[uTools] 插件专属产物构建完成（plugin.json, preload, logo）\x1b[0m');
      } catch (err) {
        console.error('\x1b[31m[uTools Preload] 生产构建失败:\x1b[0m', err);
      }
    }
  };
}
