import { onUnmounted, Ref } from 'vue';

export function useDragAutoScroll(
  containerRef: Ref<HTMLElement | null>,
  options: {
    threshold?: number;
    maxSpeed?: number;
  } = {}
) {
  const threshold = options.threshold ?? 60; // 触发滚动的边缘距离 (px)
  const maxSpeed = options.maxSpeed ?? 15;    // 最大滚动速度 (px)
  
  let animationFrameId: number | null = null;
  let scrollSpeed = 0; // 滚动的速度：负数为向上，正数为向下

  const stopScroll = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    scrollSpeed = 0;
  };

  const scrollLoop = () => {
    const container = containerRef.value;
    if (!container || scrollSpeed === 0) {
      stopScroll();
      return;
    }

    container.scrollTop += scrollSpeed;
    animationFrameId = requestAnimationFrame(scrollLoop);
  };

  const handleDragOver = (e: DragEvent) => {
    const container = containerRef.value;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientY = e.clientY;

    const distTop = clientY - rect.top;
    const distBottom = rect.bottom - clientY;

    if (distTop >= 0 && distTop < threshold) {
      // 靠近顶部，向上滚动。越靠近边缘速度越快
      const intensity = (threshold - distTop) / threshold; // 0 ~ 1
      scrollSpeed = -Math.max(2, intensity * maxSpeed);
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(scrollLoop);
      }
    } else if (distBottom >= 0 && distBottom < threshold) {
      // 靠近底部，向下滚动。越靠近边缘速度越快
      const intensity = (threshold - distBottom) / threshold; // 0 ~ 1
      scrollSpeed = Math.max(2, intensity * maxSpeed);
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(scrollLoop);
      }
    } else {
      // 不在边缘区域，停止滚动
      stopScroll();
    }
  };

  onUnmounted(() => {
    stopScroll();
  });

  return {
    handleDragOver,
    stopScroll
  };
}
