import { describe, expect, it } from 'vitest';
import {
  buildDetachedNoteWindowUrl,
  createDetachedNoteWindowOptions,
  getDetachedNoteId,
  isDetachedNoteWindow
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

  it('生产环境应生成 uTools 可解析的相对 HTML 地址', () => {
    const url = buildDetachedNoteWindowUrl(
      'note id/中文',
      'http://localhost:4021/current?foo=bar#hash',
      false
    );

    expect(url).toBe('index.html?view=detached-note&noteId=note+id%2F%E4%B8%AD%E6%96%87');
  });

  it('开发环境应复用当前开发服务器地址', () => {
    const url = buildDetachedNoteWindowUrl(
      'note-2',
      'http://localhost:4021/current?foo=bar#hash',
      true
    );

    expect(url).toBe('http://localhost:4021/current?view=detached-note&noteId=note-2');
  });

  it('应生成无边框且可缩放的独立便签窗口配置', () => {
    const options = createDetachedNoteWindowOptions({
      id: 'note-1',
      title: '测试便签',
      backgroundColor: '#fff6d1'
    });

    expect(options).toMatchObject({
      title: '测试便签',
      frame: false,
      transparent: false,
      resizable: true,
      minimizable: false,
      maximizable: false,
      closable: true,
      backgroundColor: '#fff6d1',
      webPreferences: {
        preload: 'preload/services.js'
      }
    });
  });
});
