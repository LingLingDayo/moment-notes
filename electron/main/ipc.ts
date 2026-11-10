import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainEvent,
  type SaveDialogSyncOptions,
  type WebContents
} from 'electron';
import type { TriggerRegistrationResult } from '../../src/domain/desktop/DesktopSettings';
import { parseGlobalTrigger, validateGlobalTrigger } from '../../src/domain/desktop/triggerValidation';
import type { SaveTextFileOptions, SaveTextFileResult } from '../../src/infrastructure/desktop/DesktopApi';
import { DESKTOP_CHANNELS } from '../shared/channels';
import type { MainWindowController } from './mainWindow';
import type { TriggerService } from './trigger/TriggerService';

export interface IpcDependencies {
  mainWindow: MainWindowController;
  triggers: TriggerService;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseSaveOptions = (value: unknown): SaveTextFileOptions | undefined => {
  if (!isRecord(value)) return undefined;
  const { content, filename, filterName, extensions } = value;
  if (typeof content !== 'string' || typeof filename !== 'string' || typeof filterName !== 'string') {
    return undefined;
  }
  if (!Array.isArray(extensions) || !extensions.every(item => typeof item === 'string')) {
    return undefined;
  }
  return { content, filename, filterName, extensions };
};

export const registerIpc = ({ mainWindow, triggers }: IpcDependencies): void => {
  /** 窗口行为只接受主窗口的指令，独立便签窗口不参与 */
  const isFromMainWindow = (sender: WebContents): boolean =>
    mainWindow.getWindow()?.webContents === sender;

  ipcMain.handle(DESKTOP_CHANNELS.applySettings, async (event, raw: unknown): Promise<TriggerRegistrationResult> => {
    if (!isFromMainWindow(event.sender)) {
      return { ok: false, backend: 'none', message: '只有主窗口可以修改窗口设置' };
    }
    const settings = isRecord(raw) ? raw : {};
    mainWindow.setHideOnBlur(settings.hideOnBlur === true);

    // 渲染进程传来的数据一律重新解析和校验，不信任界面侧的结果
    const trigger = parseGlobalTrigger(settings.globalTrigger);
    if (!trigger) return { ok: false, backend: 'none', message: '快捷键配置无效' };
    const problem = validateGlobalTrigger(trigger);
    if (problem) return { ok: false, backend: 'none', message: problem };

    return triggers.apply(trigger);
  });

  ipcMain.on(DESKTOP_CHANNELS.setTriggerPaused, (event, paused: unknown) => {
    if (isFromMainWindow(event.sender)) triggers.setPaused(paused === true);
  });

  ipcMain.on(DESKTOP_CHANNELS.suspendAutoHide, event => {
    if (isFromMainWindow(event.sender)) mainWindow.suspendAutoHideUntilFocus();
  });

  const saveTextFile = (event: IpcMainEvent, raw: unknown): SaveTextFileResult => {
    try {
      const options = parseSaveOptions(raw);
      if (!options) return 'failed';

      const dialogOptions: SaveDialogSyncOptions = {
        title: '选择保存路径',
        // 只取文件名，防止传入的名称里带目录
        defaultPath: path.join(app.getPath('downloads'), path.basename(options.filename)),
        buttonLabel: '保存',
        filters: [
          { name: options.filterName, extensions: options.extensions },
          { name: 'All Files', extensions: ['*'] }
        ]
      };

      // 保存对话框会抢走焦点，期间不能把主窗口隐藏
      mainWindow.suspendAutoHideUntilFocus();
      const parent = BrowserWindow.fromWebContents(event.sender);
      const filePath = parent
        ? dialog.showSaveDialogSync(parent, dialogOptions)
        : dialog.showSaveDialogSync(dialogOptions);
      if (!filePath) return 'canceled';

      fs.writeFileSync(filePath, options.content, 'utf-8');
      return 'success';
    } catch (error) {
      console.error('[ipc] 保存文件失败:', error);
      return 'failed';
    }
  };

  ipcMain.on(DESKTOP_CHANNELS.saveTextFile, (event, raw: unknown) => {
    event.returnValue = saveTextFile(event, raw);
  });
};
