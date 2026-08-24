import { isUTools } from '@utils/storage';

export const DETACHED_NOTE_VIEW = 'detached-note';
export const DETACHED_NOTE_REFRESH_CHANNEL = 'moment-notes:detached-note-refresh';

const DEFAULT_WINDOW_WIDTH = 520;
const DEFAULT_WINDOW_HEIGHT = 640;

export interface DetachedNoteWindowOptions {
  id: string;
  title?: string;
  backgroundColor: string;
}

export type DetachedNoteWindowOpenResult = 'created' | 'focused' | 'browser' | 'failed';

type DetachedWindowInstance = ReturnType<typeof utools.createBrowserWindow>;

const detachedNoteWindows = new Map<string, DetachedWindowInstance>();

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
  thickFrame: false,
  transparent: false,
  backgroundColor: options.backgroundColor,
  hasShadow: true,
  roundedCorners: true,
  resizable: true,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  closable: true,
  autoHideMenuBar: true,
  webPreferences: {
    preload: 'preload/services.js',
    zoomFactor: 1
  }
});

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
        noteWindow.show();
        noteWindow.moveTop();
        noteWindow.focus?.();
      }
    );
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
      detachedNoteWindows.delete(noteId);
      return;
    }
    noteWindow.webContents.send(DETACHED_NOTE_REFRESH_CHANNEL);
  });
};

export const setDetachedNoteWindowAlwaysOnTop = (noteId: string, alwaysOnTop: boolean) => {
  const noteWindow = detachedNoteWindows.get(noteId);
  if (!noteWindow || noteWindow.isDestroyed()) {
    detachedNoteWindows.delete(noteId);
    return;
  }
  noteWindow.setAlwaysOnTop(alwaysOnTop);
};
