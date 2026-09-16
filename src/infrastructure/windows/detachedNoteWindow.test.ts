import { describe, expect, it } from 'vitest';
import {
  buildDetachedNoteWindowBrowserUrl,
  buildDetachedNoteWindowPath,
  buildDetachedNoteWindowUrl,
  computeDetachedNoteMaximizeToggle,
  createDetachedNoteWindowOptions,
  getDetachedNoteId,
  isDetachedNoteWindow,
  isWindows10ClientEdgeClip,
  resolveWindowBoundsApplyOrder
} from './detachedNoteWindow';

describe('detachedNoteWindow', () => {
  it('应从独立便签窗口参数中解析便签 ID', () => {
    expect(getDetachedNoteId('?view=detached-note&noteId=note-1')).toBe('note-1');
    expect(isDetachedNoteWindow('?view=detached-note&noteId=note-1')).toBe(true);
  });

  it('缺少视图标识或便签 ID 时不应识别为独立便签窗口', () => {
    expect(getDetachedNoteId('?noteId=note-1')).toBeNull();
    expect(getDetachedNoteId('?view=detached-note')).toBeNull();
    expect(isDetachedNoteWindow('?view=dashboard&noteId=note-1')).toBe(false);
  });

  it('应生成 uTools createBrowserWindow 可解析的相对 HTML 路径', () => {
    const path = buildDetachedNoteWindowPath('note id/中文');
    expect(path).toBe('index.html?view=detached-note&noteId=note+id%2F%E4%B8%AD%E6%96%87');
  });

  it('浏览器环境应复用当前服务器地址构建完整 URL', () => {
    const url = buildDetachedNoteWindowBrowserUrl(
      'note-2',
      'http://localhost:4021/current?foo=bar#hash'
    );

    expect(url).toBe('http://localhost:4021/current?view=detached-note&noteId=note-2');
  });

  it('buildDetachedNoteWindowUrl 应在非开发环境生成相对路径，在开发环境生成完整 URL', () => {
    const prodUrl = buildDetachedNoteWindowUrl('note-1', 'http://localhost:4021/', false);
    const devUrl = buildDetachedNoteWindowUrl('note-1', 'http://localhost:4021/', true);

    expect(prodUrl).toBe('index.html?view=detached-note&noteId=note-1');
    expect(devUrl).toBe('http://localhost:4021/?view=detached-note&noteId=note-1');
  });

  it('仅 Windows 10 无边框分层窗需要为右下客户区裁切预留 1px', () => {
    expect(isWindows10ClientEdgeClip('win32', '10.0.19045')).toBe(true);
    expect(isWindows10ClientEdgeClip('win32', '10.0.19041')).toBe(true);
    expect(isWindows10ClientEdgeClip('win32', '10.0.21996')).toBe(true);
    expect(isWindows10ClientEdgeClip('win32', '10.0.22000')).toBe(false);
    expect(isWindows10ClientEdgeClip('win32', '10.0.22621')).toBe(false);
    expect(isWindows10ClientEdgeClip('darwin', '10.0.19045')).toBe(false);
    expect(isWindows10ClientEdgeClip('linux', '10.0.19045')).toBe(false);
    expect(isWindows10ClientEdgeClip('win32', '10.0')).toBe(false);
    expect(isWindows10ClientEdgeClip('win32', '')).toBe(false);
  });

  it('应生成无边框可缩放配置，且关闭原生最大化以免系统黑边', () => {
    const options = createDetachedNoteWindowOptions({
      id: 'note-1',
      title: '测试便签',
      backgroundColor: '#fff6d1'
    });

    expect(options).toMatchObject({
      title: '测试便签',
      frame: false,
      transparent: true,
      hasShadow: false,
      roundedCorners: false,
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      closable: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: 'preload/services.js'
      }
    });
  });

  it('最大化切换应按显示器工作区铺满，并支持还原到原窗口尺寸', () => {
    const currentBounds = { x: 120, y: 80, width: 520, height: 640 };
    const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

    const maximized = computeDetachedNoteMaximizeToggle({
      currentBounds,
      workArea,
      restoreBounds: null
    });

    expect(maximized).toEqual({
      maximized: true,
      nextBounds: workArea,
      nextRestoreBounds: currentBounds
    });

    const restored = computeDetachedNoteMaximizeToggle({
      currentBounds: workArea,
      workArea,
      restoreBounds: maximized.nextRestoreBounds
    });

    expect(restored).toEqual({
      maximized: false,
      nextBounds: currentBounds,
      nextRestoreBounds: null
    });
  });

  it('退出全屏缩小窗口时应先改尺寸再改位置，避免被系统夹到左上角', () => {
    expect(
      resolveWindowBoundsApplyOrder(
        { x: 0, y: 0, width: 1920, height: 1040 },
        { x: 360, y: 180, width: 520, height: 640 }
      )
    ).toBe('size-first');
  });

  it('进入全屏放大窗口时应先改位置再改尺寸', () => {
    expect(
      resolveWindowBoundsApplyOrder(
        { x: 360, y: 180, width: 520, height: 640 },
        { x: 0, y: 0, width: 1920, height: 1040 }
      )
    ).toBe('position-first');
  });
});
