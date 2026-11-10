import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, shell, type BrowserWindowConstructorOptions } from 'electron';

export interface WindowOpenPolicyOptions {
  iconPath: string;
  preloadPath: string;
  /** 开发模式下的 Vite 地址 */
  devUrl?: string;
  /** 打包后界面文件所在目录 */
  rendererDir: string;
}

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const createAppUrlMatcher = (options: WindowOpenPolicyOptions) => {
  const devOrigin = options.devUrl ? new URL(options.devUrl).origin : null;
  const rendererDir = path.resolve(options.rendererDir).toLowerCase();

  return (url: string): boolean => {
    try {
      const parsed = new URL(url);
      if (devOrigin) return parsed.origin === devOrigin;
      if (parsed.protocol !== 'file:') return false;
      const filePath = path.resolve(fileURLToPath(parsed)).toLowerCase();
      return filePath.startsWith(rendererDir + path.sep);
    } catch {
      return false;
    }
  };
};

/**
 * 统一约束所有页面的"开新窗口"和"页面跳转"：
 * - 应用自身的地址（独立便签窗口）允许打开，并套用无边框窗口参数
 * - http(s) 外链交给系统默认浏览器
 * - 其余一律拒绝，页面也不允许被导航到应用之外
 */
export const installWindowOpenPolicy = (options: WindowOpenPolicyOptions): void => {
  const isAppUrl = createAppUrlMatcher(options);

  // 与 uTools 形态下独立便签窗口的参数保持一致：界面自带标题栏和圆角
  const detachedWindowOptions: BrowserWindowConstructorOptions = {
    width: 520,
    height: 640,
    minWidth: 360,
    minHeight: 320,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    roundedCorners: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon: options.iconPath,
    webPreferences: {
      preload: options.preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  };

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (isAppUrl(url)) {
        return { action: 'allow', overrideBrowserWindowOptions: detachedWindowOptions };
      }
      if (isHttpUrl(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });

    contents.on('will-navigate', (event, url) => {
      if (isAppUrl(url)) return;
      event.preventDefault();
      if (isHttpUrl(url)) void shell.openExternal(url);
    });
  });
};
