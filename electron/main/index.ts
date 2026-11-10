import path from 'node:path';
import { app, globalShortcut, Menu, type Tray } from 'electron';
import { registerIpc } from './ipc';
import { MainWindowController } from './mainWindow';
import { createTray } from './tray';
import { TriggerService } from './trigger/TriggerService';
import { installWindowOpenPolicy } from './windowOpenPolicy';

const APP_TITLE = '拾光便签';

const devUrl = app.isPackaged ? undefined : process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(devUrl);

// 开发版和正式版的数据目录分开，互不影响，也可以同时运行。
// 必须在申请单实例锁之前设置：锁是按数据目录区分的。
app.setPath('userData', path.join(app.getPath('appData'), isDev ? 'moment-notes-dev' : 'moment-notes'));
app.setAppUserModelId('com.moment-notes.app');

const rendererDir = path.join(__dirname, 'renderer');
const preloadPath = path.join(__dirname, 'preload.cjs');
const iconPath = isDev
  ? path.join(app.getAppPath(), 'public', 'logo.png')
  : path.join(rendererDir, 'logo.png');

const mainWindow = new MainWindowController({
  title: APP_TITLE,
  iconPath,
  preloadPath,
  devUrl,
  indexHtmlPath: path.join(rendererDir, 'index.html')
});
const triggers = new TriggerService(gestureStartedAt => mainWindow.toggle(gestureStartedAt));

// 托盘对象必须有长期引用，否则被回收后图标会消失
let tray: Tray | null = null;

const bootstrap = async () => {
  installWindowOpenPolicy({ iconPath, preloadPath, devUrl, rendererDir });

  app.on('second-instance', () => mainWindow.show());
  app.on('activate', () => mainWindow.show());
  app.on('before-quit', () => mainWindow.prepareQuit());
  app.on('will-quit', () => {
    // 全局钩子不停掉的话进程无法正常退出
    triggers.dispose();
    globalShortcut.unregisterAll();
    tray?.destroy();
    tray = null;
  });

  await app.whenReady();

  // 正式版不需要默认菜单（及其刷新、开发者工具等快捷键）；macOS 的复制粘贴依赖菜单，保留
  if (!isDev && process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }

  registerIpc({ mainWindow, triggers });
  mainWindow.create();
  tray = createTray({
    iconPath,
    tooltip: APP_TITLE,
    onToggle: () => mainWindow.toggle(),
    onShow: () => mainWindow.show(),
    onQuit: () => app.quit()
  });
};

if (app.requestSingleInstanceLock()) {
  bootstrap().catch(error => {
    console.error('[main] 启动失败:', error);
    app.quit();
  });
} else {
  // 已经有一个实例在运行：它会收到 second-instance 并显示主窗口
  app.quit();
}
