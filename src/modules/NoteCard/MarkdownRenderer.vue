<script lang="ts" setup>
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { openImagePreview } from '@utils/imageHandler';

const props = defineProps<{
  content: string;
}>();

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true
});

// 解析并过滤 html
const renderedHtml = computed(() => {
  if (!props.content) return '';
  const rawHtml = marked.parse(props.content) as string;
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'class']
  });
});

// 处理容器点击（捕获图片点击进行放大预览，链接安全跳转等）
const handleContainerClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  // 图片点击唤起大图预览
  if (target.tagName === 'IMG') {
    e.stopPropagation();
    const src = (target as HTMLImageElement).src;
    if (src) {
      openImagePreview(src);
    }
  } else if (target.tagName === 'A') {
    // 外部链接在新窗口/浏览器中打开
    const href = (target as HTMLAnchorElement).getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      e.stopPropagation();
      e.preventDefault();
      if (window.utools?.shellOpenExternal) {
        window.utools.shellOpenExternal(href);
      } else {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  }
};
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div
    class="markdown-body"
    @click="handleContainerClick"
    v-html="renderedHtml"
  ></div>
</template>

<style lang="scss">
.markdown-body {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  color: inherit;
  word-break: break-word;
  overflow-wrap: break-word;

  p {
    margin-bottom: 0.5em;
    &:last-child {
      margin-bottom: 0;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.35;
    margin-top: 0.8em;
    margin-bottom: 0.4em;
    color: inherit;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 { font-size: 1.3em; border-bottom: 1px dashed var(--popover-border); padding-bottom: 4px; }
  h2 { font-size: 1.15em; }
  h3 { font-size: 1.05em; }
  h4, h5, h6 { font-size: 1em; }

  ul, ol {
    padding-left: 1.4em;
    margin-bottom: 0.5em;
  }

  li {
    margin-bottom: 0.25em;

    input[type="checkbox"] {
      margin-right: 6px;
      vertical-align: middle;
    }
  }

  blockquote {
    margin: 0.5em 0;
    padding: 4px 10px;
    border-left: 3px solid var(--accent-color);
    background: rgba(0, 0, 0, 0.03);
    border-radius: 0 6px 6px 0;
    opacity: 0.9;

    .dark-theme & {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  code {
    font-family: monospace, SFMono-Regular, Consolas;
    font-size: 0.88em;
    padding: 2px 5px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 4px;

    .dark-theme & {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  pre {
    margin: 0.6em 0;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 8px;
    overflow-x: auto;

    .dark-theme & {
      background: rgba(0, 0, 0, 0.25);
    }

    code {
      padding: 0;
      background: transparent;
      font-size: 12px;
    }
  }

  a {
    color: var(--accent-color);
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      opacity: 0.85;
    }
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 6px 0;
    cursor: zoom-in;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: scale(1.01);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.6em 0;
    font-size: 12px;

    th, td {
      padding: 4px 8px;
      border: 1px solid var(--popover-border);
      text-align: left;
    }

    th {
      background: rgba(0, 0, 0, 0.04);
      font-weight: 600;

      .dark-theme & {
        background: rgba(255, 255, 255, 0.06);
      }
    }
  }

  hr {
    border: none;
    border-top: 1px dashed var(--popover-border);
    margin: 0.8em 0;
  }
}
</style>
