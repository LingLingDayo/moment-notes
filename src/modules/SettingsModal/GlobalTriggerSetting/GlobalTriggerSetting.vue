<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
import { RotateCcw } from '@lucide/vue';
import {
  TRIGGER_GESTURES,
  TRIGGER_HOLD_MS_DEFAULT,
  TRIGGER_HOLD_MS_MAX,
  TRIGGER_HOLD_MS_MIN,
  TRIGGER_HOLD_MS_STEP,
  TRIGGER_MODIFIERS
} from '../../../domain/desktop/GlobalTrigger';
import SettingSlider from '../controls/SettingSlider.vue';
import SettingSwitch from '../controls/SettingSwitch.vue';
import SettingWrapper from '../controls/SettingWrapper.vue';
import type { SettingItem } from '../settingsConfig';
import TriggerRecorder from './TriggerRecorder.vue';
import { useGlobalTriggerEditor } from './useGlobalTriggerEditor';

defineProps<{
  item: SettingItem;
}>();

/**
 * 各个子项的展示信息，复用通用设置控件的标题和布局。
 * 可选值、取值范围都取自领域层，这里只有文案。
 */
const FIELDS = {
  enabled: { key: 'globalTrigger.enabled', label: '', type: 'switch', showHeader: false },
  modifiers: {
    key: 'globalTrigger.modifiers',
    label: '修饰键',
    type: 'button-group',
    desc: '需要和主键同时按住的键，可以多选，也可以不选。'
  },
  input: {
    key: 'globalTrigger.input',
    label: '主键',
    type: 'button-group',
    desc: '键盘按键或鼠标按键。点击下方区域后，直接按一下想用的键即可。'
  },
  gesture: { key: 'globalTrigger.gesture', label: '触发方式', type: 'button-group' },
  holdMs: {
    key: 'globalTrigger.holdMs',
    label: '长按时长（毫秒）',
    type: 'slider',
    desc: '按住达到这个时长才会触发。期间松开，或鼠标移动了一段距离（例如在拖动选择文字），都不会触发。',
    default: TRIGGER_HOLD_MS_DEFAULT,
    props: { min: TRIGGER_HOLD_MS_MIN, max: TRIGGER_HOLD_MS_MAX, step: TRIGGER_HOLD_MS_STEP }
  }
} satisfies Record<string, SettingItem>;

const {
  draft,
  comboParts,
  gestureNote,
  canUseModifiers,
  isDefault,
  defaultLabel,
  status,
  setEnabled,
  toggleModifier,
  capture,
  setGesture,
  setHoldMs,
  reset
} = useGlobalTriggerEditor();

const summaryRef = ref<HTMLElement | null>(null);

// 出错原因显示在顶部的摘要卡片里；在下方修改导致出错时卡片可能已滚出视野，把它带回来
watch(
  () => status.value.tone,
  async tone => {
    if (tone !== 'error') return;
    await nextTick();
    summaryRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
);
</script>

<template>
  <SettingWrapper :item="item">
    <div class="trigger-editor">
      <!-- 当前快捷键与生效状态 -->
      <div ref="summaryRef" class="trigger-summary" :class="`tone-${status.tone}`">
        <div class="summary-main">
          <TransitionGroup
            name="cap"
            tag="div"
            class="summary-combo"
            :class="{ inactive: !draft.enabled }"
          >
            <span v-for="part in comboParts" :key="part" class="key-cap">{{ part }}</span>
            <span v-if="gestureNote" key="gesture-note" class="gesture-note">{{ gestureNote }}</span>
          </TransitionGroup>

          <div class="summary-actions">
            <SettingSwitch
              class="summary-switch"
              :model-value="draft.enabled"
              :item="FIELDS.enabled"
              :data-tooltip="draft.enabled ? '停用全局快捷键' : '启用全局快捷键'"
              @update:model-value="setEnabled"
            />
            <button
              type="button"
              class="reset-btn"
              :data-tooltip="`恢复默认：${defaultLabel}`"
              :disabled="isDefault"
              @click="reset"
            >
              <RotateCcw class="reset-icon" />
            </button>
          </div>
        </div>

        <div class="summary-status" role="status">
          <span class="status-dot"></span>
          <span class="status-text">{{ status.text }}</span>
          <span v-if="status.detail" class="status-detail">{{ status.detail }}</span>
        </div>
      </div>

      <!-- 停用时整块变淡并且不可操作 -->
      <div class="trigger-fields" :class="{ inactive: !draft.enabled }" :inert="!draft.enabled">
        <SettingWrapper :item="FIELDS.modifiers">
          <div
            class="option-row"
            :data-tooltip="canUseModifiers ? undefined : '主键本身是修饰键时，不能再叠加其他修饰键'"
          >
            <button
              v-for="modifier in TRIGGER_MODIFIERS"
              :key="modifier.id"
              type="button"
              class="option-btn"
              :class="{ active: draft.modifiers.includes(modifier.id) }"
              :aria-pressed="draft.modifiers.includes(modifier.id)"
              :disabled="!canUseModifiers"
              @click="toggleModifier(modifier.id)"
            >
              {{ modifier.label }}
            </button>
          </div>
        </SettingWrapper>

        <SettingWrapper :item="FIELDS.input">
          <TriggerRecorder :input="draft.input" @capture="capture" />
        </SettingWrapper>

        <div class="gesture-block">
          <SettingWrapper :item="FIELDS.gesture">
            <div class="option-row" role="radiogroup">
              <button
                v-for="gesture in TRIGGER_GESTURES"
                :key="gesture.id"
                type="button"
                role="radio"
                class="option-btn"
                :class="{ active: draft.gesture === gesture.id }"
                :aria-checked="draft.gesture === gesture.id"
                :data-tooltip="gesture.tooltip"
                @click="setGesture(gesture.id)"
              >
                {{ gesture.label }}
              </button>
            </div>
          </SettingWrapper>

          <!-- 只有"长按"需要时长，用 grid 行高做展开收起 -->
          <div class="hold-wrap" :class="{ open: draft.gesture === 'hold' }" :inert="draft.gesture !== 'hold'">
            <div class="hold-inner">
              <SettingSlider
                class="hold-field"
                :model-value="draft.holdMs"
                :item="FIELDS.holdMs"
                @update:model-value="setHoldMs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </SettingWrapper>
</template>

<style lang="scss" scoped>
.trigger-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  margin-top: 4px;
}

