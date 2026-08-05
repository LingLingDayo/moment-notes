export interface SettingCodec<TValue> {
  decode(value: unknown): TValue | undefined;
  encode(value: TValue): string;
}

export interface SettingDefinition<TKey extends string, TValue> {
  key: TKey;
  storageKey: string;
  defaultValue: TValue;
  codec: SettingCodec<TValue>;
}

export const decodeSettingValue = <TKey extends string, TValue>(
  definition: SettingDefinition<TKey, TValue>,
  value: unknown
): TValue | undefined => definition.codec.decode(value);

export const resolveSettingValue = <TKey extends string, TValue>(
  definition: SettingDefinition<TKey, TValue>,
  value: unknown
): TValue => decodeSettingValue(definition, value) ?? definition.defaultValue;
