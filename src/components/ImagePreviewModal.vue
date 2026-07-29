<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw } from '@lucide/vue';
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

const zoomIn = () => {
  if (zoomScale.value < 5) {
    zoomScale.value = Number((zoomScale.value + 0.25).toFixed(2));
  }
};

const zoomOut = () => {
  if (zoomScale.value > 0.2) {
    zoomScale.value = Number((zoomScale.value - 0.25).toFixed(2));
  }
};

const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360;
};

const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360;
};

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return;
  isDragging.value = true;
  startX.value = e.clientX;
  startY.value = e.clientY;
  initialTranslateX.value = translateX.value;
  initialTranslateY.value = translateY.value;
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - startX.value;
  const deltaY = e.clientY - startY.value;
  translateX.value = initialTranslateX.value + deltaX;
  translateY.value = initialTranslateY.value + deltaY;
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
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
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isImagePreviewOpen"
        class="image-preview-overlay"
        @click="closeImagePreview"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
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
          <button class="tool-btn" data-tooltip="左转 90°" @click="rotateLeft">
            <RotateCcw class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="右转 90°" @click="rotateRight">
            <RotateCw class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="重置" @click="handleReset">
            <RefreshCw class="tool-icon" />
          </button>
          <span class="scale-text">{{ Math.round(zoomScale * 100) }}%</span>
        </div>

        <!-- 图片展示区域 -->
        <div
          class="image-container"
          @wheel.prevent="handleWheel"
          @click.stop
        >
          <img
            :src="activePreviewUrl"
            alt="图片预览"
            class="preview-img"
            :class="{ 'is-dragging': isDragging }"
            :style="{
              transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomScale}) rotate(${rotation}deg)`
            }"
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
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
