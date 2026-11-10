<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Keyboard, Mouse } from '@lucide/vue';
import { useStickyNotesStore } from '@stores/stickyNotes';
import type { TriggerInput, TriggerModifier } from '../../../domain/desktop/GlobalTrigger';
import { getTriggerInputLabel, getTriggerModifierLabel } from '../../../domain/desktop/triggerFormat';
import { useTriggerRecorder } from './useTriggerRecorder';

const props = defineProps<{
  input: TriggerInput;
}>();

const emit = defineEmits<{
  (e: 'capture', input: TriggerInput, modifiers: TriggerModifier[]): void;
}>();

const store = useStickyNotesStore();
const zoneRef = ref<HTMLElement | null>(null);

const { isRecording, heldModifiers, start } = useTriggerRecorder({
  zone: zoneRef,
  onCapture: (input, modifiers) => emit('capture', input, modifiers),
  onUnsupported: () => store.showToast('不支持将该按键作为唤起键，请换一个', 'warning')
});

const inputLabel = computed(() => getTriggerInputLabel(props.input));
const inputIcon = computed(() => (props.input.device === 'mouse' ? Mouse : Keyboard));

/** 录制时实时显示已经按住的修饰键，让用户知道组合键正在被识别 */
const recordingText = computed(() => {
  if (heldModifiers.value.length === 0) return '请按下键盘按键，或在此处按下鼠标按键';
  return `${heldModifiers.value.map(getTriggerModifierLabel).join(' + ')} + …`;
});
</script>

<template>
  <div class="trigger-recorder">
    <button
      ref="zoneRef"
      type="button"
      class="recorder-zone"
      :class="{ recording: isRecording }"
      :data-tooltip="isRecording ? undefined : '点击后按下新的按键或鼠标按键'"
      @click="start"
    >
      <Transition name="recorder-swap" mode="out-in">
        <span v-if="isRecording" key="recording" class="recorder-content">
          <span class="recorder-text">{{ recordingText }}</span>
          <span class="rec-badge">REC</span>
        </span>
        <span v-else key="idle" class="recorder-content">
          <span class="recorder-value">
            <component :is="inputIcon" class="recorder-icon" />
            <span class="recorder-text">{{ inputLabel }}</span>
          </span>
          <span class="recorder-action">点击修改</span>
        </span>
      </Transition>
    </button>

    <div class="recorder-tip-wrap" :class="{ open: isRecording }">
      <div class="recorder-tip">
        <p class="recorder-tip-text">
          支持鼠标左键、右键、中键和两个侧键，可以同时按住修饰键。只按一下修饰键（如 Ctrl）会把它本身设为主键。按 Esc
          或点击区域外取消。
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.trigger-recorder {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.recorder-zone {
  display: flex;
  align-items: center;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  user-select: none;
  box-sizing: border-box;
  transition:
    height 0.25s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-color);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  // 录制时把区域拉高，方便用鼠标按键点中
  &.recording {
    height: 64px;
    border-color: var(--accent-color);
    border-style: dashed;
    box-shadow: 0 0 0 2px var(--accent-light);
    color: var(--accent-color);
    background: var(--accent-light);
    cursor: crosshair;
  }
}

.recorder-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.recorder-value {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.recorder-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.recorder-text {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recorder-action {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
  transition: color 0.2s ease;

  .recorder-zone:hover & {
    color: var(--accent-color);
  }
}

.rec-badge {
  flex-shrink: 0;
  background: var(--danger-color, #ef4444);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  animation: recorder-pulse 1.5s infinite;
}

// 用 grid 行高做展开动画，内容高度不固定也能平滑过渡
.recorder-tip-wrap {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.25s ease,
    opacity 0.2s ease;

  &.open {
    grid-template-rows: 1fr;
    opacity: 1;
  }
}

.recorder-tip {
  min-height: 0;
  overflow: hidden;
}

.recorder-tip-text {
  margin: 0;
  padding-top: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
}

.recorder-swap-enter-active,
.recorder-swap-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.recorder-swap-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.recorder-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes recorder-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
