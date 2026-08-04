export interface KeyCombo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
  rawString: string;
}

/**
 * 规范化按键名称
 */
export function normalizeKey(key: string): string {
  if (!key) return '';
  const lower = key.toLowerCase();
  if (['control', 'shift', 'alt', 'meta'].includes(lower)) {
    return '';
  }
  if (lower === ' ' || lower === 'space') return 'Space';
  if (lower === 'arrowleft' || lower === 'left') return 'Left';
  if (lower === 'arrowright' || lower === 'right') return 'Right';
  if (lower === 'arrowup' || lower === 'up') return 'Up';
  if (lower === 'arrowdown' || lower === 'down') return 'Down';
  if (lower === 'enter') return 'Enter';
  if (lower === 'escape' || lower === 'esc') return 'Escape';
  if (lower === 'tab') return 'Tab';
  if (lower === 'backspace') return 'Backspace';
  if (lower === 'delete') return 'Delete';
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * 从 KeyboardEvent 中提取规范化的按键组合对象及字符串
 */
export function parseKeyboardEvent(e: KeyboardEvent): KeyCombo | null {
  const primaryKey = normalizeKey(e.key);
  if (!primaryKey) {
    return null;
  }

  const ctrl = Boolean(e.ctrlKey || e.metaKey);
  const alt = Boolean(e.altKey);
  const shift = Boolean(e.shiftKey);
  const meta = Boolean(e.metaKey);

  const parts: string[] = [];
  if (ctrl) parts.push('Ctrl');
  if (alt) parts.push('Alt');
  if (shift) parts.push('Shift');
  parts.push(primaryKey);

  const rawString = parts.join('+');

  return {
    ctrl,
    alt,
    shift,
    meta,
    key: primaryKey,
    rawString
  };
}

/**
 * 将任意快捷键字符串 (如 "ctrl+alt+n" 或 "Shift+Ctrl+N") 规范化为统一格式 (如 "Ctrl+Alt+Shift+N")
 */
export function normalizeKeyComboString(str: string): string {
  if (!str || !str.trim()) return '';
  const tokens = str.split('+').map(t => t.trim()).filter(Boolean);

  let hasCtrl = false;
  let hasAlt = false;
  let hasShift = false;
  let mainKey = '';

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'meta' || lower === 'cmd') {
      hasCtrl = true;
    } else if (lower === 'alt') {
      hasAlt = true;
    } else if (lower === 'shift') {
      hasShift = true;
    } else {
      mainKey = normalizeKey(token);
    }
  }

  if (!mainKey) return '';

  const parts: string[] = [];
  if (hasCtrl) parts.push('Ctrl');
  if (hasAlt) parts.push('Alt');
  if (hasShift) parts.push('Shift');
  parts.push(mainKey);

  return parts.join('+');
}
