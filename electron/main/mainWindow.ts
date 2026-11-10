import { BrowserWindow, screen } from 'electron';

export interface MainWindowOptions {
  title: string;
  iconPath: string;
  preloadPath: string;
  /** 开发模式下的 Vite 地址；为空时加载打包后的 index.html */
  devUrl?: string;
  indexHtmlPath: string;
}

/** 失焦后等这么久再决定是否隐藏，给焦点在本应用内部切换留出时间 */
const BLUR_HIDE_DELAY_MS = 60;
/** 判定"失焦是由这次触发手势引起的"的时间容差 */
const GESTURE_BLUR_TOLERANCE_MS = 250;
/** 请求挂起失焦隐藏后，若这么久窗口仍然持有焦点，说明系统对话框没有弹出来 */
const SUSPEND_FALLBACK_MS = 2000;

/**
 * 主窗口控制器：负责显示 / 隐藏 / 切换，以及"失焦自动隐藏"。
 */
export class MainWindowController {
  private window: BrowserWindow | null = null;
  private hideOnBlur = false;
  private suspendedUntilFocus = false;
  private quitting = false;
  private lastBlurAt = 0;
  private lastBlurHideAt = 0;
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: MainWindowOptions) {}

  create(): BrowserWindow {
    const win = new BrowserWindow({
      width: 960,
      height: 640,
      minWidth: 480,
      minHeight: 400,
      show: false,
      title: this.options.title,
      icon: this.options.iconPath,
      autoHideMenuBar: true,
      webPreferences: {
        preload: this.options.preloadPath,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    this.window = win;

    win.once('ready-to-show', () => this.show());
    win.on('blur', () => this.handleBlur());
    win.on('focus', () => {
      this.suspendedUntilFocus = false;
      this.clearBlurTimer();
    });
    // 点关闭按钮只是收起到托盘，真正退出走托盘菜单
    win.on('close', event => {
      if (this.quitting) return;
      event.preventDefault();
      win.hide();
    });
    win.on('closed', () => {
      this.clearBlurTimer();
      this.window = null;
    });

    if (this.options.devUrl) {
      void win.loadURL(this.options.devUrl);
    } else {
      void win.loadFile(this.options.indexHtmlPath);
    }
    return win;
  }

  getWindow(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null;
  }

  show(): void {
    const win = this.getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    this.moveToCursorDisplay(win);
    win.show();
    win.focus();
  }

  hide(): void {
    this.getWindow()?.hide();
  }

  /**
   * 触发器回调：隐藏时显示，显示时隐藏。
   * @param gestureStartedAt 手势起始时刻。点击、长按这类手势本身就会让窗口失焦，
   *   用它来识别"这次失焦是手势造成的"，避免出现关了又弹出来的情况。
   */
  toggle(gestureStartedAt: number = Date.now()): void {
    const win = this.getWindow();
    if (!win) return;
    const threshold = gestureStartedAt - GESTURE_BLUR_TOLERANCE_MS;

    if (!win.isVisible()) {
      // 窗口刚因为这次手势失焦而自动隐藏：用户的意图是关闭，不要再弹出来
      if (this.lastBlurHideAt >= threshold) return;
      this.show();
      return;
    }

    if (win.isFocused() || this.lastBlurAt >= threshold) {
      this.hide();
    } else {
      // 窗口开着但被别的窗口挡住了：拿到前台
      this.show();
    }
  }

  setHideOnBlur(enabled: boolean): void {
    this.hideOnBlur = enabled;
    if (!enabled) this.clearBlurTimer();
  }

  /**
   * 打开系统文件对话框前调用：对话框会抢走焦点，期间不应把窗口隐藏。
   * 窗口重新获得焦点后自动恢复。
   */
  suspendAutoHideUntilFocus(): void {
    this.suspendedUntilFocus = true;
    setTimeout(() => {
      if (this.getWindow()?.isFocused()) this.suspendedUntilFocus = false;
    }, SUSPEND_FALLBACK_MS);
  }

  /** 应用即将退出：之后的关闭不再被拦截成"隐藏" */
  prepareQuit(): void {
    this.quitting = true;
    this.clearBlurTimer();
  }

  private handleBlur(): void {
    this.lastBlurAt = Date.now();
    if (!this.hideOnBlur) return;

    this.clearBlurTimer();
    this.blurTimer = setTimeout(() => {
      this.blurTimer = null;
      const win = this.getWindow();
      if (!win || !this.hideOnBlur || this.suspendedUntilFocus) return;
      if (!win.isVisible() || win.isFocused() || win.isMinimized()) return;
      // 模态的系统对话框打开时窗口处于禁用状态
      if (!win.isEnabled()) return;
      if (win.webContents.isDevToolsOpened() && win.webContents.isDevToolsFocused()) return;

      this.lastBlurHideAt = Date.now();
      win.hide();
    }, BLUR_HIDE_DELAY_MS);
  }

  private clearBlurTimer(): void {
    if (this.blurTimer === null) return;
    clearTimeout(this.blurTimer);
    this.blurTimer = null;
  }

  /** 多显示器：窗口不在鼠标所在的屏幕时，把它居中移过去 */
  private moveToCursorDisplay(win: BrowserWindow): void {
    if (win.isMaximized() || win.isFullScreen()) return;

    const target = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const bounds = win.getBounds();
    if (screen.getDisplayMatching(bounds).id === target.id) return;

    const area = target.workArea;
    const width = Math.min(bounds.width, area.width);
    const height = Math.min(bounds.height, area.height);
    win.setBounds({
      x: Math.round(area.x + (area.width - width) / 2),
      y: Math.round(area.y + (area.height - height) / 2),
      width,
      height
    });
  }
}
