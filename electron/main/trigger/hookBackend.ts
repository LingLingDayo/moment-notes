import type { UiohookKeyboardEvent, UiohookMouseEvent } from 'uiohook-napi';
import type { GlobalTrigger, TriggerModifier } from '../../../src/domain/desktop/GlobalTrigger';
import { TriggerMatcher, type TriggerInputEvent } from '../../../src/domain/desktop/TriggerMatcher';
import { buildKeycodeLookup, getMouseButton } from './keyMaps';
import type { TriggerBackendInstance, TriggerHandler } from './types';

type UiohookModule = typeof import('uiohook-napi');

interface ModifierState {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

let modulePromise: Promise<UiohookModule> | null = null;
/** 正在使用钩子的监听实例数量，归零时停止钩子 */
let activeCount = 0;

/** 原生模块按需加载：只用系统快捷键时完全不会碰到它 */
const loadUiohook = (): Promise<UiohookModule> => {
  modulePromise ??= import('uiohook-napi').catch(error => {
    modulePromise = null;
    throw error;
  });
  return modulePromise;
};

const readModifiers = (event: ModifierState): TriggerModifier[] => {
  const modifiers: TriggerModifier[] = [];
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  return modifiers;
};

/**
 * 全局输入钩子后端（uiohook-napi）。
 * 能监听鼠标按键、长按和双击，但只监听不拦截：前台应用仍然会收到这次输入。
 */
export const createHookBackend = async (
  trigger: GlobalTrigger,
  onTrigger: TriggerHandler
): Promise<TriggerBackendInstance> => {
  const { uIOhook, UiohookKey } = await loadUiohook();
  const keycodeLookup = buildKeycodeLookup(UiohookKey as unknown as Record<string, number>);
  const matcher = new TriggerMatcher({ trigger, onTrigger });

  let paused = false;
  let disposed = false;

  const dispatch = (event: TriggerInputEvent) => {
    if (!paused) matcher.handle(event);
  };

  // 表里没有的按键也要交给匹配器：它们同样会打断长按和双击
  const toCode = (keycode: number): string => keycodeLookup.get(keycode) ?? `Unknown:${keycode}`;

  const onKey = (type: 'down' | 'up') => (event: UiohookKeyboardEvent) =>
    dispatch({
      type,
      input: { device: 'keyboard', code: toCode(event.keycode) },
      modifiers: readModifiers(event),
      time: Date.now()
    });

  const onMouse = (type: 'down' | 'up') => (event: UiohookMouseEvent) => {
    const button = getMouseButton(event.button);
    if (!button) {
      dispatch({ type: 'interrupt', time: Date.now() });
      return;
    }
    dispatch({
      type,
      input: { device: 'mouse', button },
      modifiers: readModifiers(event),
      time: Date.now(),
      x: event.x,
      y: event.y
    });
  };

  const onKeyDown = onKey('down');
  const onKeyUp = onKey('up');
  const onMouseDown = onMouse('down');
  const onMouseUp = onMouse('up');
  const onWheel = () => dispatch({ type: 'interrupt', time: Date.now() });
  const onMouseMove = (event: UiohookMouseEvent) =>
    dispatch({ type: 'move', x: event.x, y: event.y, time: Date.now() });

  // 鼠标移动事件非常密集，只有"鼠标长按"需要靠它判断是否在拖拽
  const needsMouseMove = trigger.input.device === 'mouse' && trigger.gesture === 'hold';

  uIOhook.on('keydown', onKeyDown);
  uIOhook.on('keyup', onKeyUp);
  uIOhook.on('mousedown', onMouseDown);
  uIOhook.on('mouseup', onMouseUp);
  uIOhook.on('wheel', onWheel);
  if (needsMouseMove) uIOhook.on('mousemove', onMouseMove);

  const removeListeners = () => {
    uIOhook.off('keydown', onKeyDown);
    uIOhook.off('keyup', onKeyUp);
    uIOhook.off('mousedown', onMouseDown);
    uIOhook.off('mouseup', onMouseUp);
    uIOhook.off('wheel', onWheel);
    uIOhook.off('mousemove', onMouseMove);
  };

  try {
    if (activeCount === 0) uIOhook.start();
    activeCount += 1;
  } catch (error) {
    removeListeners();
    throw error;
  }

  return {
    kind: 'hook',

    setPaused(value) {
      paused = value;
      matcher.reset();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      matcher.reset();
      removeListeners();
      activeCount -= 1;
      if (activeCount === 0) uIOhook.stop();
    }
  };
};
