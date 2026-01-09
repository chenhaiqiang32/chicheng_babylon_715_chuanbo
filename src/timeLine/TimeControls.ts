import { Clock } from '@/utils/Time';
import { UNIT } from './Const';
import { Keyframe } from './Keyframe';

export class TimeControls {
  public normalLine: HTMLElement;

  private time = 0;
  private scale = 1;
  private isPlaying = false;
  private loop = false;
  private offsetLeft = 0;
  private viewPadding = 0;
  private clock = new Clock();
  private timeChangedCallback: (time: number) => void;
  private playingChangedCallback: ((playing: boolean) => void) | null = null;
  public animationMaxTime = 0;
  private playSpeed = 1;

  private isDragging = false;
  private lastClientX = 0;
  private dragRaf = 0;
  private dragPointerId: number | null = null;

  setLoop(v: boolean) {
    this.loop = !!v;
  }

  setPlayingChanged(callback: (playing: boolean) => void) {
    this.playingChangedCallback = callback;
  }

  get playing() {
    return this.isPlaying;
  }

  get speed() {
    return this.playSpeed;
  }
  set speed(value: number) {
    this.playSpeed = value;
  }

  get currentTime() {
    return this.time;
  }
  set currentTime(value: number) {
    if (this.timeChangedCallback && value != this.time) {
      this.timeChangedCallback(value);
    }
    this.time = value;
    this.normalLine.style.left = this.viewPadding + this.time * UNIT * this.scale - 1 + 'px';
  }

  setTimeChanged(callback: (time: number) => void) {
    this.timeChangedCallback = callback;
  }

  constructor(private dom: HTMLElement) {
    this.normalLine = document.createElement('div');
    this.normalLine.style.position = 'absolute';
    this.normalLine.style.left = this.viewPadding + this.time * UNIT * this.scale + 'px';
    this.normalLine.style.top = '0px';
    this.normalLine.style.width = '2px';
    this.normalLine.style.height = '100%';
    this.normalLine.style.backgroundColor = '#ff0000';
    this.normalLine.style.cursor = 'ew-resize';
    this.normalLine.style.borderRadius = '999px';
    (this.normalLine.style as any).touchAction = 'none';
    dom.appendChild(this.normalLine);
    this.normalLine.addEventListener('pointerdown', this.onPointerDown as any);
    this.resize();
  }

  private onPointerDown = (e: PointerEvent) => {
    // 仅左键/主指针
    if (typeof (e as any).button === 'number' && (e as any).button !== 0) return;
    e.preventDefault();

    this.isDragging = true;
    this.dragPointerId = e.pointerId;
    this.lastClientX = e.clientX;
    document.body.style.cursor = 'ew-resize';

    try {
      (this.normalLine as any).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    this.normalLine.addEventListener('pointermove', this.onPointerMove as any);
    this.normalLine.addEventListener('pointerup', this.onPointerUp as any, { once: true } as any);
    this.normalLine.addEventListener(
      'pointercancel',
      this.onPointerCancel as any,
      { once: true } as any,
    );

    this.updateTimeFromClientX(this.lastClientX);

    if (!this.dragRaf) {
      this.dragRaf = requestAnimationFrame(this.dragTick);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    if (this.dragPointerId != null && e.pointerId !== this.dragPointerId) return;
    this.lastClientX = e.clientX;
    this.updateTimeFromClientX(this.lastClientX);
  };

  private finishDrag() {
    this.isDragging = false;
    this.dragPointerId = null;
    this.normalLine.removeEventListener('pointermove', this.onPointerMove as any);
    document.body.style.cursor = 'default';
    if (this.dragRaf) {
      cancelAnimationFrame(this.dragRaf);
      this.dragRaf = 0;
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    try {
      (this.normalLine as any).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    this.finishDrag();
  };

  private onPointerCancel = (e: PointerEvent) => {
    try {
      (this.normalLine as any).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    this.finishDrag();
  };

  private getMaxScrollLeftForKeys(edgeMargin: number) {
    // 以最后关键帧为上限：避免一直滚到空白区域
    const maxTime = Math.max(0, this.animationMaxTime || 0);
    const maxKeyX = this.viewPadding + maxTime * UNIT * this.scale;
    const maxByKeys = Math.max(0, maxKeyX - (this.dom.clientWidth - edgeMargin));
    const maxByDom = Math.max(0, this.dom.scrollWidth - this.dom.clientWidth);
    return Math.min(maxByDom, maxByKeys);
  }

  private updateTimeFromClientX(clientX: number) {
    let left = clientX - this.offsetLeft + this.dom.scrollLeft - this.viewPadding;
    if (left < 0) left = 0;
    this.currentTime = left / UNIT / this.scale;
  }

  private dragTick = () => {
    if (!this.isDragging) {
      this.dragRaf = 0;
      return;
    }

    const rect = this.dom.getBoundingClientRect();
    const edgeMargin = 20;
    const minEdge = rect.left + edgeMargin;
    const maxEdge = rect.right - edgeMargin;

    const maxScrollLeft = this.getMaxScrollLeftForKeys(edgeMargin);

    // 右侧自动滚动
    if (this.lastClientX > maxEdge && this.dom.scrollLeft < maxScrollLeft) {
      const over = this.lastClientX - maxEdge;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.min(maxScrollLeft, this.dom.scrollLeft + step);
      this.updateTimeFromClientX(this.lastClientX);
    }

    // 左侧自动滚动
    if (this.lastClientX < minEdge && this.dom.scrollLeft > 0) {
      const over = minEdge - this.lastClientX;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.max(0, this.dom.scrollLeft - step);
      this.updateTimeFromClientX(this.lastClientX);
    }

    this.dragRaf = requestAnimationFrame(this.dragTick);
  };
  setScale(value: number) {
    this.scale = value;
    this.normalLine.style.left = this.viewPadding + this.time * UNIT * this.scale + 'px';
  }

  setViewPadding(paddingPx: number) {
    this.viewPadding = Number.isFinite(paddingPx) ? Math.max(0, paddingPx) : 0;
    this.normalLine.style.left = this.viewPadding + this.time * UNIT * this.scale + 'px';
  }
  resize() {
    const rect = this.dom.getBoundingClientRect();
    this.offsetLeft = rect.left;
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.playingChangedCallback?.(false);
  }
  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.playingChangedCallback?.(false);
  }
  play() {
    const max = this.animationMaxTime;
    if (max > 0 && this.currentTime >= max) {
      // 从末尾再次点击播放：从头开始
      this.currentTime = 0;
    }
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.clock.start();
    this.playingChangedCallback?.(true);
  }

  update() {
    const delta = this.clock.getDelta();
    if (this.isPlaying) {
      const max = this.animationMaxTime;
      const dt = delta * this.playSpeed;

      // 没有有效时长时，仅推进时间（不做循环/停止判定）
      if (!(max > 0)) {
        this.currentTime += dt;
        return;
      }

      const next = this.currentTime + dt;
      if (this.loop) {
        // 循环：wrap
        const wrapped = next % max;
        this.currentTime = wrapped;
      } else {
        // 非循环：播到末尾就停在末尾
        if (next >= max) {
          this.currentTime = max;
          this.pause();
        } else {
          this.currentTime = next;
        }
      }
    }
  }

  dispose() {
    this.finishDrag();
    this.normalLine.removeEventListener('pointerdown', this.onPointerDown as any);
    this.normalLine.remove();
  }
}