.trigger-summary {
  --status-color: var(--text-muted);

  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: $radius-lg;
  background: var(--input-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.08));
  transition: border-color $transition-normal;

  &.tone-ok {
    --status-color: var(--toast-success-icon, #10b981);
  }

  &.tone-error {
    --status-color: var(--danger-color, #ef4444);
    border-color: var(--danger-hover-border, rgba(239, 68, 68, 0.25));
  }
}

.summary-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-combo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  min-width: 0;
  transition: opacity $transition-normal;

  &.inactive {
    opacity: 0.45;
  }
}

.key-cap {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--btn-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.08));
  border-bottom-width: 2px;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;

  // 按键之间的加号画在间隙里，不占布局
  & + &::before {
    content: '+';
    position: absolute;
    left: -13px;
    color: var(--text-muted);
    font-weight: 500;
  }
}

.gesture-note {
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin-left: -8px;
  padding: 0 9px;
  border-radius: 100px;
  background: var(--accent-light);
  color: var(--accent-color);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.cap-enter-active {
  transition:
    opacity $transition-normal,
    transform $transition-normal;
}

.cap-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

// 离开的元素直接移除，避免新旧按键同时占位造成跳动
.cap-leave-active {
  display: none;
}

.summary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.summary-actions .summary-switch {
  width: auto;
  border-bottom: none;

  :deep(.item-control) {
    margin: 0;
  }
}

.reset-btn {
  @include flex-center;

  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    opacity $transition-fast,
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-color);
    border-color: var(--btn-hover-border);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .reset-icon {
    width: 14px;
    height: 14px;
  }
}

.summary-status {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
  font-size: 11.5px;
  line-height: 1.5;
}

.status-dot {
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: $radius-round;
  background: var(--status-color);
  transition: background-color $transition-normal;
}

.status-text {
  font-weight: 600;
  color: var(--status-color);
  transition: color $transition-normal;
}

.status-detail {
  color: var(--text-muted);
}

.trigger-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: opacity $transition-normal;

  &.inactive {
    opacity: 0.45;
  }
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.option-btn {
  @include flex-center;

  height: 36px;
  min-width: 64px;
  padding: 0 14px;
  border-radius: $radius-md;
  background: var(--btn-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.05));
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    opacity $transition-fast,
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;

  &:hover:not(:disabled) {
    background: var(--btn-hover-bg, rgba(255, 255, 255, 0.08));
    color: var(--text-primary);
    border-color: var(--btn-hover-border, rgba(255, 255, 255, 0.1));
  }

  &.active,
  &.active:hover:not(:disabled) {
    background: var(--accent-light);
    color: var(--accent-color);
    border-color: rgba(99, 102, 241, 0.25);
    font-weight: 600;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.gesture-block {
  display: flex;
  flex-direction: column;
}

.hold-wrap {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows $transition-normal,
    opacity $transition-normal;

  &.open {
    grid-template-rows: 1fr;
    opacity: 1;
  }
}

// 左右各留出一点空间，滑块在两端时的聚焦光圈不会被裁掉
.hold-inner {
  min-height: 0;
  overflow: hidden;
  margin: 0 -4px;
  padding: 0 4px;
}

.hold-inner .hold-field {
  padding-top: 14px;
}
</style>
