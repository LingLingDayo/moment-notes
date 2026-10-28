<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { openImagePreview } from '@utils/imageHandler';
import { isAssetUrl, extractAssetId } from '@utils/imageProcessing';
import { resolveAssetImagesInContainer } from '@utils/useAssetImages';

const props = defineProps<{
  content: string;
}>();

const containerRef = ref<HTMLElement | null>(null);

// 1. 配置 marked 与自定义 image renderer
marked.setOptions({
  gfm: true,
  breaks: true
});

marked.use({
  renderer: {
    image({ href, title, text }) {
      if (href && isAssetUrl(href)) {
        const assetId = extractAssetId(href) || '';
        const titleAttr = title ? ` title="${title}"` : '';
        // 采用占位透明 SVG，避免渲染原生破损图片图标
        const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3C/svg%3E';
        return `<img data-asset-id="${assetId}" src="${placeholder}" alt="${text || '图片'}" class="markdown-asset-img"${titleAttr} />`;
      }
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href || ''}" alt="${text || ''}"${titleAttr} />`;
    }
  }
});

// 2. 解析并过滤 html
const renderedHtml = computed(() => {
  if (!props.content) return '';
  const rawHtml = marked.parse(props.content) as string;
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'class', 'data-asset-id']
  });
});

// 3. 异步解析容器内的本地图片
const resolveImages = async () => {
  await nextTick();
  if (containerRef.value) {
    await resolveAssetImagesInContainer(containerRef.value);
  }
};

onMounted(resolveImages);
watch(renderedHtml, resolveImages);

// 4. 处理容器点击（捕获图片点击进行放大预览，链接安全跳转等）
const handleContainerClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  // 图片点击唤起大图预览
  if (target.tagName === 'IMG') {
    e.stopPropagation();
    const imgEl = target as HTMLImageElement;
    const src = imgEl.src;
    // 如果还在加载占位阶段则不唤起大图
    if (!src || src.startsWith('data:image/svg')) return;

    const container = containerRef.value;
    const imgElements = container ? Array.from(container.querySelectorAll('img')) : [];
    const imageList = imgElements
      .map(img => img.src)
      .filter(s => s && !s.startsWith('data:image/svg'));
    const index = imageList.indexOf(src);
    openImagePreview(src, imageList, index !== -1 ? index : 0);
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
  <!-- eslint-disable vue/no-v-html -->
  <div
    ref="containerRef"
    class="markdown-body"
    @click="handleContainerClick"
    v-html="renderedHtml"
  ></div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<style lang="scss">
.markdown-body {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  color: inherit;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;

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
    max-width: 100% !important;
    height: auto !important;
    box-sizing: border-box;
    display: block;
    border-radius: 8px;
    margin: 6px 0;
    cursor: zoom-in;
    transition: opacity 0.2s ease, filter 0.2s ease;

    &:hover {
      opacity: 0.92;
      filter: brightness(1.03);
    }

    &.markdown-asset-img:not(.asset-img-loaded) {
      min-height: 48px;
      background: rgba(0, 0, 0, 0.04);
      opacity: 0.6;
      border: 1px dashed var(--popover-border);

      .dark-theme & {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    &.asset-img-failed {
      min-height: 36px;
      border: 1px dashed var(--popover-border);
      opacity: 0.5;
      padding: 6px 10px;
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
