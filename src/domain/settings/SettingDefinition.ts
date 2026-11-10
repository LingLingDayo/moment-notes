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
