<script lang="ts" setup>
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    title: string;
    icon?: Component;
    isActive?: boolean;
    badge?: number | string;
    tooltip?: string;
    level?: number;
    customClass?: string;
    showActiveIndicator?: boolean;
  }>(),
  {
    icon: undefined,
    isActive: false,
    badge: 0,
    tooltip: undefined,
    level: 0,
    customClass: '',
    showActiveIndicator: true
  }
);
</script>

<template>
  <div
    class="menu-item"
    :class="[customClass, { active: isActive }]"
    :style="{ '--item-level': level }"
  >
    <div v-if="showActiveIndicator" class="active-indicator"></div>
    <div class="item-left">
      <component :is="icon" v-if="icon" class="item-icon" />
      <span class="item-name" :data-tooltip="tooltip">{{ title }}</span>
    </div>
    <span v-if="badge && Number(badge) > 0" class="item-badge">{{ badge }}</span>
    <slot name="right"></slot>
  </div>
</template>

<style lang="scss" scoped>
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  --level-indent: 14px;
  padding-left: calc(12px + var(--item-level, 0) * var(--level-indent));
  padding-right: 10px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  margin-bottom: 6px;
  flex-shrink: 0;

  .active-indicator {
    position: absolute;
    left: 0;
    width: 3px;
    height: 0;
    background: var(--accent-color);
    border-radius: 0 4px 4px 0;
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    background: var(--item-hover-bg);
    color: var(--text-primary);
  }

  &.active {
    background: var(--panel-bg);
    border-color: var(--panel-border);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    font-weight: 600;

    .active-indicator {
      height: 16px;
    }

    .item-icon {
      color: var(--accent-color);
    }

    .item-badge {
      background: var(--accent-color);
      color: var(--text-on-accent);
    }
  }

  &.trash-item.active {
    .item-icon {
      color: var(--danger-color, #ff4d4f) !important;
    }
    .item-badge {
      background: var(--danger-color, #ff4d4f) !important;
      color: var(--text-on-accent, #ffffff) !important;
    }
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;

  .item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: color 0.2s;
  }

  .item-name {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
}

.item-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  transition:
    opacity 0.2s,
    background-color 0.2s,
    color 0.2s,
    transform 0.2s;
}

@media (max-width: $screen-compact) {
  .menu-item {
    height: 36px;
    padding-left: calc(10px + var(--item-level, 0) * 10px);
    padding-right: 6px;
  }

  .item-left {
    gap: 6px;
  }
}
</style>
