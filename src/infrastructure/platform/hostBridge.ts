import { isUTools } from './platform';

/**
 * 跨宿主环境复制文本到系统剪贴板
 * - uTools 宿主下优先使用 window.utools.copyText
 * - 现代浏览器/Electron 渲染进程使用 navigator.clipboard.writeText
 * - 降级使用 document.execCommand('copy')
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (isUTools() && window.utools?.copyText) {
    try {
      window.utools.copyText(text);
      return true;
    } catch (e) {
      console.warn('utools.copyText failed, falling back to navigator.clipboard:', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级使用 execCommand
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('execCommand copy fallback failed:', err);
    }
  }

  return false;
}

/**
 * 跨宿主环境在系统默认浏览器中打开外部链接
 */
export function openExternalUrl(url: string): void {
  if (isUTools() && window.utools?.shellOpenExternal) {
    window.utools.shellOpenExternal(url);
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
