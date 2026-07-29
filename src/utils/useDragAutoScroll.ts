import { onUnmounted, Ref } from 'vue';

export function useDragAutoScroll(
  containerRef: Ref<HTMLElement | null>,
  options: {
    threshold?: number;
    maxSpeed?: number;
    minSpeed?: number;
    overflowMargin?: number;
  } = {}
) {
  const threshold = options.threshold ?? 90; // 触发滚动的边缘距离 (px)
  const maxSpeed = options.maxSpeed ?? 20; // 最大滚动速度 (px/frame)
  const minSpeed = options.minSpeed ?? 3; // 最小基础滚动速度 (px/frame)
  const overflowMargin = options.overflowMargin ?? 200; // 允许鼠标超出容器顶/底部的缓冲区 (px)

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

    // 忽略无效坐标
    if (e.clientX === 0 && e.clientY === 0) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    // 检查 X 轴：允许左右超出 80px 缓冲区
    if (clientX < rect.left - 80 || clientX > rect.right + 80) {
      stopScroll();
      return;
    }

    const distTop = clientY - rect.top;
    const distBottom = rect.bottom - clientY;

    // 向上滚动判断：小于 threshold，且处于 -overflowMargin 以上
    if (distTop < threshold && distTop > -overflowMargin) {
      const intensity = distTop <= 0 ? 1 : Math.min(1, Math.max(0, (threshold - distTop) / threshold));
      scrollSpeed = -Math.max(minSpeed, intensity * maxSpeed);

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(scrollLoop);
      }
    } else if (distBottom < threshold && distBottom > -overflowMargin) {
      // 向下滚动判断：小于 threshold，且处于 -overflowMargin 以下
      const intensity = distBottom <= 0 ? 1 : Math.min(1, Math.max(0, (threshold - distBottom) / threshold));
      scrollSpeed = Math.max(minSpeed, intensity * maxSpeed);

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
