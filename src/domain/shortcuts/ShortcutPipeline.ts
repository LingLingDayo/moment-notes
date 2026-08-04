import { parseKeyboardEvent } from './KeyCombo';
import { KeybindingRegistry, defaultKeybindingRegistry, Keybinding } from './KeybindingRegistry';
import { KeybindingContextService, defaultContextService } from './KeybindingContextService';
import { commandRegistry } from '../commands/CommandRegistry';

export interface ShortcutPipelineOptions {
  keybindingRegistry?: KeybindingRegistry;
  contextService?: KeybindingContextService;
  isRecordingGetter?: () => boolean;
  onExecuteCommand?: (commandId: string, binding: Keybinding) => void;
}

export class ShortcutPipeline {
  private registry: KeybindingRegistry;
  private contextService: KeybindingContextService;
  private isRecordingGetter?: () => boolean;
  private onExecuteCommand?: (commandId: string, binding: Keybinding) => void;

  constructor(options: ShortcutPipelineOptions = {}) {
    this.registry = options.keybindingRegistry || defaultKeybindingRegistry;
    this.contextService = options.contextService || defaultContextService;
    this.isRecordingGetter = options.isRecordingGetter;
    this.onExecuteCommand = options.onExecuteCommand;
  }

  /**
   * 处理键盘事件主入口管线
   */
  public handleEvent(e: KeyboardEvent): { handled: boolean; matchedBinding: Keybinding | null } {
    // Stage 1: 录制状态防打扰拦截
    if (this.isRecordingGetter && this.isRecordingGetter()) {
      return { handled: false, matchedBinding: null };
    }

    // Stage 2: 规范化解析按键
    const combo = parseKeyboardEvent(e);
    if (!combo) {
      return { handled: false, matchedBinding: null };
    }

    // Stage 3: 匹配最佳 Keybinding (结合 when 条件表达式与 priority)
    const matched = this.registry.match(combo.rawString, this.contextService);
    if (!matched) {
      return { handled: false, matchedBinding: null };
    }

    // Stage 4: 触发与执行命令
    e.preventDefault();
    e.stopPropagation();

    if (this.onExecuteCommand) {
      this.onExecuteCommand(matched.commandId, matched);
    } else if (commandRegistry.has(matched.commandId)) {
      commandRegistry.execute(matched.commandId);
    }

    return { handled: true, matchedBinding: matched };
  }
}
