<script lang="ts" setup>
import { computed, ref } from 'vue';
import { SettingItem } from '../settingsConfig';
import { useStickyNotesStore } from '@stores/stickyNotes';

const props = withDefaults(
  defineProps<{
    item: SettingItem;
    showHeader?: boolean;
  }>(),
  {
    showHeader: true
  }
);

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
  }, 200); // 200ms 的延迟，以适配 Tooltip 动效
};

const isShowHeader = computed(() => {
  if (props.item.showHeader !== undefined) return props.item.showHeader;
  if (props.item.hideHeader !== undefined) return !props.item.hideHeader;
  return props.showHeader;
});

const getDefaultTooltip = (item: SettingItem) => {
  if (item.default === undefined) return undefined;

  let valStr = '';
  const store = useStickyNotesStore();
  const options = typeof item.options === 'function' ? item.options(store) : (item.options || []);

  if (options && options.length > 0) {
    if (Array.isArray(item.default)) {
      const labels = options
          .filter(opt => item.default.includes(opt.value))
          .map(opt => opt.label);
      valStr = labels.join(', ');
    } else {
      const opt = options.find(opt => opt.value === item.default);
      valStr = opt ? opt.label : String(item.default);
    }
  } else {
    if (item.type === 'switch') {
      valStr = item.default ? '开启' : '关闭';
    } else {
      valStr = String(item.default);
    }
  }

  return `默认值: ${valStr}`;
};

// 计算样式以支持自定义宽度百分比
const wrapperStyle = computed(() => {
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

// 计算控件本身的宽度样式
const controlStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.item.controlWidth) {
    style.width = props.item.controlWidth;
  } else {
    const itemProps = (props.item.props as any) || {};
    if (itemProps.width) {
      style.width = itemProps.width;
    }
  }
  return style;
});
</script>

<template>
  <div
    class="setting-item"
    :class="[`type-${item.type}`, { 'is-partial-width': item.width && item.width !== '100%' }]"
    :style="wrapperStyle"
  >
    <!-- 统一渲染选项的标题及介绍文本，完美保留其容器样式 -->
    <div v-if="isShowHeader && (item.label || item.desc)" class="item-header">
      <div
        v-if="item.label"
        class="item-label"
        :data-tooltip="item.tooltip"
        :data-tooltip-custom="item.key === 'dateFormat' ? '' : undefined"
        @mouseenter="item.key === 'dateFormat' && onMouseEnter()"
        @mouseleave="item.key === 'dateFormat' && onMouseLeave()"
      >
        {{ item.label }}
      </div>
      <div v-if="item.desc" class="item-desc">
        {{ item.desc }}
      </div>
    </div>

    <!-- 自定义组件不使用 item-control 包裹，其他一律使用 -->
    <template v-if="item.type === 'component'">
      <slot></slot>
    </template>
    <div v-else class="item-control" :style="controlStyle">
      <slot :default-tooltip="getDefaultTooltip(item)"></slot>
    </div>

    <!-- 自定义日期格式说明 Tooltip 的 Teleport 挂载点 -->
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
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  box-sizing: border-box;

  &:last-child {
    border-bottom: none;
  }

  .item-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    transition: color 0.2s ease;
    width: fit-content;

    &[data-tooltip], &[data-tooltip-custom] {
      cursor: help;

      &:hover {
        color: var(--accent-color);
      }
    }
  }

  .item-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .item-control {
    display: flex;
    gap: 10px;
    margin: 4px 0;
    width: 100%;
  }

  &.type-component {
    > .item-header {
      > .item-label {
        font-size: 14.5px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 2px;

        &:not([data-tooltip]) {
          cursor: default;
          &:hover {
            color: var(--text-primary);
          }
        }
      }

      > .item-desc {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }
  }
}

@media (max-width: 599px) {
  .setting-item {
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
    white-space: normal;

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
