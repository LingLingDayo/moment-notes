import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseKeyboardEvent, normalizeKeyComboString } from './KeyCombo';
import { KeybindingContextService } from './KeybindingContextService';
import { KeybindingRegistry } from './KeybindingRegistry';
import { ShortcutPipeline } from './ShortcutPipeline';
import { commandRegistry } from '../commands/CommandRegistry';

function createMockKeyboardEvent(init: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}): KeyboardEvent {
  let defaultPrevented = false;
  let _propagationStopped = false;

  return {
    key: init.key,
    ctrlKey: Boolean(init.ctrlKey),
    altKey: Boolean(init.altKey),
    shiftKey: Boolean(init.shiftKey),
    metaKey: Boolean(init.metaKey),
    defaultPrevented,
    preventDefault: () => {
      defaultPrevented = true;
    },
    stopPropagation: () => {
      _propagationStopped = true;
    }
  } as unknown as KeyboardEvent;
}

describe('Shortcut Domain Module Tests', () => {
  beforeEach(() => {
    commandRegistry.clear();
  });

  describe('KeyCombo Normalization', () => {
    it('应正确解析与规范化单修饰键与多修饰键按键事件', () => {
      const event = createMockKeyboardEvent({
        key: 'n',
        ctrlKey: true,
        altKey: true,
        shiftKey: true
      });

      const combo = parseKeyboardEvent(event);
      expect(combo).not.toBeNull();
      expect(combo?.rawString).toBe('Ctrl+Alt+Shift+N');
      expect(combo?.ctrl).toBe(true);
      expect(combo?.alt).toBe(true);
      expect(combo?.shift).toBe(true);
      expect(combo?.key).toBe('N');
    });

    it('应忽略纯修饰键按下事件', () => {
      const event = createMockKeyboardEvent({
        key: 'Control',
        ctrlKey: true
      });
      const combo = parseKeyboardEvent(event);
      expect(combo).toBeNull();
    });

    it('应规范化混排顺序的快捷键字符串', () => {
      expect(normalizeKeyComboString('shift+alt+ctrl+n')).toBe('Ctrl+Alt+Shift+N');
      expect(normalizeKeyComboString('ctrl+enter')).toBe('Ctrl+Enter');
      expect(normalizeKeyComboString('escape')).toBe('Escape');
    });
  });

  describe('KeybindingContextService', () => {
    it('应正确评估上下文逻辑，默认包含 global 上下文', () => {
      const contextService = new KeybindingContextService();
      expect(contextService.evaluate()).toBe(true);
      expect(contextService.evaluate('global')).toBe(true);
      expect(contextService.evaluate('inEditor')).toBe(false);

      contextService.setContext('inEditor', true);
      expect(contextService.evaluate('inEditor')).toBe(true);
      expect(contextService.evaluate('inEditor && !modalOpen')).toBe(true);

      contextService.setContext('modalOpen', true);
      expect(contextService.evaluate('inEditor && !modalOpen')).toBe(false);
      expect(contextService.evaluate('inEditor || modalOpen')).toBe(true);
    });
  });

  describe('KeybindingRegistry & Pipeline', () => {
    it('应根据当前上下文匹配正确的 Keybinding，高优先级覆盖', () => {
      const registry = new KeybindingRegistry();
      const contextService = new KeybindingContextService();

      registry.register({
        id: 'globalAction',
        name: '全局操作',
        commandId: 'cmd.global',
        defaultKey: 'Ctrl+S',
        currentKey: 'Ctrl+S',
        description: '',
        when: '!inEditor',
        priority: 10
      });

      registry.register({
        id: 'editorSave',
        name: '编辑器保存',
        commandId: 'cmd.editorSave',
        defaultKey: 'Ctrl+S',
        currentKey: 'Ctrl+S',
        description: '',
        when: 'inEditor',
        priority: 20
      });

      let matched = registry.match('Ctrl+S', contextService);
      expect(matched?.id).toBe('globalAction');

      contextService.setContext('inEditor', true);
      matched = registry.match('Ctrl+S', contextService);
      expect(matched?.id).toBe('editorSave');
    });

    it('ShortcutPipeline 应正确拦截、解析并分发 Command', () => {
      const registry = new KeybindingRegistry();
      const contextService = new KeybindingContextService();
      const handler = vi.fn();

      commandRegistry.registerHandler('addNote', '新建便签', handler);

      const pipeline = new ShortcutPipeline({
        keybindingRegistry: registry,
        contextService: contextService
      });

      const event = createMockKeyboardEvent({
        key: 'n',
        ctrlKey: true,
        altKey: true
      });

      const result = pipeline.handleEvent(event);
      expect(result.handled).toBe(true);
      expect(result.matchedBinding?.id).toBe('addNote');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('录制模式下 Pipeline 应防打扰并拦截触发', () => {
      const registry = new KeybindingRegistry();
      const contextService = new KeybindingContextService();
      const handler = vi.fn();

      commandRegistry.registerHandler('addNote', '新建便签', handler);

      let isRecording = true;
      const pipeline = new ShortcutPipeline({
        keybindingRegistry: registry,
        contextService: contextService,
        isRecordingGetter: () => isRecording
      });

      const event = createMockKeyboardEvent({
        key: 'n',
        ctrlKey: true,
        altKey: true
      });

      const result = pipeline.handleEvent(event);
      expect(result.handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
