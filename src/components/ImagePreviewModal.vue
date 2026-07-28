<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { X, ZoomIn, ZoomOut, RotateCw } from '@lucide/vue';
import { isImagePreviewOpen, activePreviewUrl, closeImagePreview } from '@utils/imageHandler';

const zoomScale = ref(1);
const rotation = ref(0);

const handleReset = () => {
  zoomScale.value = 1;
  rotation.value = 0;
};

watch(isImagePreviewOpen, (isOpen) => {
  if (isOpen) {
    handleReset();
  }
});

const zoomIn = () => {
  if (zoomScale.value < 3) {
    zoomScale.value = Number((zoomScale.value + 0.25).toFixed(2));
  }
};

const zoomOut = () => {
  if (zoomScale.value > 0.5) {
    zoomScale.value = Number((zoomScale.value - 0.25).toFixed(2));
  }
};

const rotate = () => {
  rotation.value = (rotation.value + 90) % 360;
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
      >
        <!-- 悬浮顶部工具栏 -->
        <div class="preview-toolbar" @click.stop>
          <button class="tool-btn" data-tooltip="放大" @click="zoomIn">
            <ZoomIn class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="缩小" @click="zoomOut">
            <ZoomOut class="tool-icon" />
          </button>
          <button class="tool-btn" data-tooltip="旋转" @click="rotate">
            <RotateCw class="tool-icon" />
          </button>
          <span class="scale-text">{{ Math.round(zoomScale * 100) }}%</span>
          <div class="divider"></div>
          <button class="tool-btn close" data-tooltip="关闭 (Esc)" @click="closeImagePreview">
            <X class="tool-icon" />
          </button>
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
            :style="{
              transform: `scale(${zoomScale}) rotate(${rotation}deg)`
            }"
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
}

.preview-toolbar {
  position: absolute;
  top: 20px;
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

  &.close:hover {
    background: rgba(239, 68, 68, 0.8);
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

.divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.image-container {
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  overflow: hidden;
}

.preview-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: grab;

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
