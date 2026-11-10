import { computed, ref, watch } from 'vue';
import { useDesktopStore } from '@stores/desktopStore';
import { GLOBAL_TRIGGER_SETTING } from '../../../domain/desktop/DesktopSettings';
import {
  cloneGlobalTrigger,
  isSameGlobalTrigger,
  type GlobalTrigger,
  type TriggerGesture,
  type TriggerInput,
  type TriggerModifier
} from '../../../domain/desktop/GlobalTrigger';
import {
  formatGlobalTrigger,
  getTriggerComboParts,
  getTriggerGestureNote
} from '../../../domain/desktop/triggerFormat';
import {
  applyCapturedInput,
  canCombineModifiers,
  toggleTriggerModifier
} from '../../../domain/desktop/triggerRecording';
import { clampTriggerHoldMs, validateGlobalTrigger } from '../../../domain/desktop/triggerValidation';

export type TriggerStatusTone = 'ok' | 'error' | 'muted';

export interface TriggerStatus {
  tone: TriggerStatusTone;
  text: string;
  detail?: string;
}

/**
 * 全局唤起快捷键的编辑状态。
 *
 * 界面上没有"保存"按钮：每次修改先写进草稿，草稿合法就立即交给 Store 保存并应用；
 * 不合法时只留在草稿里并显示原因，已生效的快捷键保持不变。
 * 合法性、自动修正、文案全部来自领域层，这里只做编排。
 */
export function useGlobalTriggerEditor() {
  const desktopStore = useDesktopStore();

  const draft = ref<GlobalTrigger>(cloneGlobalTrigger(desktopStore.globalTrigger));

  // 导入备份等外部操作改了已保存的值时，草稿跟着更新
  watch(
    () => desktopStore.globalTrigger,
    value => {
      if (!isSameGlobalTrigger(value, draft.value)) draft.value = cloneGlobalTrigger(value);
    }
  );

  const problem = computed(() => validateGlobalTrigger(draft.value));

  const update = (next: GlobalTrigger): void => {
    draft.value = next;
    if (validateGlobalTrigger(next) !== null) return;
    void desktopStore.setGlobalTrigger(next);
  };

  const setEnabled = (enabled: boolean): void => {
    // 草稿不合法时，开关作用在已生效的快捷键上，保证随时都能停用
    const base = problem.value === null ? draft.value : desktopStore.globalTrigger;
    update({ ...cloneGlobalTrigger(base), enabled });
  };

  const toggleModifier = (modifier: TriggerModifier): void => {
    update(toggleTriggerModifier(draft.value, modifier));
  };

  const capture = (input: TriggerInput, modifiers: readonly TriggerModifier[]): void => {
    update(applyCapturedInput(draft.value, input, modifiers));
  };

  const setGesture = (gesture: TriggerGesture): void => {
    update({ ...draft.value, gesture });
  };

  const setHoldMs = (value: number): void => {
    update({ ...draft.value, holdMs: clampTriggerHoldMs(value) });
  };

  const reset = (): void => {
    draft.value = cloneGlobalTrigger(GLOBAL_TRIGGER_SETTING.defaultValue);
    void desktopStore.resetGlobalTrigger();
  };

  const comboParts = computed(() => getTriggerComboParts(draft.value));
  const gestureNote = computed(() => getTriggerGestureNote(draft.value));
  const canUseModifiers = computed(() => canCombineModifiers(draft.value.input));
  const isDefault = computed(() => isSameGlobalTrigger(draft.value, GLOBAL_TRIGGER_SETTING.defaultValue));
  const defaultLabel = formatGlobalTrigger(GLOBAL_TRIGGER_SETTING.defaultValue);

  const status = computed<TriggerStatus>(() => {
    if (problem.value !== null) {
      const active = desktopStore.globalTrigger;
      return {
        tone: 'error',
        text: problem.value,
        detail: active.enabled ? `未应用，仍在使用 ${formatGlobalTrigger(active)}` : '未应用'
      };
    }
    if (!draft.value.enabled) {
      return { tone: 'muted', text: '已停用', detail: '不会响应全局快捷键' };
    }

    const registration = desktopStore.registration;
    if (desktopStore.isSyncing || registration === null) {
      return { tone: 'muted', text: '正在应用…' };
    }
    if (!registration.ok) {
      return {
        tone: 'error',
        text: '未生效',
        detail: registration.message || '注册失败，可能已被其他程序占用，请换一组按键'
      };
    }
    if (registration.backend === 'hook') {
      return { tone: 'ok', text: '已生效', detail: '通过全局监听识别，按键同时仍会传给当前程序' };
    }
    return { tone: 'ok', text: '已生效', detail: '系统级快捷键，按键不会再传给其他程序' };
  });

  return {
    draft,
    comboParts,
    gestureNote,
    canUseModifiers,
    isDefault,
    defaultLabel,
    status,
    setEnabled,
    toggleModifier,
    capture,
    setGesture,
    setHoldMs,
    reset
  };
}
