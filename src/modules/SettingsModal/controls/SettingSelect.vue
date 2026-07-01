<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

interface Option {
  label: string;
  value: any;
}

const props = withDefaults(
  defineProps<{
    modelValue: any;
    options: Option[];
    multiple?: boolean;
    placeholder?: string;
  }>(),
  {
    multiple: false,
    placeholder: '请选择...'
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const handleClickOutside = (e: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

const isSelected = (val: any) => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val);
  }
  return props.modelValue === val;
};

const handleSelect = (option: Option) => {
  if (props.multiple) {
    const currentValues = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const index = currentValues.indexOf(option.value);
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(option.value);
    }
    emit('update:modelValue', currentValues);
  } else {
    emit('update:modelValue', option.value);
    closeDropdown();
  }
};

const displayLabel = computed(() => {
  if (props.multiple) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : [];
    if (values.length === 0) return props.placeholder;
    const selectedLabels = props.options
      .filter(opt => values.includes(opt.value))
      .map(opt => opt.label);
    return selectedLabels.join(', ');
  } else {
    const selectedOpt = props.options.find(opt => opt.value === props.modelValue);
    return selectedOpt ? selectedOpt.label : props.placeholder;
  }
});
</script>

<template>
  <div ref="selectRef" class="custom-select-container">
    <div
      class="select-trigger"
      :class="{ open: isOpen }"
      @click="toggleDropdown"
    >
      <span class="trigger-text" :class="{ placeholder: !multiple && (modelValue === undefined || modelValue === '') }">
        {{ displayLabel }}
      </span>
      <ChevronDown class="arrow-icon" :class="{ rotate: isOpen }" />
    </div>

    <Transition name="slide-up">
      <div v-if="isOpen" class="select-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          class="dropdown-item"
          :class="{ active: isSelected(option.value) }"
          @click="handleSelect(option)"
        >
          <span class="item-label">{{ option.label }}</span>
          <Check v-if="isSelected(option.value)" class="check-icon" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.custom-select-container {
  position: relative;
  width: 100%;
  user-select: none;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  &.open {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
}

.trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
  
  &.placeholder {
    color: var(--text-muted);
  }
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
  flex-shrink: 0;

  &.rotate {
    transform: rotate(180deg);
  }
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  border-radius: 12px;
  box-shadow: var(--popover-shadow);
  z-index: 1000;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--item-hover-bg, rgba(255, 255, 255, 0.04));
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent-color);
    font-weight: 600;
  }
}

.check-icon {
  width: 14px;
  height: 14px;
  color: var(--accent-color);
  flex-shrink: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
