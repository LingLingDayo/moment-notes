import { Menu, Tray, nativeImage } from 'electron';

export interface TrayOptions {
  iconPath: string;
  tooltip: string;
  onToggle: () => void;
  onShow: () => void;
  onQuit: () => void;
}

/** 托盘图标：单击切换主窗口，右键菜单提供显示和退出 */
export const createTray = (options: TrayOptions): Tray => {
  const icon = nativeImage.createFromPath(options.iconPath).resize({ width: 32, height: 32, quality: 'best' });
  const tray = new Tray(icon);

  tray.setToolTip(options.tooltip);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: options.onShow },
      { type: 'separator' },
      { label: '退出', click: options.onQuit }
    ])
  );
  tray.on('click', options.onToggle);

  return tray;
};
