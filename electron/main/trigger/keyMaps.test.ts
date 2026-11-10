import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_TRIGGER, type GlobalTrigger } from '../../../src/domain/desktop/GlobalTrigger';
import { TRIGGER_KEYS } from '../../../src/domain/desktop/triggerKeys';
import {
  buildAccelerator,
  buildKeycodeLookup,
  getAcceleratorKey,
  getMouseButton,
  getUiohookKeyName
} from './keyMaps';

const trigger = (overrides: Partial<GlobalTrigger>): GlobalTrigger => ({ ...DEFAULT_GLOBAL_TRIGGER, ...overrides });

describe('getAcceleratorKey', () => {
  it.each([
    ['KeyN', 'N'],
    ['Digit7', '7'],
    ['F1', 'F1'],
    ['F24', 'F24'],
    ['Numpad3', 'num3'],
    ['Escape', 'Esc'],
    ['ArrowUp', 'Up'],
    ['Slash', '/'],
    ['NumpadAdd', 'numadd']
  ])('%s → %s', (code, expected) => {
    expect(getAcceleratorKey(code)).toBe(expected);
  });

  it.each(['ControlLeft', 'ShiftLeft', 'F25', 'CapsLock'])('%s 无法表达', code => {
    expect(getAcceleratorKey(code)).toBeUndefined();
  });

  it('按键表里除修饰键外的每个按键都能转换成 accelerator', () => {
    const missing = TRIGGER_KEYS.filter(info => info.kind !== 'modifier')
      .filter(info => getAcceleratorKey(info.code) === undefined)
      .map(info => info.code);

    expect(missing).toEqual([]);
  });
});

describe('buildAccelerator', () => {
  it('默认触发器转换成 Control+Alt+N', () => {
    expect(buildAccelerator(DEFAULT_GLOBAL_TRIGGER)).toBe('Control+Alt+N');
  });

  it('Win 键使用 Super，功能键可以不带修饰键', () => {
    expect(buildAccelerator(trigger({ modifiers: ['shift', 'meta'], input: { device: 'keyboard', code: 'Space' } }))).toBe(
      'Shift+Super+Space'
    );
    expect(buildAccelerator(trigger({ modifiers: [], input: { device: 'keyboard', code: 'F8' } }))).toBe('F8');
  });

  it('鼠标、长按、双击都不走系统快捷键', () => {
    expect(buildAccelerator(trigger({ input: { device: 'mouse', button: 'middle' } }))).toBeUndefined();
    expect(buildAccelerator(trigger({ gesture: 'hold' }))).toBeUndefined();
    expect(buildAccelerator(trigger({ gesture: 'double' }))).toBeUndefined();
  });
});

describe('uiohook 键名与键码', () => {
  it('字母、数字去掉前缀，修饰键使用 uiohook 的命名，其余同名', () => {
    expect(getUiohookKeyName('KeyA')).toBe('A');
    expect(getUiohookKeyName('Digit0')).toBe('0');
    expect(getUiohookKeyName('ControlLeft')).toBe('Ctrl');
    expect(getUiohookKeyName('MetaRight')).toBe('MetaRight');
    expect(getUiohookKeyName('PageDown')).toBe('PageDown');
  });

  it('根据键码表生成反查表，左右修饰键分别保留各自的 code', () => {
    const lookup = buildKeycodeLookup({ A: 30, F5: 63, Ctrl: 29, CtrlRight: 3613, Unused: 1 });

    expect(lookup.get(30)).toBe('KeyA');
    expect(lookup.get(63)).toBe('F5');
    expect(lookup.get(29)).toBe('ControlLeft');
    expect(lookup.get(3613)).toBe('ControlRight');
    expect(lookup.has(1)).toBe(false);
  });

  it('多个按键共用同一个键码时保留先出现的', () => {
    const lookup = buildKeycodeLookup({ Enter: 28, Tab: 28 });

    expect(lookup.get(28)).toBe('Enter');
  });
});

describe('getMouseButton', () => {
  it.each([
    [1, 'left'],
    [2, 'right'],
    [3, 'middle'],
    [4, 'x1'],
    [5, 'x2']
  ])('uiohook 按键 %i → %s', (button, expected) => {
    expect(getMouseButton(button)).toBe(expected);
  });

  it.each([0, 6, '1', undefined, null])('无法识别的取值 %s 返回 undefined', button => {
    expect(getMouseButton(button)).toBeUndefined();
  });
});
