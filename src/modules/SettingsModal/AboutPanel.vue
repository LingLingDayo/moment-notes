<script setup lang="ts">
const version = __APP_VERSION__
</script>

<template>
  <div class="about-wrapper">
    <div class="about-card">
      <img src="/logo.png" class="about-logo" alt="logo" />
      <div class="about-info">
        <h5 class="app-name">
          拾光便签
        </h5>
        <p class="app-version">
          Version {{ version }}
        </p>
      </div>
    </div>

    <div class="about-desc">
      一款专为 <strong>uTools</strong> 平台量身打造的高颜值、高生产力的便签小助手。它融合了流畅的 Fluent Design 动效和优雅的磨砂玻璃视觉外观，旨在帮助您随手捕捉工作、学习和生活中的点点滴滴。
    </div>

    <div class="tips-group">
      <div class="tips-title">
        💡 常用操作指南与快捷键
      </div>
      <ul class="tips-list">
        <li><strong>极速新建：</strong>在应用任意位置使用快捷键 <code>Ctrl + Alt + N</code> 可立即新建便签。</li>
        <li><strong>快速搜索：</strong>使用快捷键 <code>Ctrl + F</code> 可一键聚焦顶部的搜索框。</li>
        <li><strong>双击隐藏粘贴：</strong>双击便签卡片会直接自动收起窗口，并自动将便签内容填至您原先光标所在的输入位置。</li>
        <li><strong>捕获外部文本：</strong>在 uTools 的超级面板中，可以直接选中文本一键导入并创建新便签。</li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.about-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.about-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 12px;

  .about-logo {
    width: 44px;
    height: 44px;
  }

  .app-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .app-version {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }
}

.about-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.tips-group {
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 12px;

  .tips-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-color);
    margin-bottom: 8px;
  }

  .tips-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      font-size: 11px;
      line-height: 1.5;
      color: var(--text-muted);
      position: relative;
      padding-left: 12px;

      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--accent-color);
      }
    }

    code {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--text-primary);
      font-family: monospace;
      font-size: 10px;
    }
  }
}
</style>
