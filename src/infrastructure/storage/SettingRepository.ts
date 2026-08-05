import type { SettingDefinition } from '../../domain/settings/SettingDefinition';
import { decodeSettingValue, resolveSettingValue } from '../../domain/settings/SettingDefinition';
import { storage } from '@utils/storage';

export interface SettingStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SettingRepository {
  // Extension Point: 测试或新存储介质可通过适配器注入，不影响设置领域定义。
  public constructor(private readonly adapter: SettingStorageAdapter = storage) {}

  public get<TKey extends string, TValue>(
    definition: SettingDefinition<TKey, TValue>
  ): TValue {
    const rawValue = this.adapter.getItem(definition.storageKey);
    const decodedValue = decodeSettingValue(definition, rawValue);

    if (decodedValue !== undefined) {
      return decodedValue;
    }

    if (rawValue !== null) {
      this.adapter.setItem(
        definition.storageKey,
        definition.codec.encode(definition.defaultValue)
      );
    }

    return definition.defaultValue;
  }

  public set<TKey extends string, TValue>(
    definition: SettingDefinition<TKey, TValue>,
    value: unknown
  ): TValue {
    const normalizedValue = resolveSettingValue(definition, value);
    this.adapter.setItem(definition.storageKey, definition.codec.encode(normalizedValue));
    return normalizedValue;
  }
}

export const settingRepository = new SettingRepository();
