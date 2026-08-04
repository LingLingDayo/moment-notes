import { normalizeKeyComboString } from './KeyCombo';
import { KeybindingContextService, defaultContextService } from './KeybindingContextService';

export interface Keybinding {
  id: string;
  name: string;
  commandId: string;
  defaultKey: string;
  currentKey: string;
  description: string;
  when?: string;
  priority?: number;
}

export class KeybindingRegistry {
  private bindings = new Map<string, Keybinding>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const defaults: Keybinding[] = [
      {
        id: 'addNote',
        name: '新建便签',
        commandId: 'addNote',
        defaultKey: 'Ctrl+Alt+N',
        currentKey: 'Ctrl+Alt+N',
        description: '在当前所在分类下极速新建一个空白便签',
        when: '!inEditor && !modalOpen',
        priority: 10
      },
      {
        id: 'focusSearch',
        name: '聚焦搜索',
        commandId: 'focusSearch',
        defaultKey: 'Ctrl+F',
        currentKey: 'Ctrl+F',
        description: '一键将输入光标聚焦到顶部的搜索框中',
        when: '!inEditor && !modalOpen',
        priority: 10
      },
      {
        id: 'saveEdit',
        name: '保存编辑',
        commandId: 'saveEdit',
        defaultKey: 'Ctrl+Enter',
        currentKey: 'Ctrl+Enter',
        description: '在编辑便签内容时，快捷保存并结束编辑状态',
        when: 'inEditor',
        priority: 20
      },
      {
        id: 'cancelEdit',
        name: '取消编辑',
        commandId: 'cancelEdit',
        defaultKey: 'Escape',
        currentKey: 'Escape',
        description: '在编辑便签内容时取消修改并退出编辑状态',
        when: 'inEditor',
        priority: 20
      }
    ];

    for (const binding of defaults) {
      this.bindings.set(binding.id, { ...binding });
    }
  }

  public register(binding: Keybinding): () => void {
    const normalizedKey = normalizeKeyComboString(binding.currentKey);
    const normalizedDefault = normalizeKeyComboString(binding.defaultKey);
    const item: Keybinding = {
      ...binding,
      currentKey: normalizedKey,
      defaultKey: normalizedDefault
    };
    this.bindings.set(item.id, item);
    return () => {
      this.bindings.delete(item.id);
    };
  }

  public get(id: string): Keybinding | undefined {
    return this.bindings.get(id);
  }

  public getAll(): Keybinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * 根据当前按键组合与上下文服务匹配最佳绑定的快捷键
   */
  public match(
    rawKeyComboStr: string,
    contextService: KeybindingContextService = defaultContextService
  ): Keybinding | null {
    const targetComboStr = normalizeKeyComboString(rawKeyComboStr);
    if (!targetComboStr) return null;

    const matchedBindings: Keybinding[] = [];

    for (const binding of this.bindings.values()) {
      if (!binding.currentKey) continue;

      if (binding.currentKey === targetComboStr) {
        if (contextService.evaluate(binding.when)) {
          matchedBindings.push(binding);
        }
      }
    }

    if (matchedBindings.length === 0) return null;

    // 按优先级降序排序，优先级更高的绑定生效
    matchedBindings.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return matchedBindings[0];
  }

  /**
   * 更新某个快捷键的绑定按键，并检测冲突
   */
  public updateKeybinding(id: string, newKey: string): { success: boolean; message?: string } {
    const normalizedNewKey = normalizeKeyComboString(newKey);
    const match = this.bindings.get(id);

    if (!match) {
      return { success: false, message: `未找到 ID 为 "${id}" 的快捷键` };
    }

    if (!normalizedNewKey) {
      match.currentKey = '';
      return { success: true };
    }

    // 冲突校验：同一 when 上下文下或相同按键且未屏蔽
    for (const binding of this.bindings.values()) {
      if (binding.id !== id && binding.currentKey && binding.currentKey.toLowerCase() === normalizedNewKey.toLowerCase()) {
        return { success: false, message: `与 [${binding.name}] 快捷键冲突` };
      }
    }

    match.currentKey = normalizedNewKey;
    return { success: true };
  }

  public resetKeybinding(id: string): void {
    const match = this.bindings.get(id);
    if (match) {
      match.currentKey = match.defaultKey;
    }
  }

  public clearKeybinding(id: string): void {
    const match = this.bindings.get(id);
    if (match) {
      match.currentKey = '';
    }
  }
}

export const defaultKeybindingRegistry = new KeybindingRegistry();
