let tooltipEl: HTMLDivElement | null = null;
let currentTarget: HTMLElement | null = null;
let showTimer: number | null = null;

function createTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'global-tooltip';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

export function initTooltip() {
  document.addEventListener('mouseover', e => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;
    if (!target) {
      if (currentTarget) {
        hideTooltip();
      }
      return;
    }

    const content = target.getAttribute('data-tooltip');
    if (!content) {
      if (currentTarget === target) hideTooltip();
      return;
    }

    const el = createTooltip();

    if (currentTarget === target) {
      // 如果是同一个元素，但在 hover 期间 content 发生了更新，则实时更新文本与定位
      if (el.textContent !== content) {
        el.textContent = content;
        updatePosition(target, el);
      }
      return;
    }

    // 移入新元素，清除旧的定时器与当前目标
    if (currentTarget) {
      hideTooltip();
    }

    currentTarget = target;
    el.textContent = content;

    // 延迟显示，防止鼠标快速划过引发闪烁
    showTimer = window.setTimeout(() => {
      if (currentTarget !== target) return;
      el.classList.add('show');
      updatePosition(target, el);
    }, 550);
  });

  document.addEventListener('mouseout', e => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;
    if (!target || target !== currentTarget) return;

    // 检查鼠标离开后是否进入了 tooltip 内部 (通常 global-tooltip 包含 pointer-events: none，但这里做双重保险)
    const toElement = e.relatedTarget as HTMLElement;
    if (toElement && toElement.closest('[data-tooltip]') === currentTarget) {
      return;
    }

    hideTooltip();
  });

  // 点击事件、窗口滚动、或者 mousedown 都应该隐藏 Tooltip
  document.addEventListener('click', hideTooltip);
  window.addEventListener('scroll', hideTooltip, { capture: true, passive: true });
}

function hideTooltip() {
  currentTarget = null;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (tooltipEl) {
    tooltipEl.classList.remove('show');
  }
}

function updatePosition(target: HTMLElement, el: HTMLElement) {
  const targetRect = target.getBoundingClientRect();

  // 必须先把 tooltip 放置在可见处（或通过它的默认布局），以获取渲染后的高宽
  // 此时 .show 可能已被添加，但 opacity/transform 变化不影响 offsetWidth/offsetHeight
  const elWidth = el.offsetWidth;
  const elHeight = el.offsetHeight;

  let left = targetRect.left + (targetRect.width - elWidth) / 2;
  let top = targetRect.top - elHeight - 8; // 默认显示在目标元素上方，间距 8px

  // 边界检查：如果上方空间不足，则将 tooltip 放到下方
  if (top < 8) {
    top = targetRect.bottom + 8;
  }

  // 边界检查：防止左右溢出屏幕
  const maxLeft = window.innerWidth - elWidth - 8;
  left = Math.max(8, Math.min(left, maxLeft));

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
