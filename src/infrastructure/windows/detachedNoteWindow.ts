import { isUTools } from '@utils/storage';

export const DETACHED_NOTE_VIEW = 'detached-note';
export const DETACHED_NOTE_REFRESH_CHANNEL = 'moment-notes:detached-note-refresh';
export const DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL = 'moment-notes:detached-note-maximize-changed';
// 仅在剥掉 DWM 系统边框之后发送，渲染层据此才开始入场动画
export const DETACHED_NOTE_WINDOW_SHOWN_CHANNEL = 'moment-notes:detached-note-window-shown';

const DEFAULT_WINDOW_WIDTH = 520;
const DEFAULT_WINDOW_HEIGHT = 640;

export interface DetachedNoteWindowOptions {
  id: string;
  title?: string;
  backgroundColor: string;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DetachedNoteWindowOpenResult = 'created' | 'focused' | 'browser' | 'failed';

type DetachedWindowInstance = ReturnType<typeof utools.createBrowserWindow>;

const detachedNoteWindows = new Map<string, DetachedWindowInstance>();
const restoreBoundsMap = new Map<string, WindowBounds>();

export const computeDetachedNoteMaximizeToggle = (input: {
  currentBounds: WindowBounds;
  workArea: WindowBounds;
  restoreBounds: WindowBounds | null;
}): {
  maximized: boolean;
  nextBounds: WindowBounds;
  nextRestoreBounds: WindowBounds | null;
} => {
  if (input.restoreBounds) {
    return {
      maximized: false,
      nextBounds: { ...input.restoreBounds },
      nextRestoreBounds: null
    };
  }

  return {
    maximized: true,
    nextBounds: { ...input.workArea },
    nextRestoreBounds: { ...input.currentBounds }
  };
};

const cloneBounds = (bounds: WindowBounds): WindowBounds => ({
  x: bounds.x,
  y: bounds.y,
  width: bounds.width,
  height: bounds.height
});

const resolveWorkAreaByBounds = (bounds: WindowBounds): WindowBounds => {
  const matchingDisplay = window.utools?.getDisplayMatching?.(bounds);
  if (matchingDisplay?.workArea) {
    return cloneBounds(matchingDisplay.workArea);
  }

  const primaryDisplay = window.utools?.getPrimaryDisplay?.();
  if (primaryDisplay?.workArea) {
    return cloneBounds(primaryDisplay.workArea);
  }

  const screenObj = window.screen as Screen & { availLeft?: number; availTop?: number };
  return {
    x: screenObj.availLeft ?? 0,
    y: screenObj.availTop ?? 0,
    width: screenObj.availWidth,
    height: screenObj.availHeight
  };
};

export const getCurrentRendererWindowBounds = (): WindowBounds => ({
  x: window.screenX,
  y: window.screenY,
  width: window.outerWidth,
  height: window.outerHeight
});

export const resolveRendererWorkAreaBounds = (): WindowBounds => {
  return resolveWorkAreaByBounds(getCurrentRendererWindowBounds());
};

export const resolveWindowBoundsApplyOrder = (
  currentBounds: WindowBounds,
  nextBounds: WindowBounds
): 'size-first' | 'position-first' => {
  const shrinking =
    nextBounds.width < currentBounds.width || nextBounds.height < currentBounds.height;
  return shrinking ? 'size-first' : 'position-first';
};

export const applyRendererWindowBounds = (bounds: WindowBounds) => {
  const currentBounds = getCurrentRendererWindowBounds();
  // 铺满时先 moveTo 会被系统夹回左上角；退出全屏必须先缩小再归位
  if (resolveWindowBoundsApplyOrder(currentBounds, bounds) === 'size-first') {
    window.resizeTo(bounds.width, bounds.height);
    window.moveTo(bounds.x, bounds.y);
    return;
  }
  window.moveTo(bounds.x, bounds.y);
  window.resizeTo(bounds.width, bounds.height);
};

// Win11 起 build >= 22000。Win10 无边框分层窗会裁掉客户区右、下各 1px
const WINDOWS_11_MIN_BUILD = 22000;

export const isWindows10ClientEdgeClip = (platform: string, osRelease: string): boolean => {
  if (platform !== 'win32') return false;
  const build = Number.parseInt(osRelease.split('.')[2] ?? '', 10);
  return Number.isFinite(build) && build < WINDOWS_11_MIN_BUILD;
};

const isFiniteWindowBounds = (bounds: WindowBounds | null | undefined): bounds is WindowBounds => {
  if (!bounds) return false;
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(
    value => typeof value === 'number' && Number.isFinite(value)
  );
};

const getWindowBounds = (noteWindow: DetachedWindowInstance): WindowBounds => {
  if (typeof noteWindow.getBounds === 'function') {
    return cloneBounds(noteWindow.getBounds());
  }
  const [x, y] = noteWindow.getPosition();
  const [width, height] = noteWindow.getSize();
  return { x, y, width, height };
};

const applyWindowBounds = (noteWindow: DetachedWindowInstance, bounds: WindowBounds) => {
  const currentBounds = getWindowBounds(noteWindow);
  if (resolveWindowBoundsApplyOrder(currentBounds, bounds) === 'size-first') {
    noteWindow.setSize(bounds.width, bounds.height);
    noteWindow.setPosition(bounds.x, bounds.y);
    return;
  }

  if (typeof noteWindow.setBounds === 'function') {
    noteWindow.setBounds(bounds);
    return;
  }
  noteWindow.setPosition(bounds.x, bounds.y);
  noteWindow.setSize(bounds.width, bounds.height);
};

const notifyMaximizeChanged = (noteWindow: DetachedWindowInstance, maximized: boolean) => {
  if (noteWindow.isDestroyed()) return;
  noteWindow.webContents.send(DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL, maximized);
};

const forgetDetachedNoteWindow = (noteId: string) => {
  detachedNoteWindows.delete(noteId);
  restoreBoundsMap.delete(noteId);
};

export const getDetachedNoteId = (search = window.location.search): string | null => {
  const params = new URLSearchParams(search);
  if (params.get('view') !== DETACHED_NOTE_VIEW) return null;

  const noteId = params.get('noteId')?.trim();
  return noteId || null;
};

export const isDetachedNoteWindow = (search = window.location.search): boolean => {
  return getDetachedNoteId(search) !== null;
};

export const buildDetachedNoteWindowPath = (noteId: string): string => {
  const params = new URLSearchParams({
    view: DETACHED_NOTE_VIEW,
    noteId
  });

  return `index.html?${params.toString()}`;
};

export const buildDetachedNoteWindowBrowserUrl = (
  noteId: string,
  currentUrl = window.location.href
): string => {
  const params = new URLSearchParams({
    view: DETACHED_NOTE_VIEW,
    noteId
  });

  const url = new URL(currentUrl);
  url.search = params.toString();
  url.hash = '';
  return url.toString();
};

export const buildDetachedNoteWindowUrl = (
  noteId: string,
  currentUrl = window.location.href,
  isDevelopment = import.meta.env.DEV
): string => {
  if (!isDevelopment) {
    return buildDetachedNoteWindowPath(noteId);
  }
  return buildDetachedNoteWindowBrowserUrl(noteId, currentUrl);
};

export const createDetachedNoteWindowOptions = (options: DetachedNoteWindowOptions) => ({
  show: false,
  title: options.title?.trim() || '拾光便签',
  width: DEFAULT_WINDOW_WIDTH,
  height: DEFAULT_WINDOW_HEIGHT,
  minWidth: 360,
  minHeight: 320,
  center: true,
  frame: false,
  transparent: true,
  backgroundColor: '#00000000',
  hasShadow: false,
  roundedCorners: false,
  resizable: true,
  minimizable: false,
  // 禁止改回 true：Windows 无边框窗开启原生最大化后，DWM 会在主题边框外再画一层系统黑边
  maximizable: false,
  fullscreenable: false,
  closable: true,
  autoHideMenuBar: true,
  webPreferences: {
    preload: 'preload/services.js',
    zoomFactor: 1
  }
});

const SYSTEM_BORDER_STRIP_MS = 50;

const stripWindowsSystemBorderThen = (
  noteWindow: DetachedWindowInstance,
  next: () => void
) => {
  const runNext = () => {
    if (!noteWindow.isDestroyed()) next();
  };

  if (typeof noteWindow.setAlwaysOnTop !== 'function') {
    runNext();
    return;
  }

  // 必须在便签内容仍透明时做：置顶切换会强迫 DWM 重算无边框分层窗并去掉系统黑边。
  // 内容可见后再做会打断放大渐入并闪一下；等入场结束再做则黑边会残留。
  noteWindow.setAlwaysOnTop(true);
  window.setTimeout(() => {
    if (!noteWindow.isDestroyed()) {
      noteWindow.setAlwaysOnTop(false);
    }
    runNext();
  }, SYSTEM_BORDER_STRIP_MS);
};

const revealDetachedNoteWindow = (noteWindow: DetachedWindowInstance) => {
  if (noteWindow.isDestroyed()) return;
  // 顺序：show（内容 opacity:0）→ 剥系统边框 → 再通知渲染层入场。不要在 show 后立刻播动画。
  noteWindow.show();
  noteWindow.moveTop();
  noteWindow.focus?.();
  stripWindowsSystemBorderThen(noteWindow, () => {
    noteWindow.webContents.send(DETACHED_NOTE_WINDOW_SHOWN_CHANNEL);
  });
};

const focusExistingWindow = (noteWindow: DetachedWindowInstance) => {
  if (noteWindow.isMinimized()) {
    noteWindow.restore();
  }
  noteWindow.show();
  noteWindow.moveTop();
  noteWindow.focus?.();
};

const openBrowserFallback = (options: DetachedNoteWindowOptions): boolean => {
  const noteWindow = window.open(
    buildDetachedNoteWindowBrowserUrl(options.id, window.location.href),
    `moment-notes-${options.id}`,
    `popup,width=${DEFAULT_WINDOW_WIDTH},height=${DEFAULT_WINDOW_HEIGHT},resizable=yes`
  );
  noteWindow?.focus();
  return noteWindow !== null;
};

export const subscribeDetachedNoteWindowEvents = (
  noteWindow: unknown,
  listeners: {
    maximize?: () => void;
    unmaximize?: () => void;
    closed?: () => void;
  }
): boolean => {
  const emitter = noteWindow as {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  // uTools 定制 BrowserWindow 不含实例事件，on() 会抛错
  if (typeof emitter.on !== 'function') {
    return false;
  }

  try {
    if (listeners.maximize) {
      emitter.on('maximize', listeners.maximize);
    }
    if (listeners.unmaximize) {
      emitter.on('unmaximize', listeners.unmaximize);
    }
    if (listeners.closed) {
      emitter.on('closed', listeners.closed);
    }
    return true;
  } catch {
    return false;
  }
};

export const openDetachedNoteWindow = (
  options: DetachedNoteWindowOptions
): DetachedNoteWindowOpenResult => {
  if (!isUTools()) {
    return openBrowserFallback(options) ? 'browser' : 'failed';
  }

  const existingWindow = detachedNoteWindows.get(options.id);
  if (existingWindow && !existingWindow.isDestroyed()) {
    focusExistingWindow(existingWindow);
    return 'focused';
  }
  detachedNoteWindows.delete(options.id);

  try {
    let noteWindow: DetachedWindowInstance | null = null;
    noteWindow = window.utools.createBrowserWindow(
      buildDetachedNoteWindowPath(options.id),
      createDetachedNoteWindowOptions(options),
      () => {
        if (!noteWindow || noteWindow.isDestroyed()) return;
        revealDetachedNoteWindow(noteWindow);
      }
    );

    if (!noteWindow) {
      return 'failed';
    }

    subscribeDetachedNoteWindowEvents(noteWindow, {
      maximize: () => {
        if (!noteWindow || noteWindow.isDestroyed()) return;
        noteWindow.webContents.send(DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL, true);
      },
      unmaximize: () => {
        if (!noteWindow || noteWindow.isDestroyed()) return;
        restoreBoundsMap.delete(options.id);
        noteWindow.webContents.send(DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL, false);
      },
      closed: () => {
        forgetDetachedNoteWindow(options.id);
      }
    });

    detachedNoteWindows.set(options.id, noteWindow);
    return 'created';
  } catch (error) {
    console.error('Failed to open detached note window:', error);
    return 'failed';
  }
};

export const refreshDetachedNoteWindows = () => {
  detachedNoteWindows.forEach((noteWindow, noteId) => {
    if (noteWindow.isDestroyed()) {
      forgetDetachedNoteWindow(noteId);
      return;
    }
    noteWindow.webContents.send(DETACHED_NOTE_REFRESH_CHANNEL);
  });
};

export const setDetachedNoteWindowAlwaysOnTop = (noteId: string, alwaysOnTop: boolean) => {
  const noteWindow = detachedNoteWindows.get(noteId);
  if (!noteWindow || noteWindow.isDestroyed()) {
    forgetDetachedNoteWindow(noteId);
    return;
  }
  noteWindow.setAlwaysOnTop(alwaysOnTop);
};

export const isDetachedNoteWindowMaximized = (noteId: string): boolean => {
  const noteWindow = detachedNoteWindows.get(noteId);
  if (!noteWindow || noteWindow.isDestroyed()) {
    forgetDetachedNoteWindow(noteId);
    return false;
  }
  return restoreBoundsMap.has(noteId);
};

export const toggleDetachedNoteWindowMaximize = (
  noteId: string,
  currentBoundsHint?: WindowBounds | null
): boolean => {
  const noteWindow = detachedNoteWindows.get(noteId);
  if (!noteWindow || noteWindow.isDestroyed()) {
    forgetDetachedNoteWindow(noteId);
    return false;
  }

  // native maximize() 在无边框透明窗上是空操作，且会引出系统黑边；铺满请用 setBounds
  const currentBounds = isFiniteWindowBounds(currentBoundsHint)
    ? cloneBounds(currentBoundsHint)
    : getWindowBounds(noteWindow);
  const plan = computeDetachedNoteMaximizeToggle({
    currentBounds,
    workArea: resolveWorkAreaByBounds(currentBounds),
    restoreBounds: restoreBoundsMap.get(noteId) ?? null
  });

  applyWindowBounds(noteWindow, plan.nextBounds);

  if (plan.nextRestoreBounds) {
    restoreBoundsMap.set(noteId, plan.nextRestoreBounds);
  } else {
    restoreBoundsMap.delete(noteId);
  }

  notifyMaximizeChanged(noteWindow, plan.maximized);
  return plan.maximized;
};
