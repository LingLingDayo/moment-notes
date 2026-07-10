<script lang="ts" setup>
import { computed } from 'vue';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem } from '../settingsConfig';

const props = defineProps<{
  modelValue: boolean;
  item: SettingItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const isChecked = computed({
  get: () => !!props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const toggle = () => {
  isChecked.value = !isChecked.value;
};
</script>

<template>
  <SettingWrapper :item="item">
    <template #default="{ defaultTooltip }">
      <div
        class="setting-switch-container"
        :data-tooltip="defaultTooltip"
        @click="toggle"
      >
        <button
          type="button"
          class="switch-track"
          :class="{ checked: isChecked }"
          role="switch"
          :aria-checked="isChecked"
        >
          <span class="switch-thumb"></span>
        </button>
      </div>
    </template>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.setting-switch-container {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.switch-track {
  position: relative;
  width: 44px;
  height: 22px;
  border-radius: 100px;
  background: var(--btn-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.08));
  padding: 0;
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s ease;

  &:hover {
    background: var(--btn-hover-bg, rgba(255, 255, 255, 0.08));
    border-color: var(--btn-hover-border, rgba(255, 255, 255, 0.12));
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
  }

  &.checked {
    background: var(--accent-color, #6366f1);
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

    &:hover {
      background: var(--accent-hover, #4f46e5);
    }

    .switch-thumb {
      transform: translateX(22px);
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-secondary, #cccccc);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

// 模拟 Fluent Design 的微动效：点击时 thumb 拉伸（squish & stretch）
.switch-track:active {
  .switch-thumb {
    width: 20px;
  }
}

.switch-track.checked:active {
  .switch-thumb {
    width: 20px;
    left: -2px; // 向左拉伸修正
  }
}
</style>
