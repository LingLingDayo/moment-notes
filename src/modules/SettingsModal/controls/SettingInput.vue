<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    placeholder?: string;
    type?: string;
  }>(),
  {
    placeholder: '',
    type: 'text'
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | number): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', props.type === 'number' ? Number(val) : val);
  }
});
</script>

<template>
  <div class="setting-input-wrapper">
    <input
      v-model="value"
      :type="type"
      :placeholder="placeholder"
      class="setting-input"
    />
  </div>
</template>

<style lang="scss" scoped>
.setting-input-wrapper {
  width: 100%;
}

.setting-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  transition: all 0.2s ease;
  outline: none;

  &:focus {
    border-color: var(--accent-color);
    background: var(--input-focus-bg, rgba(0, 0, 0, 0.08));
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  &::placeholder {
    color: var(--text-muted);
    font-size: 12px;
  }
}
</style>
