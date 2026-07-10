<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import SettingWrapper from './SettingWrapper.vue';
import { SettingItem, SettingOption } from '../settingsConfig';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { COLOR_PRESETS } from '@stores/colorPresets';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  modelValue: any;
  item: SettingItem;
  options?: SettingOption[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const store = useStickyNotesStore();

const options = computed(() => props.options || []);
const multiple = computed(() => props.item.type === 'multiselect');
const placeholder = computed(() => props.item.placeholder || '请选择...');
const itemProps = computed(() => (props.item.props as any) || {});

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
  if (multiple.value) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val);
  }
  return props.modelValue === val;
};

const handleSelect = (option: SettingOption) => {
  if (multiple.value) {
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

const selectedOption = computed(() => {
  if (multiple.value) return null;
  return options.value.find(opt => opt.value === props.modelValue) || null;
});

const getColorStyle = (colorName: string) => {
  const preset = COLOR_PRESETS[colorName];
  if (!preset) return {};
  const isDark = store.isDark;
  return {
    backgroundColor: isDark ? preset.darkBg : preset.lightBg,
    borderColor: isDark ? preset.darkBorder : preset.lightBorder,
    borderWidth: '1px',
    borderStyle: 'solid'
  };
};

const displayLabel = computed(() => {
  if (multiple.value) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : [];
    if (values.length === 0) return placeholder.value;
    const selectedLabels = options.value
      .filter(opt => values.includes(opt.value))
      .map(opt => opt.label);
    return selectedLabels.join(', ');
  } else {
    const selectedOpt = options.value.find(opt => opt.value === props.modelValue);
    return selectedOpt ? selectedOpt.label : placeholder.value;
  }
});
</script>

<template>
  <SettingWrapper :item="item">
    <template #default="{ defaultTooltip }">
      <div ref="selectRef" class="custom-select-container" :data-tooltip="defaultTooltip" :style="itemProps.style">
        <div
          class="select-trigger"
          :class="{ open: isOpen }"
          @click="toggleDropdown"
        >
          <div class="trigger-content">
            <span v-if="!multiple && selectedOption && selectedOption.color" class="color-badge-dot" :style="getColorStyle(selectedOption.color)"></span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-if="!multiple && selectedOption && selectedOption.html" class="trigger-text" v-html="selectedOption.html"></span>
            <span v-else-if="!multiple && selectedOption" class="trigger-text">{{ selectedOption.label }}</span>
            <span v-else class="trigger-text" :class="{ placeholder: modelValue === undefined || modelValue === '' || (multiple && (!modelValue || modelValue.length === 0)) }">
              {{ displayLabel }}
            </span>
          </div>
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
              <div class="item-content-wrapper">
                <span v-if="option.color" class="color-badge-dot" :style="getColorStyle(option.color)"></span>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-if="option.html" class="item-label" v-html="option.html"></span>
                <span v-else class="item-label">{{ option.label }}</span>
              </div>
              <Check v-if="isSelected(option.value)" class="check-icon" />
            </div>
          </div>
        </Transition>
      </div>
    </template>
  </SettingWrapper>
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
    border-color: var(--accent-color);
  }

  &.open {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.item-content-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.color-badge-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
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
  margin-left: 8px;

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
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
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
