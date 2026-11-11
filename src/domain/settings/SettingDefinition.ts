export interface SettingCodec<TValue> {
  decode(value: unknown): TValue | undefined;
  encode(value: TValue): string;
}

/** 设置可生效的运行平台；未声明 platforms 的设置在所有平台可用。 */
export type SettingPlatform = 'utools' | 'electron' | 'browser';

export interface SettingDefinition<TKey extends string, TValue> {
  key: TKey;
  storageKey: string;
  defaultValue: TValue;
  codec: SettingCodec<TValue>;
  platforms?: readonly SettingPlatform[];
}

export const decodeSettingValue = <TKey extends string, TValue>(
  definition: SettingDefinition<TKey, TValue>,
  value: unknown
): TValue | undefined => definition.codec.decode(value);

export const resolveSettingValue = <TKey extends string, TValue>(
  definition: SettingDefinition<TKey, TValue>,
  value: unknown
): TValue => decodeSettingValue(definition, value) ?? definition.defaultValue;

export const isSettingAvailableOn = (
  definition: Pick<SettingDefinition<string, unknown>, 'platforms'>,
  platform: SettingPlatform
): boolean => !definition.platforms || definition.platforms.includes(platform);

export const booleanSettingCodec: SettingCodec<boolean> = {
  decode: (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  },
  encode: (value: boolean) => String(value)
};

export const stringSettingCodec = (options: { nonEmpty?: boolean } = {}): SettingCodec<string> => ({
  decode: (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    if (options.nonEmpty && !value.trim()) return undefined;
    return value;
  },
  encode: (value: string) => String(value)
});

export const numberSettingCodec = (options: {
  min?: number;
  max?: number;
  integer?: boolean;
} = {}): SettingCodec<number> => ({
  decode: (value: unknown) => {
    let num: number;
    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
      num = options.integer ? parseInt(value, 10) : Number(value);
    } else {
      return undefined;
    }

    if (isNaN(num)) return undefined;
    if (options.min !== undefined && num < options.min) return undefined;
    if (options.max !== undefined && num > options.max) return undefined;
    return num;
  },
  encode: (value: number) => String(value)
});

export const enumSettingCodec = <T extends string>(allowedValues: readonly T[]): SettingCodec<T> => {
  const allowedSet = new Set<string>(allowedValues);
  return {
    decode: (value: unknown): T | undefined => {
      if (typeof value === 'string' && allowedSet.has(value)) {
        return value as T;
      }
      return undefined;
    },
    encode: (value: T) => String(value)
  };
};

export const jsonSettingCodec = <T>(validator: (val: unknown) => val is T): SettingCodec<T> => ({
  decode: (value: unknown): T | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      return validator(value) ? value : undefined;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return validator(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  },
  encode: (value: T) => JSON.stringify(value)
});

export type GridColumns = 'auto' | 1 | 2 | 3 | 4;

export const gridColumnsSettingCodec: SettingCodec<GridColumns> = {
  decode: (value: unknown): GridColumns | undefined => {
    if (value === 'auto') return 'auto';
    const num = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
    if ([1, 2, 3, 4].includes(num)) {
      return num as 1 | 2 | 3 | 4;
    }
    return undefined;
  },
  encode: (value: GridColumns) => String(value)
};
