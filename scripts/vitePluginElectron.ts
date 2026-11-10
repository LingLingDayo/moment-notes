import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { type Plugin, type ResolvedConfig, type ViteDevServer } from 'vite';
import * as esbuild from 'esbuild';

export interface ElectronPluginOptions {
  /**
   * Electron 源码目录，默认 'electron'
   */
  srcDir?: string;
  /**
   * 输出目录，默认 'dist-electron'（主进程、preload 在根下，界面在 renderer 子目录）
   */
  outDir?: string;
}

type BuildTarget = 'main' | 'preload';

const require = createRequire(import.meta.url);

/**
 * 主进程与 preload 的 esbuild 配置。
 * - 输出 .cjs：package.json 是 "type": "module"，而 Electron 的沙箱 preload 只能是 CommonJS
 * - uiohook-napi 带原生二进制，必须保持外部依赖，运行时从 node_modules 加载
 */
function createBuildOptions(
  target: BuildTarget,
  srcDir: string,
  outDir: string,
  isDev: boolean
): esbuild.BuildOptions {
  return {
    entryPoints: [path.join(srcDir, target, 'index.ts')],
    outfile: path.join(outDir, `${target}.cjs`),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: target === 'main' ? ['electron', 'uiohook-napi'] : ['electron'],
    sourcemap: isDev ? 'inline' : false,
    minify: !isDev,
    logLevel: 'warning'
  };
}

/**
 * 开发模式：监听主进程 / preload 源码，构建完成后拉起 Electron。
 * - 主进程变更 → 重启 Electron
 * - preload 变更 → 刷新页面即可重新加载
 */
async function startDevRunner(server: ViteDevServer, srcDir: string, outDir: string, devUrl: string) {
  const built = new Set<BuildTarget>();
  let electronProcess: ChildProcess | null = null;
  let disposed = false;

  const spawnElectron = () => {
    if (disposed) return;
    const env: NodeJS.ProcessEnv = { ...process.env, VITE_DEV_SERVER_URL: devUrl };
    // 从其他 Electron 应用的终端里启动时可能继承到这个变量，会让 Electron 以纯 Node 模式运行
    delete env.ELECTRON_RUN_AS_NODE;

    const child = spawn(require('electron') as string, ['.'], { stdio: 'inherit', env });
    electronProcess = child;
    child.once('exit', () => {
      if (electronProcess !== child) return;
      electronProcess = null;
      // 用户关掉了应用：一并结束开发服务器
      void server.close().finally(() => process.exit(0));
    });
  };

  const restartElectron = () => {
    const old = electronProcess;
    if (!old) {
      spawnElectron();
      return;
    }
    // 等旧进程完全退出后再启动，否则新进程拿不到单实例锁
    electronProcess = null;
    old.removeAllListeners('exit');
    old.once('exit', spawnElectron);
    old.kill();
  };

  const onBuilt = (target: BuildTarget) => {
    built.add(target);
    if (built.size < 2) return;
    if (target === 'main' || !electronProcess) {
      restartElectron();
    } else {
      server.ws.send({ type: 'full-reload' });
    }
  };

  const contexts = await Promise.all(
    (['main', 'preload'] as const).map(target =>
      esbuild.context({
        ...createBuildOptions(target, srcDir, outDir, true),
        plugins: [
          {
            name: 'electron-dev-notify',
            setup(build) {
              build.onEnd(result => {
                if (result.errors.length === 0) onBuilt(target);
              });
            }
          }
        ]
      })
    )
  );
  await Promise.all(contexts.map(context => context.watch()));

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    void Promise.all(contexts.map(context => context.dispose()));
    const child = electronProcess;
    electronProcess = null;
    if (child) {
      child.removeAllListeners('exit');
      child.kill();
    }
  };

  server.httpServer?.once('close', dispose);
  process.once('exit', dispose);
}

/**
 * Electron 桌面应用构建插件（仅在 `--mode electron` 下启用）。
 * 界面仍由 Vite 构建，主进程和 preload 用 esbuild 单独打包。
 */
export function electronPlugin(options: ElectronPluginOptions = {}): Plugin {
  const root = process.cwd();
  const srcDir = path.resolve(root, options.srcDir || 'electron');
  const outDir = path.resolve(root, options.outDir || 'dist-electron');

  let config: ResolvedConfig;

  return {
    name: 'vite-plugin-electron-app',

    config() {
      return {
        build: {
          outDir: path.join(outDir, 'renderer'),
          emptyOutDir: true
        }
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        const port = address && typeof address === 'object' ? address.port : server.config.server.port;
        const host = typeof server.config.server.host === 'string' ? server.config.server.host : '127.0.0.1';
        const devUrl = `http://${host}:${port}/`;

        startDevRunner(server, srcDir, outDir, devUrl).catch(error => {
          console.error('\n  ❌ [Electron] 启动失败:', error);
        });
      });
    },

    async closeBundle() {
      if (config.command !== 'build') return;
      await Promise.all(
        (['main', 'preload'] as const).map(target =>
          esbuild.build(createBuildOptions(target, srcDir, outDir, false))
        )
      );
      console.log(`\n  ✅ [Electron] 主进程与 preload 已输出到 ${path.relative(root, outDir)}\n`);
    }
  };
}
