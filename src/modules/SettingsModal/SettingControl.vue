<script lang="ts" setup>
import { computed } from 'vue';
import SettingInput from './controls/SettingInput.vue';
import SettingTextarea from './controls/SettingTextarea.vue';
import SettingSelect from './controls/SettingSelect.vue';
import SettingRadio from './controls/SettingRadio.vue';
import SettingButton from './controls/SettingButton.vue';
import { SettingItem, evaluateVisibility } from './settingsConfig';
import { useStickyNotesStore } from '@stores/stickyNotes';
import { ref } from 'vue';

const showCustomTooltip = ref(false);
let leaveTimer: number | null = null;

const onMouseEnter = () => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  showCustomTooltip.value = true;
};

const onMouseLeave = () => {
  leaveTimer = window.setTimeout(() => {
    showCustomTooltip.value = false;
  }, 200); // 200ms 的延迟，以适配 Tooltip 淡出动效
};

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

const getDefaultTooltip = (item: SettingItem) => {
  if (item.default === undefined) return undefined;

  let valStr = '';
  if (item.options && item.options.length > 0) {
    if (Array.isArray(item.default)) {
      const labels = item.options
        .filter(opt => item.default.includes(opt.value))
        .map(opt => opt.label);
      valStr = labels.join(', ');
    } else {
      const opt = item.options.find(opt => opt.value === item.default);
      valStr = opt ? opt.label : String(item.default);
    }
  } else {
    valStr = String(item.default);
  }

  return `默认值: ${valStr}`;
};

// 计算样式以支持自定义宽度百分比
const groupStyle = computed(() => {
  if (!props.item.width) return {};
  if (props.item.width.endsWith('%')) {
    const percent = parseFloat(props.item.width);
    // 扣除 flex 布局下的 gap 宽度影响。我们在父容器使用 gap: 20px 16px，所以列 gap 是 16px
    const ratio = percent / 100;
    return {
      width: `calc(${percent}% - ${(1 - ratio) * 16}px)`
    };
  }
  return { width: props.item.width };
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
  <div
    v-if="isVisible"
    class="settings-group"
    :class="[`type-${item.type}`, { 'is-partial-width': item.width && item.width !== '100%' }]"
    :style="groupStyle"
  >
    <div class="group-header">
      <div 
        class="group-label" 
        :data-tooltip="item.tooltip"
        :data-tooltip-custom="item.key === 'dateFormat' ? '' : undefined"
        @mouseenter="item.key === 'dateFormat' && onMouseEnter()"
        @mouseleave="item.key === 'dateFormat' && onMouseLeave()"
      >
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
        :data-tooltip="getDefaultTooltip(item)"
      />

      <!-- 2. Textarea -->
      <SettingTextarea
        v-else-if="item.type === 'textarea'"
        v-model="value"
        :placeholder="item.placeholder"
        v-bind="item.props"
        :data-tooltip="getDefaultTooltip(item)"
      />

      <!-- 3. Select / Multiselect -->
      <SettingSelect
        v-else-if="item.type === 'select' || item.type === 'multiselect'"
        v-model="value"
        :options="item.options || []"
        :multiple="item.type === 'multiselect'"
        :placeholder="item.placeholder"
        v-bind="item.props"
        :data-tooltip="getDefaultTooltip(item)"
      />

      <!-- 4. Radio -->
      <SettingRadio
        v-else-if="item.type === 'radio'"
        v-model="value"
        :options="item.options || []"
        :data-tooltip="getDefaultTooltip(item)"
      />

      <!-- 5. Button Group -->
      <div v-else-if="item.type === 'button-group'" class="quick-actions-row">
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

      <!-- 6. Custom Component -->
      <component
        :is="item.component"
        v-else-if="item.type === 'component' && item.component"
      />
    </div>

    <!-- 使用 Teleport 传送到全局 Tooltip 容器中 -->
    <Teleport v-if="showCustomTooltip && item.key === 'dateFormat'" to="#global-tooltip">
      <div class="tooltip-table-container">
        <div class="tooltip-title">
          支持的格式说明
        </div>
        <table class="tooltip-table">
          <thead>
            <tr>
              <th>单位</th>
              <th>长格式 (补零)</th>
              <th>短格式 (不补零)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>年 (Year)</td>
              <td><code>YYYY</code> (如 2026)</td>
              <td><code>YY</code> (如 26)</td>
            </tr>
            <tr>
              <td>月 (Month)</td>
              <td><code>MM</code> (01-12)</td>
              <td><code>M</code> (1-12)</td>
            </tr>
            <tr>
              <td>日 (Day)</td>
              <td><code>DD</code> (01-31)</td>
              <td><code>D</code> (1-31)</td>
            </tr>
            <tr>
              <td>小时 (24h)</td>
              <td><code>HH</code> (00-23)</td>
              <td><code>H</code> (0-23)</td>
            </tr>
            <tr>
              <td>小时 (12h)</td>
              <td><code>hh</code> (01-12)</td>
              <td><code>h</code> (1-12)</td>
            </tr>
            <tr>
              <td>分钟 (Min)</td>
              <td><code>mm</code> (00-59)</td>
              <td><code>m</code> (0-59)</td>
            </tr>
            <tr>
              <td>秒数 (Sec)</td>
              <td><code>ss</code> (00-59)</td>
              <td><code>s</code> (0-59)</td>
            </tr>
            <tr>
              <td>上下午</td>
              <td><code>A</code> (AM/PM)</td>
              <td><code>a</code> (上午/下午)</td>
            </tr>
          </tbody>
        </table>
        <div class="tooltip-footer">
          示例: YYYY-MM-DD HH:mm:ss 或 YYYY/MM/DD
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  // padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  box-sizing: border-box;

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

.quick-actions-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

@media (max-width: 599px) {
  .settings-group {
    width: 100% !important;
  }
}

/* 复杂的 HTML Tooltip 内部表格组件样式 - Scoped 级锁定 */
.tooltip-table-container {
  padding: 2px 0;
  font-family: inherit;

  .tooltip-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-primary);
  }

  .tooltip-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
    white-space: normal; // 必须重置 pre-line，防止在 table 内部有不换行问题或奇怪的空隙

    th, td {
      padding: 4px 8px;
      text-align: left;
      font-size: 10.5px;
      line-height: 1.4;
    }

    th {
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--panel-border);
    }

    td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      
      :global(.light-theme) & {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
      }
    }

    tr:last-child td {
      border-bottom: none;
    }

    code {
      background: rgba(99, 102, 241, 0.12);
      color: var(--accent-color);
      padding: 1px 4px;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid rgba(99, 102, 241, 0.15);
    }
  }

  .tooltip-footer {
    font-size: 10px;
    color: var(--text-muted);
    border-top: 1px solid var(--panel-border);
  }
}
</style>
