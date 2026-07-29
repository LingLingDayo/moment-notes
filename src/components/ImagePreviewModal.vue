<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { X, ZoomIn, ZoomOut, Undo2, Redo2, RotateCcw } from '@lucide/vue';
import { isImagePreviewOpen, activePreviewUrl, closeImagePreview } from '@utils/imageHandler';

const zoomScale = ref(1);
const rotation = ref(0);
const translateX = ref(0);
const translateY = ref(0);

const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const initialTranslateX = ref(0);
const initialTranslateY = ref(0);

const handleReset = () => {
  zoomScale.value = 1;
  rotation.value = 0;
  translateX.value = 0;
  translateY.value = 0;
};

watch(isImagePreviewOpen, (isOpen) => {
  if (isOpen) {
    handleReset();
  }
});

// Figma 风格：基于乘法指数与锚点坐标（如鼠标位置）进行动态比例缩放
const applyZoom = (targetScale: number, anchorX?: number, anchorY?: number) => {
  const oldScale = zoomScale.value;
  const MIN_SCALE = 0.05; // 最低 5%
  const MAX_SCALE = 10.0; // 最高 1000%

  const newScale = Number(Math.min(Math.max(targetScale, MIN_SCALE), MAX_SCALE).toFixed(3));
  if (Math.abs(newScale - oldScale) < 0.001) return;

  const mouseX = anchorX ?? window.innerWidth / 2;
  const mouseY = anchorY ?? window.innerHeight / 2;

  const ratio = newScale / oldScale;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 计算偏移，使得鼠标指针下方的图像像素在缩放前后留在屏幕同一点
  translateX.value = translateX.value + (mouseX - centerX - translateX.value) * (1 - ratio);
  translateY.value = translateY.value + (mouseY - centerY - translateY.value) * (1 - ratio);
  zoomScale.value = newScale;
};

// 按钮缩放：采用 1.25 倍乘法等比缩放
const zoomIn = () => {
  applyZoom(zoomScale.value * 1.25);
};

const zoomOut = () => {
  applyZoom(zoomScale.value / 1.25);
};

const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360;
};

const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360;
};

// 拖拽平移事件处理
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - startX.value;
  const deltaY = e.clientY - startY.value;
  translateX.value = initialTranslateX.value + deltaX;
  translateY.value = initialTranslateY.value + deltaY;
};

const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
};

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return; // 仅处理鼠标左键
  e.preventDefault();
  e.stopPropagation();

  isDragging.value = true;
  startX.value = e.clientX;
  startY.value = e.clientY;
  initialTranslateX.value = translateX.value;
  initialTranslateY.value = translateY.value;

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};

// 滚轮缩放：采用 Figma 风格的对数/指数动态比例 (Exponential Scaling)
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  // 基础缩放因子 1.15（即每次标准滚动产生 15% 的相对视觉变幅）
  const zoomFactor = Math.pow(1.15, -e.deltaY / 100);
  const clampedFactor = Math.min(Math.max(zoomFactor, 0.75), 1.35);

  applyZoom(zoomScale.value * clampedFactor, e.clientX, e.clientY);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isImagePreviewOpen.value) return;
  if (e.key === 'Escape') {
    closeImagePreview();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  handleMouseUp();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isImagePreviewOpen"
        class="image-preview-overlay"
        @click="closeImagePreview"
        @wheel.prevent="handleWheel"
      >
        <!-- 页面右上角关闭按钮 -->
        <button
          class="page-close-btn"
          data-tooltip="关闭预览 (Esc)"
          @click.stop="closeImagePreview"
        >
          <X class="close-icon" />
        </button>

        <!-- 悬浮底部工具栏 -->
        <div class="preview-toolbar" @click.stop>
          <button class="tool-btn" data-tooltip="放大" @click="zoomIn">
            <ZoomIn class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="缩小" @click="zoomOut">
            <ZoomOut class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="向左旋转 90°" @click="rotateLeft">
            <Undo2 class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="向右旋转 90°" @click="rotateRight">
            <Redo2 class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="重置" @click="handleReset">
            <RotateCcw class="tool-icon" />
          </button>
          <span class="scale-text">{{ Math.round(zoomScale * 100) }}%</span>
        </div>

        <!-- 图片展示区域 -->
        <div class="image-container" @click.stop>
          <img
            :src="activePreviewUrl"
            alt="图片预览"
            class="preview-img"
            :class="{ 'is-dragging': isDragging }"
            draggable="false"
            :style="{
              transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomScale}) rotate(${rotation}deg)`
            }"
            @dragstart.prevent
            @mousedown="handleMouseDown"
            @dblclick="handleReset"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  cursor: zoom-out;
  overflow: hidden;
}

.page-close-btn {
  @include overlay-close-btn;
}

.preview-toolbar {
  position: absolute;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  cursor: default;
}

.tool-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.85;
  transition: all 0.2s ease;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }

  .tool-icon {
    width: 16px;
    height: 16px;
  }
}

.scale-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  min-width: 40px;
  text-align: center;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  position: relative;
}

.preview-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: grab;
  user-select: none;

  &.is-dragging {
    transition: none;
    cursor: grabbing;
  }

  &:active {
    cursor: grabbing;
  }
}

// 动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
