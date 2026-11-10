import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GLOBAL_TRIGGER,
  TRIGGER_HOLD_MS_MAX,
  TRIGGER_HOLD_MS_MIN,
  cloneGlobalTrigger,
  isSameGlobalTrigger,
  type GlobalTrigger
} from './GlobalTrigger';
import { GLOBAL_TRIGGER_SETTING, HIDE_ON_BLUR_SETTING } from './DesktopSettings';
import { formatGlobalTrigger, getTriggerComboParts, getTriggerGestureNote } from './triggerFormat';
import { getTriggerKeyInfo } from './triggerKeys';
import {
  parseGlobalTrigger,
  resolveTriggerBackend,
  validateGlobalTrigger
} from './triggerValidation';
import { isSettingAvailableOn } from '../settings/SettingDefinition';

const trigger = (overrides: Partial<GlobalTrigger>): GlobalTrigger => ({
  ...DEFAULT_GLOBAL_TRIGGER,
  ...overrides
});

describe('validateGlobalTrigger', () => {
  it('默认触发器合法', () => {
    expect(validateGlobalTrigger(DEFAULT_GLOBAL_TRIGGER)).toBeNull();
  });

  it('鼠标左键 / 右键不带修饰键时，只允许长按', () => {
    for (const button of ['left', 'right'] as const) {
      const input = { device: 'mouse', button } as const;
      expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'press' }))).not.toBeNull();
      expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'double' }))).not.toBeNull();
      expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'hold' }))).toBeNull();
      expect(validateGlobalTrigger(trigger({ modifiers: ['ctrl'], input, gesture: 'press' }))).toBeNull();
    }
  });

  it('鼠标中键和侧键不需要修饰键', () => {
    for (const button of ['middle', 'x1', 'x2'] as const) {
      const input = { device: 'mouse', button } as const;
      expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'press' }))).toBeNull();
    }
  });

  it('普通按键必须搭配 Ctrl / Alt / Win，只有 Shift 不够', () => {
    const input = { device: 'keyboard', code: 'KeyA' } as const;
    expect(validateGlobalTrigger(trigger({ modifiers: [], input }))).not.toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: ['shift'], input }))).not.toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'hold' }))).not.toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: ['alt'], input }))).toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: ['shift', 'meta'], input }))).toBeNull();
  });

  it('功能键可以单独使用', () => {
    const input = { device: 'keyboard', code: 'F8' } as const;
    expect(validateGlobalTrigger(trigger({ modifiers: [], input }))).toBeNull();
  });

  it('修饰键作为主键时只允许不带其他修饰键的双击', () => {
    const input = { device: 'keyboard', code: 'ControlLeft' } as const;
    expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'double' }))).toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'press' }))).not.toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: [], input, gesture: 'hold' }))).not.toBeNull();
    expect(validateGlobalTrigger(trigger({ modifiers: ['alt'], input, gesture: 'double' }))).not.toBeNull();
  });
});

describe('parseGlobalTrigger', () => {
  it('规范化修饰键顺序、去重，并把右侧修饰键归一到左侧', () => {
    const parsed = parseGlobalTrigger({
      enabled: true,
      modifiers: ['shift', 'ctrl', 'shift'],
      input: { device: 'keyboard', code: 'KeyK' },
      gesture: 'press',
      holdMs: 500
    });
    expect(parsed?.modifiers).toEqual(['ctrl', 'shift']);

    const modifierKey = parseGlobalTrigger({
      modifiers: [],
      input: { device: 'keyboard', code: 'ControlRight' },
      gesture: 'double'
    });
    expect(modifierKey?.input).toEqual({ device: 'keyboard', code: 'ControlLeft' });
    expect(modifierKey?.enabled).toBe(true);
  });

  it('把长按时长限制在合法区间内', () => {
    const base = { modifiers: [], input: { device: 'mouse', button: 'middle' }, gesture: 'hold' };
    expect(parseGlobalTrigger({ ...base, holdMs: 1 })?.holdMs).toBe(TRIGGER_HOLD_MS_MIN);
    expect(parseGlobalTrigger({ ...base, holdMs: 99999 })?.holdMs).toBe(TRIGGER_HOLD_MS_MAX);
    expect(parseGlobalTrigger({ ...base, holdMs: 'abc' })?.holdMs).toBe(DEFAULT_GLOBAL_TRIGGER.holdMs);
  });

  it('拒绝结构不合法的数据', () => {
    const mouse = (button: string) => ({ device: 'mouse', button });
    expect(parseGlobalTrigger(null)).toBeUndefined();
    expect(parseGlobalTrigger('Ctrl+N')).toBeUndefined();
    expect(parseGlobalTrigger({ modifiers: [], input: mouse('x9'), gesture: 'press' })).toBeUndefined();
    expect(parseGlobalTrigger({ modifiers: ['hyper'], input: mouse('x1'), gesture: 'press' })).toBeUndefined();
    expect(parseGlobalTrigger({ modifiers: [], input: mouse('x1'), gesture: 'triple' })).toBeUndefined();
    expect(
      parseGlobalTrigger({ modifiers: [], input: { device: 'keyboard', code: 'NoSuchKey' }, gesture: 'press' })
    ).toBeUndefined();
  });
});

