<script lang="ts" setup>
import { computed } from 'vue';
import SettingInput from './controls/SettingInput.vue';
import SettingTextarea from './controls/SettingTextarea.vue';
import SettingSelect from './controls/SettingSelect.vue';
import SettingRadio from './controls/SettingRadio.vue';
import { SettingItem } from './settingsConfig';

const props = defineProps<{
  modelValue: any;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});
</script>

<template>
  <div class="settings-group" :class="`type-${item.type}`">
    <div class="group-header">
      <div class="group-label">
        {{ item.label }}
      </div>
      <div v-if="item.desc" class="group-desc">
        {{ item.desc }}
      </div>
    </div>

    <div class="group-control">
      <!-- 1. Input -->
      <SettingInput
        v-if="item.type === 'input'"
        v-model="value"
        :placeholder="item.placeholder"
        v-bind="item.props"
      />

      <!-- 2. Textarea -->
      <SettingTextarea
        v-else-if="item.type === 'textarea'"
        v-model="value"
        :placeholder="item.placeholder"
        v-bind="item.props"
      />

      <!-- 3. Select / Multiselect -->
      <SettingSelect
        v-else-if="item.type === 'select' || item.type === 'multiselect'"
        v-model="value"
        :options="item.options || []"
        :multiple="item.type === 'multiselect'"
        :placeholder="item.placeholder"
      />

      <!-- 4. Radio -->
      <SettingRadio
        v-else-if="item.type === 'radio'"
        v-model="value"
        :options="item.options || []"
      />

      <!-- 5. Custom Slot -->
      <slot v-else-if="item.type === 'custom'" :name="item.key"></slot>

      <!-- Extension Point: Support for new setting controls -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  .group-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .group-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .group-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .group-control {
    display: flex;
    gap: 10px;
    margin: 4px 0;
    width: 100%;
  }
}
</style>
