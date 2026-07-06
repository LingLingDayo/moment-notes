<script lang="ts" setup>
import { computed } from 'vue';
import SettingInput from './controls/SettingInput.vue';
import SettingTextarea from './controls/SettingTextarea.vue';
import SettingSelect from './controls/SettingSelect.vue';
import SettingRadio from './controls/SettingRadio.vue';
import SettingButton from './controls/SettingButton.vue';
import ShortcutInput from './controls/ShortcutInput.vue';
import SettingWrapper from './controls/SettingWrapper.vue';
import { SettingItem, evaluateVisibility } from './settingsConfig';
import { useStickyNotesStore } from '@stores/stickyNotes';

const props = defineProps<{
  modelValue: any;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
  (e: 'action', actionKey: string): void;
}>();

const store = useStickyNotesStore();

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const resolveButtonLabel = (btn: any) => {
  if (typeof btn.label === 'function') {
    return btn.label(store);
  }
  return btn.label;
};

const resolveButtonDisabled = (btn: any) => {
  if (typeof btn.disabled === 'function') {
    return btn.disabled(store);
  }
  return !!btn.disabled;
};

const resolveButtonVisible = (btn: any) => {
  return evaluateVisibility(btn.visible, store);
};

const isVisible = computed(() => {
  return evaluateVisibility(props.item.visible, store);
});
</script>

<template>
  <div v-if="isVisible" class="setting-control-container">
    <!-- 1. Input -->
    <SettingInput
      v-if="item.type === 'input'"
      v-model="value"
      :item="item"
      :placeholder="item.placeholder"
      v-bind="item.props"
    />

    <!-- 2. Textarea -->
    <SettingTextarea
      v-else-if="item.type === 'textarea'"
      v-model="value"
      :item="item"
      :placeholder="item.placeholder"
      v-bind="item.props"
    />

    <!-- 3. Select / Multiselect -->
    <SettingSelect
      v-else-if="item.type === 'select' || item.type === 'multiselect'"
      v-model="value"
      :item="item"
      :options="item.options || []"
      :multiple="item.type === 'multiselect'"
      :placeholder="item.placeholder"
      v-bind="item.props"
    />

    <!-- 4. Radio -->
    <SettingRadio
      v-else-if="item.type === 'radio'"
      v-model="value"
      :item="item"
      :options="item.options || []"
    />

    <!-- 5. Button Group -->
    <SettingWrapper v-else-if="item.type === 'button-group'" :item="item">
      <div class="quick-actions-row">
        <template v-for="btn in item.buttons" :key="btn.actionKey">
          <SettingButton
            v-if="resolveButtonVisible(btn)"
            :variant="btn.variant"
            :width="btn.width"
            :min-width="btn.minWidth"
            :color="btn.color"
            :disabled="resolveButtonDisabled(btn)"
            @click="emit('action', btn.actionKey)"
          >
            <component :is="btn.icon" v-if="btn.icon" class="control-icon" />
            <span>{{ resolveButtonLabel(btn) }}</span>
          </SettingButton>
        </template>
      </div>
    </SettingWrapper>

    <!-- 7. Shortcut -->
    <ShortcutInput
      v-else-if="item.type === 'shortcut'"
      v-model="value"
      :item="item"
      :shortcut-id="item.key"
      @error="msg => store.showToast(msg, 'warning')"
    />

    <!-- 8. Text Content -->
    <SettingWrapper v-else-if="item.type === 'text'" :item="item">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="setting-text-content" v-html="item.content"></div>
    </SettingWrapper>

    <!-- 9. Component -->
    <component :is="item.component" v-else-if="item.type === 'component' && item.component" :item="item" />
  </div>
</template>

<style lang="scss" scoped>
.setting-control-container {
  display: contents;
}

.setting-text-content {
  width: 100%;

  :deep(ul) {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      font-size: 11px;
      line-height: 1.5;
      color: var(--text-muted);
      position: relative;
      padding-left: 12px;

      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--accent-color);
      }
    }
  }
}

.quick-actions-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
</style>