describe('resolveTriggerBackend', () => {
  it('只有"键盘 + 按下"使用系统快捷键，其余走全局监听', () => {
    expect(resolveTriggerBackend(DEFAULT_GLOBAL_TRIGGER)).toBe('accelerator');
    expect(resolveTriggerBackend(trigger({ gesture: 'hold' }))).toBe('hook');
    expect(resolveTriggerBackend(trigger({ gesture: 'double' }))).toBe('hook');
    expect(resolveTriggerBackend(trigger({ input: { device: 'mouse', button: 'x1' } }))).toBe('hook');
  });
});

describe('formatGlobalTrigger', () => {
  it('按固定顺序输出修饰键并附带触发方式', () => {
    expect(formatGlobalTrigger(DEFAULT_GLOBAL_TRIGGER)).toBe('Ctrl + Alt + N');
    expect(
      formatGlobalTrigger(
        trigger({ modifiers: ['ctrl'], input: { device: 'mouse', button: 'middle' }, gesture: 'hold', holdMs: 600 })
      )
    ).toBe('Ctrl + 鼠标中键（长按 600ms）');
    expect(
      formatGlobalTrigger(
        trigger({ modifiers: [], input: { device: 'keyboard', code: 'ControlLeft' }, gesture: 'double' })
      )
    ).toBe('Ctrl（双击）');
  });

  it('可以分别取出按键名称和触发方式说明', () => {
    const holdMiddle = trigger({
      modifiers: ['shift', 'ctrl'],
      input: { device: 'mouse', button: 'middle' },
      gesture: 'hold',
      holdMs: 600
    });

    expect(getTriggerComboParts(holdMiddle)).toEqual(['Ctrl', 'Shift', '鼠标中键']);
    expect(getTriggerGestureNote(holdMiddle)).toBe('长按 600ms');
    expect(getTriggerGestureNote(trigger({ gesture: 'double' }))).toBe('双击');
    expect(getTriggerGestureNote(DEFAULT_GLOBAL_TRIGGER)).toBe('');
  });
});

describe('isSameGlobalTrigger', () => {
  it('内容相同的副本视为一致，修饰键顺序不影响结果', () => {
    expect(isSameGlobalTrigger(DEFAULT_GLOBAL_TRIGGER, cloneGlobalTrigger(DEFAULT_GLOBAL_TRIGGER))).toBe(true);
    expect(isSameGlobalTrigger(trigger({ modifiers: ['alt', 'ctrl'] }), DEFAULT_GLOBAL_TRIGGER)).toBe(true);
  });

  it.each<[string, Partial<GlobalTrigger>]>([
    ['启用状态', { enabled: false }],
    ['修饰键', { modifiers: ['ctrl'] }],
    ['键盘主键', { input: { device: 'keyboard', code: 'KeyM' } }],
    ['输入设备', { input: { device: 'mouse', button: 'middle' } }],
    ['触发方式', { gesture: 'hold' }],
    ['长按时长', { holdMs: 800 }]
  ])('%s不同时视为不一致', (_name, overrides) => {
    expect(isSameGlobalTrigger(trigger(overrides), DEFAULT_GLOBAL_TRIGGER)).toBe(false);
  });

  it('鼠标按键不同时视为不一致', () => {
    const middle = trigger({ input: { device: 'mouse', button: 'middle' } });
    const side = trigger({ input: { device: 'mouse', button: 'x1' } });

    expect(isSameGlobalTrigger(middle, side)).toBe(false);
  });
});

describe('triggerKeys', () => {
  it('左右修饰键解析为同一个按键', () => {
    expect(getTriggerKeyInfo('ShiftRight')).toEqual(getTriggerKeyInfo('ShiftLeft'));
    expect(getTriggerKeyInfo('MetaRight')?.modifier).toBe('meta');
  });
});

describe('桌面设置定义', () => {
  it('只在 Electron 平台可用', () => {
    for (const definition of [GLOBAL_TRIGGER_SETTING, HIDE_ON_BLUR_SETTING]) {
      expect(isSettingAvailableOn(definition, 'electron')).toBe(true);
      expect(isSettingAvailableOn(definition, 'utools')).toBe(false);
      expect(isSettingAvailableOn(definition, 'browser')).toBe(false);
    }
  });

  it('触发器编解码可往返，并同时接受字符串和对象', () => {
    const value = trigger({ modifiers: ['alt'], input: { device: 'mouse', button: 'x2' }, gesture: 'double' });
    const encoded = GLOBAL_TRIGGER_SETTING.codec.encode(value);
    expect(GLOBAL_TRIGGER_SETTING.codec.decode(encoded)).toEqual(value);
    expect(GLOBAL_TRIGGER_SETTING.codec.decode(value)).toEqual(value);
  });

  it('解码时拒绝损坏或不安全的触发器', () => {
    expect(GLOBAL_TRIGGER_SETTING.codec.decode('{not json')).toBeUndefined();
    expect(GLOBAL_TRIGGER_SETTING.codec.decode(null)).toBeUndefined();
    expect(
      GLOBAL_TRIGGER_SETTING.codec.decode(
        trigger({ modifiers: [], input: { device: 'mouse', button: 'left' }, gesture: 'press' })
      )
    ).toBeUndefined();
  });

  it('失焦隐藏接受布尔值及其字符串形式', () => {
    expect(HIDE_ON_BLUR_SETTING.codec.decode('true')).toBe(true);
    expect(HIDE_ON_BLUR_SETTING.codec.decode(false)).toBe(false);
    expect(HIDE_ON_BLUR_SETTING.codec.decode('yes')).toBeUndefined();
    expect(HIDE_ON_BLUR_SETTING.codec.encode(true)).toBe('true');
  });
});
