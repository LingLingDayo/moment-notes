import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { useDesktopStore } from '@stores/desktopStore';
import { useShortcutStore } from '@stores/shortcutStore';
import { TRIGGER_MODIFIERS, type TriggerInput, type TriggerModifier } from '../../../domain/desktop/GlobalTrigger';
import {
  captureKeyDown,
  captureLoneModifier,
  captureMouseDown,
  type HeldModifiers,
  type KeyCaptureResult
} from '../../../domain/desktop/triggerRecording';

export interface TriggerRecorderOptions {
  /** 录制区元素：只有在它里面按下的鼠标按键才会被录制 */
  zone: Ref<HTMLElement | null>;
  onCapture: (input: TriggerInput, modifiers: TriggerModifier[]) => void;
  onUnsupported: () => void;
}

/** 鼠标松开后，系统还会补发 click / contextmenu，这段时间内继续拦截 */
const POINTER_FOLLOW_UP_MS = 150;

const readHeldModifiers = (event: KeyboardEvent | MouseEvent): HeldModifiers => ({
  ctrl: event.ctrlKey,
  alt: event.altKey,
  shift: event.shiftKey,
  meta: event.metaKey
});

const swallow = (event: Event): void => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

/**
 * 录制主键的界面交互：负责监听 DOM 事件并决定哪些事件要拦截，
 * 事件怎么解释成按键交给领域层的 triggerRecording。
 *
 * 监听都挂在 window 的捕获阶段，这样录制期间按键不会触发应用内快捷键，
 * Esc 也不会把设置弹窗关掉。
 */
export function useTriggerRecorder(options: TriggerRecorderOptions) {
  const desktopStore = useDesktopStore();
  const shortcutStore = useShortcutStore();

  const isRecording = ref(false);
  /** 录制期间正按住的修饰键，用于实时显示 */
  const heldModifiers = ref<TriggerModifier[]>([]);

  /** 从"没有按住任何修饰键"开始，依次按下过的修饰键 */
  const modifierSequence = new Set<string>();
  /** 按住修饰键期间还按过别的（不支持的）键，这一轮就不能再当作"只按了修饰键" */
  let sequenceBroken = false;
  let suppressPointerFollowUps = false;
  let followUpTimer: ReturnType<typeof setTimeout> | null = null;

  const resetSequence = (): void => {
    modifierSequence.clear();
    sequenceBroken = false;
  };

  const isInsideZone = (event: Event): boolean => {
    const zone = options.zone.value;
    return zone !== null && event.target instanceof Node && zone.contains(event.target);
  };

  const updateHeld = (held: HeldModifiers): void => {
    heldModifiers.value = TRIGGER_MODIFIERS.filter(modifier => held[modifier.id]).map(modifier => modifier.id);
  };

  const clearFollowUpTimer = (): void => {
    if (followUpTimer !== null) {
      clearTimeout(followUpTimer);
      followUpTimer = null;
    }
  };

  const stop = (): void => {
    if (!isRecording.value) return;
    isRecording.value = false;
    heldModifiers.value = [];
    resetSequence();
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('blur', stop);
    shortcutStore.isRecording = false;
    desktopStore.setTriggerPaused(false);
  };

  const handleResult = (result: KeyCaptureResult): void => {
    switch (result.type) {
      case 'commit':
        stop();
        options.onCapture(result.input, result.modifiers);
        break;
      case 'cancel':
        stop();
        break;
      case 'pending-modifier':
        modifierSequence.add(result.code);
        break;
      case 'unsupported':
        sequenceBroken = true;
        options.onUnsupported();
        break;
    }
  };

  function handleKeyDown(event: KeyboardEvent): void {
    swallow(event);
    if (event.repeat) return;
    const held = readHeldModifiers(event);
    updateHeld(held);
    handleResult(captureKeyDown(event.code, held));
  }

  function handleKeyUp(event: KeyboardEvent): void {
    swallow(event);
    const held = readHeldModifiers(event);
    updateHeld(held);
    if (heldModifiers.value.length > 0) return;

    // 修饰键全部松开且期间没有按过别的键：只按过一个就把它当作主键，按过多个则重新开始
    const [code] = modifierSequence;
    const isLoneModifier = modifierSequence.size === 1 && !sequenceBroken;
    resetSequence();
    if (isLoneModifier && code) handleResult(captureLoneModifier(code));
  }

  const handleMouseDown = (event: MouseEvent): void => {
    clearFollowUpTimer();
    suppressPointerFollowUps = false;
    if (!isRecording.value) return;

    if (!isInsideZone(event)) {
      // 点到录制区外面视为放弃，这次点击照常交给被点的元素
      stop();
      return;
    }

    // 拦住默认行为：中键的自动滚动、侧键的前进后退，以及随后补发的 click
    swallow(event);
    suppressPointerFollowUps = true;
    handleResult(captureMouseDown(event.button, readHeldModifiers(event)));
  };

  const handleMouseUp = (event: MouseEvent): void => {
    if (!suppressPointerFollowUps) return;
    swallow(event);
    clearFollowUpTimer();
    followUpTimer = setTimeout(() => {
      suppressPointerFollowUps = false;
      followUpTimer = null;
    }, POINTER_FOLLOW_UP_MS);
  };

  /** 录到鼠标按键后，同一次点击补发的 click / auxclick / contextmenu 都要拦掉 */
  const handlePointerFollowUp = (event: Event): void => {
    if (suppressPointerFollowUps) swallow(event);
  };

  const start = (): void => {
    if (isRecording.value) return;
    isRecording.value = true;
    heldModifiers.value = [];
    resetSequence();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', stop);
    shortcutStore.isRecording = true;
    // 录制期间暂停全局监听，否则按到当前快捷键会把窗口收起来
    desktopStore.setTriggerPaused(true);
  };

  // 鼠标相关的监听在组件存活期间一直挂着：录制在 mousedown 时就结束了，
  // 但同一次点击的 mouseup / click 是之后才到的
  onMounted(() => {
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('click', handlePointerFollowUp, true);
    window.addEventListener('auxclick', handlePointerFollowUp, true);
    window.addEventListener('contextmenu', handlePointerFollowUp, true);
  });

  onBeforeUnmount(() => {
    stop();
    clearFollowUpTimer();
    window.removeEventListener('mousedown', handleMouseDown, true);
    window.removeEventListener('mouseup', handleMouseUp, true);
    window.removeEventListener('click', handlePointerFollowUp, true);
    window.removeEventListener('auxclick', handlePointerFollowUp, true);
    window.removeEventListener('contextmenu', handlePointerFollowUp, true);
  });

  return { isRecording, heldModifiers, start, stop };
}
