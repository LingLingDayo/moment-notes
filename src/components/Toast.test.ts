import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('Toast 组件与样式规范单测', () => {
  let storeMap: Map<string, string>;

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => storeMap.get(key) || null,
      setItem: (key: string, value: string) => storeMap.set(key, value),
      removeItem: (key: string) => storeMap.delete(key),
      clear: () => storeMap.clear(),
      length: 0,
      key: () => null
    } as any;
  });

  it('Toast.vue 应采用精致轻巧的药丸胶囊形态和毛玻璃质感', async () => {
    const toastVuePath = path.resolve('src/components/Toast.vue');
    const source = await readFile(toastVuePath, 'utf8');

    // 胶囊药丸圆角
    expect(source).toContain('border-radius: 9999px');
    // 毛玻璃 Glassmorphism
    expect(source).toContain('backdrop-filter: blur(16px)');
    expect(source).toContain('-webkit-backdrop-filter: blur(16px)');
    // 图标精细化尺寸与描边
    expect(source).toContain(':size="14"');
    expect(source).toContain(':stroke-width="2.2"');
    // 精致字体与字重
    expect(source).toContain('font-size: 12.5px');
    expect(source).toContain('font-weight: 500');
  });

  it('main.scss 应为亮色与暗色模式完整配置现代毛玻璃阴影与状态色彩', async () => {
    const mainScssPath = path.resolve('src/styles/main.scss');
    const source = await readFile(mainScssPath, 'utf8');

    // 需包含专属立体微阴影变量
    expect(source).toContain('--toast-shadow:');

    // 需包含四大状态类型的背景与图标变量
    expect(source).toContain('--toast-success-icon:');
    expect(source).toContain('--toast-info-icon:');
    expect(source).toContain('--toast-warning-icon:');
    expect(source).toContain('--toast-error-icon:');

    // global-tooltip 也需具备毛玻璃与精致圆角
    expect(source).toContain('.global-tooltip {');
    expect(source).toContain('backdrop-filter: blur(12px)');
  });

  it('stickyNotesStore.showToast 能正确响应不同类型和位置的弹窗请求', () => {
    const store = useStickyNotesStore();

    store.showToast('已复制标签: Markdown', 'success', 'top');
    expect(store.toastMessage).toBe('已复制标签: Markdown');
    expect(store.toastType).toBe('success');
    expect(store.toastPosition).toBe('top');

    store.showToast('注意：内容不可为空', 'warning', 'bottom');
    expect(store.toastMessage).toBe('注意：内容不可为空');
    expect(store.toastType).toBe('warning');
    expect(store.toastPosition).toBe('bottom');

    store.showToast('发生错误', 'error');
    expect(store.toastMessage).toBe('发生错误');
    expect(store.toastType).toBe('error');
    expect(store.toastPosition).toBe('top');
  });
});
