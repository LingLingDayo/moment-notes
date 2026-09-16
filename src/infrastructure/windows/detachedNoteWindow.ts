import { isUTools } from '@utils/storage';

export const DETACHED_NOTE_VIEW = 'detached-note';
export const DETACHED_NOTE_REFRESH_CHANNEL = 'moment-notes:detached-note-refresh';
export const DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL = 'moment-notes:detached-note-maximize-changed';
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

export const applyRendererWindowBounds = (bounds: WindowBounds) => {
  window.moveTo(bounds.x, bounds.y);
  window.resizeTo(bounds.width, bounds.height);
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
  // 原生最大化会让 Windows 给无边框窗画系统黑边；铺满改为 setBounds
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

  // 内容仍透明时瞬时置顶，强迫 DWM 在首帧合成时去掉系统默认边框
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

    noteWindow.on('maximize', () => {
      if (!noteWindow || noteWindow.isDestroyed()) return;
      noteWindow.webContents.send(DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL, true);
    });

    noteWindow.on('unmaximize', () => {
      if (!noteWindow || noteWindow.isDestroyed()) return;
      restoreBoundsMap.delete(options.id);
      noteWindow.webContents.send(DETACHED_NOTE_MAXIMIZE_CHANGE_CHANNEL, false);
    });

    noteWindow.on('closed', () => {
      forgetDetachedNoteWindow(options.id);
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

  // 无边框透明窗口在 Windows 上 native maximize() 是空操作，改为铺满当前显示器工作区
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
