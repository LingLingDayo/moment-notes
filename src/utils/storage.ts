/**
 * 检查当前是否在 uTools 环境下运行
 */
export const isUTools = (): boolean => {
  return typeof window !== 'undefined' && 
         window.utools !== undefined && 
         typeof window.utools.onPluginEnter === 'function';
};

/**
 * 封装通用存储，在 uTools 下使用 dbStorage，在浏览器下使用 localStorage
 */
export const storage = {
  getItem(key: string): string | null {
    if (isUTools()) {
      try {
        return window.utools.dbStorage.getItem(key);
      } catch (e) {
        console.error('uTools dbStorage.getItem error, falling back to localStorage:', e);
      }
    }
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (isUTools()) {
      try {
        window.utools.dbStorage.setItem(key, value);
        return;
      } catch (e) {
        console.error('uTools dbStorage.setItem error, falling back to localStorage:', e);
      }
    }
    localStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    if (isUTools()) {
      try {
        window.utools.dbStorage.removeItem(key);
        return;
      } catch (e) {
        console.error('uTools dbStorage.removeItem error, falling back to localStorage:', e);
      }
    }
    localStorage.removeItem(key);
  }
};

/**
 * 粘贴文本到鼠标光标处
 * 如果在 uTools 环境，自动隐藏插件窗口并粘贴
 * 如果在浏览器环境，写入剪切板并提示
 */
export const pasteTextToCursor = async (text: string): Promise<boolean> => {
  if (isUTools()) {
    try {
      window.utools.hideMainWindowPasteText(text);
      return true;
    } catch (e) {
      console.error('uTools paste text failed:', e);
    }
  }

  // 浏览器降级处理：复制到剪贴板
  try {
    await navigator.clipboard.writeText(text);
    return false; // 返回 false 表示只复制了，没能实现自动粘贴
  } catch (e) {
    console.error('Clipboard copy failed:', e);
    // 最后的极简降级方案：创建临时 textarea 复制
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('execCommand copy failed:', err);
    }
    document.body.removeChild(textarea);
    return false;
  }
};

/**
 * 保存文本内容为本地文件
 * 优先在 uTools 下通过 window.services 写入下载文件夹
 * 浏览器环境降级为 Blob 触发文件下载
 * @returns {boolean} true 表示通过服务写入了本地, false 表示降级为浏览器下载
 */
export const downloadOrWriteFile = (content: string, filename: string, mimeType: string = 'text/plain'): boolean => {
  if (isUTools()) {
    if (typeof window !== 'undefined' && window.services?.writeTextFile) {
      try {
        window.services.writeTextFile(content);
        return true;
      } catch (e) {
        console.error('uTools preload writeTextFile failed, falling back to download:', e);
      }
    }
  }

  // 浏览器环境降级下载
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return false;
};
