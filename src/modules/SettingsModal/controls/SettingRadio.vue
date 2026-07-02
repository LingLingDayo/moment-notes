<script lang="ts" setup>
interface Option {
  label: string;
  value: any;
  icon?: any;
}

defineProps<{
  modelValue: any;
  options: Option[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
}>();

const selectOption = (val: any) => {
  emit('update:modelValue', val);
};
</script>

<template>
  <div class="setting-radio-group">
    <button
      v-for="option in options"
      :key="option.value"
      class="radio-btn"
      :class="{ active: modelValue === option.value }"
      @click="selectOption(option.value)"
    >
      <component :is="option.icon" v-if="option.icon" class="control-icon" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.setting-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.radio-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  line-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--btn-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.05));
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: var(--btn-hover-bg, rgba(255, 255, 255, 0.08));
    color: var(--text-primary);
    border-color: var(--btn-hover-border, rgba(255, 255, 255, 0.1));
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    font-weight: 600;
  }

  .control-icon {
    width: 14px;
    height: 14px;
  }
}
</style>
