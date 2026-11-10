import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_TRIGGER, type GlobalTrigger } from './GlobalTrigger';
import {
  applyCapturedInput,
  canCombineModifiers,
  captureKeyDown,
  captureLoneModifier,
  captureMouseDown,
  toggleTriggerModifier,
  type HeldModifiers
} from './triggerRecording';
import { validateGlobalTrigger } from './triggerValidation';

const held = (overrides: Partial<Record<keyof HeldModifiers, boolean>> = {}): HeldModifiers => ({
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
  ...overrides
});

const base: GlobalTrigger = { ...DEFAULT_GLOBAL_TRIGGER };

describe('captureKeyDown', () => {
  it('普通按键连同按住的修饰键一起提交，修饰键按固定顺序排列', () => {
    expect(captureKeyDown('KeyK', held({ shift: true, ctrl: true }))).toEqual({
      type: 'commit',
      input: { device: 'keyboard', code: 'KeyK' },
      modifiers: ['ctrl', 'shift']
    });
  });

  it('按下修饰键时先等待后续按键，右侧修饰键归一到左侧', () => {
    expect(captureKeyDown('ControlRight', held())).toEqual({
      type: 'pending-modifier',
      modifier: 'ctrl',
      code: 'ControlLeft'
    });
  });

  it('单独按 Esc 取消录制，带修饰键的 Esc 可以录成主键', () => {
    expect(captureKeyDown('Escape', held())).toEqual({ type: 'cancel' });
    expect(captureKeyDown('Escape', held({ alt: true }))).toEqual({
      type: 'commit',
      input: { device: 'keyboard', code: 'Escape' },
      modifiers: ['alt']
    });
  });

  it('不在按键表里的按键不支持', () => {
    expect(captureKeyDown('CapsLock', held())).toEqual({ type: 'unsupported' });
  });
});

describe('captureLoneModifier', () => {
  it('只按修饰键就松开时，把它本身当作主键', () => {
    expect(captureLoneModifier('AltRight')).toEqual({
      type: 'commit',
      input: { device: 'keyboard', code: 'AltLeft' },
      modifiers: []
    });
  });

  it('非修饰键不适用', () => {
    expect(captureLoneModifier('KeyA')).toEqual({ type: 'unsupported' });
  });
});

describe('captureMouseDown', () => {
  it.each([
    [0, 'left'],
    [1, 'middle'],
    [2, 'right'],
    [3, 'x1'],
    [4, 'x2']
  ] as const)('MouseEvent.button %i 对应 %s', (button, expected) => {
    expect(captureMouseDown(button, held())).toEqual({
      type: 'commit',
      input: { device: 'mouse', button: expected },
      modifiers: []
    });
  });

  it('带上按住的修饰键', () => {
    expect(captureMouseDown(1, held({ ctrl: true }))).toMatchObject({ modifiers: ['ctrl'] });
  });

  it('未知的鼠标按键不支持', () => {
    expect(captureMouseDown(7, held())).toEqual({ type: 'unsupported' });
  });
});

describe('applyCapturedInput', () => {
  it('搭配合法时只替换主键和修饰键', () => {
    const next = applyCapturedInput(base, { device: 'mouse', button: 'x1' }, []);

    expect(next).toEqual({ ...base, input: { device: 'mouse', button: 'x1' }, modifiers: [] });
    expect(validateGlobalTrigger(next)).toBeNull();
  });

  it('修饰键作主键时改成双击并清空修饰键', () => {
    const next = applyCapturedInput(base, { device: 'keyboard', code: 'ControlLeft' }, []);

    expect(next.gesture).toBe('double');
    expect(next.modifiers).toEqual([]);
    expect(validateGlobalTrigger(next)).toBeNull();
  });

  it('不带修饰键的鼠标左键改成长按', () => {
    const next = applyCapturedInput(base, { device: 'mouse', button: 'left' }, []);

    expect(next.gesture).toBe('hold');
    expect(validateGlobalTrigger(next)).toBeNull();
  });

  it('带修饰键的鼠标左键保留原来的触发方式', () => {
    const next = applyCapturedInput(base, { device: 'mouse', button: 'left' }, ['alt']);

    expect(next.gesture).toBe('press');
    expect(validateGlobalTrigger(next)).toBeNull();
  });

  it('无法自动修正的搭配原样返回，交给校验给出提示', () => {
    const next = applyCapturedInput(base, { device: 'keyboard', code: 'KeyA' }, []);

    expect(next.input).toEqual({ device: 'keyboard', code: 'KeyA' });
    expect(validateGlobalTrigger(next)).not.toBeNull();
  });

  it('不修改传入的触发器', () => {
    const snapshot = JSON.parse(JSON.stringify(base));

    applyCapturedInput(base, { device: 'keyboard', code: 'ControlLeft' }, []);

    expect(base).toEqual(snapshot);
  });
});

describe('修饰键选择', () => {
  it('切换修饰键的选中状态并保持固定顺序', () => {
    const added = toggleTriggerModifier({ ...base, modifiers: ['alt'] }, 'ctrl');
    expect(added.modifiers).toEqual(['ctrl', 'alt']);

    const removed = toggleTriggerModifier(added, 'alt');
    expect(removed.modifiers).toEqual(['ctrl']);
  });

  it('主键是修饰键时不能再叠加修饰键', () => {
    const trigger: GlobalTrigger = {
      ...base,
      modifiers: [],
      input: { device: 'keyboard', code: 'ShiftLeft' },
      gesture: 'double'
    };

    expect(canCombineModifiers(trigger.input)).toBe(false);
    expect(toggleTriggerModifier(trigger, 'ctrl')).toBe(trigger);
    expect(canCombineModifiers(base.input)).toBe(true);
  });
});
