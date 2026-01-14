import { Application, FederatedPointerEvent, Graphics } from 'pixi.js';
import { HeaderTime } from './HeaderTime';
import { BACKGROUND_COLOR, UNIT, HEADER_HEIGHT } from './Const';
import { KeyframeContent, KeyframesChangePayload } from './KeyframeContent';
import { TimeControls } from './TimeControls';
import { debounce } from '@/utils/Function';

export interface TimelineConfig {
  maxTime: number;
  devicePixelRatio: number;
}

export class Timeline {
  private app: Application;
  private resizeObserver: ResizeObserver | null = null;
  private dom: HTMLElement;
  private header: HeaderTime;
  private keyframeContent: KeyframeContent<KeyframeData>;
  private sizeDom: HTMLElement;
  private column: number = 0;
  private currentScale = 1;

  private timeControls: TimeControls;

  private requestId: number;
  private background: Graphics;

  private selectBox: Graphics;

  private keyframes: KeyframeData[][] = [];

  private lastPointerTime: number | null = null;
  private lastPointerClientX: number | null = null;

  // 选中变化事件抑制开关：用于框选(pointermove高频)与程序化恢复选中，避免卡顿与多选错乱
  private suppressSelectionEvent = false;

  private maxTime = 100;

  private onWheelRef: ((e: WheelEvent) => void) | null = null;
  private onMiddlePanDownRef: ((e: PointerEvent) => void) | null = null;
  private _scaleChanged: ((scale: number) => void) | null = null;
  private loop = false;
  private _playingChanged: ((playing: boolean) => void) | null = null;

  // 仅当用户最近点击/操作过时间线区域时，才响应 Ctrl+C/V/Delete 等快捷键
  private hasTimelineFocus = false;
  private onNativeKeyDownRef: ((e: KeyboardEvent) => void) | null = null;
  private onDocPointerDownCaptureRef: ((e: PointerEvent) => void) | null = null;

  private wheelRafId = 0;
  private pendingWheelScale: number | null = null;
  private wheelAnchorTime = 0;
  private wheelAnchorMouseX = 0;

  // 仅视觉：0 刻度整体向右偏移（避免 0 帧被裁切），单位 px
  private originX = 8;

  // 标尺拖拽（scrubbing）时的自动平移
  private isScrubbing = false;
  private scrubPointerId: number | null = null;
  private scrubClientX = 0;
  private scrubRaf = 0;

  // 关键帧拖拽时的边缘自动滚动：返回本次 scrollLeft 的变化量（px）
  private autoScrollForDrag(clientX: number) {
    const rect = this.dom.getBoundingClientRect();
    const edgeMargin = 20;
    const minEdge = rect.left + edgeMargin;
    const maxEdge = rect.right - edgeMargin;
    const maxScrollLeft = this.getMaxScrollLeftForKeys(edgeMargin);

    const before = this.dom.scrollLeft;
    if (clientX > maxEdge && this.dom.scrollLeft < maxScrollLeft) {
      const over = clientX - maxEdge;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.min(maxScrollLeft, this.dom.scrollLeft + step);
    } else if (clientX < minEdge && this.dom.scrollLeft > 0) {
      const over = minEdge - clientX;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.max(0, this.dom.scrollLeft - step);
    }

    const after = this.dom.scrollLeft;
    if (after !== before) this.onScroll();
    return after - before;
  }
  constructor() {
    this.app = new Application();
  }

  private timeFromClientX(clientX: number) {
    const rect = this.dom.getBoundingClientRect();
    const worldX = clientX - rect.left + this.dom.scrollLeft;
    return Math.max(0, (worldX - this.originX) / (UNIT * this.currentScale));
  }

  private getMaxScrollLeftForKeys(edgeMargin: number) {
    const maxTime = Math.max(0, this.timeControls?.animationMaxTime ?? 0);
    const maxKeyX = this.originX + maxTime * UNIT * this.currentScale;
    const maxByKeys = Math.max(0, maxKeyX - (this.dom.clientWidth - edgeMargin));
    const maxByDom = Math.max(0, this.dom.scrollWidth - this.dom.clientWidth);
    return Math.min(maxByDom, maxByKeys);
  }

  private scrubTick = () => {
    if (!this.isScrubbing) {
      this.scrubRaf = 0;
      return;
    }

    const rect = this.dom.getBoundingClientRect();
    const edgeMargin = 20;
    const minEdge = rect.left + edgeMargin;
    const maxEdge = rect.right - edgeMargin;
    const maxScrollLeft = this.getMaxScrollLeftForKeys(edgeMargin);

    let scrolled = false;

    if (this.scrubClientX > maxEdge && this.dom.scrollLeft < maxScrollLeft) {
      const over = this.scrubClientX - maxEdge;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.min(maxScrollLeft, this.dom.scrollLeft + step);
      scrolled = true;
    }

    if (this.scrubClientX < minEdge && this.dom.scrollLeft > 0) {
      const over = minEdge - this.scrubClientX;
      const t = Math.max(0, Math.min(1, over / 240));
      const step = Math.min(64, 4 + 60 * t * t);
      this.dom.scrollLeft = Math.max(0, this.dom.scrollLeft - step);
      scrolled = true;
    }

    // 平移发生时同步舞台位置与可视裁剪
    if (scrolled) {
      this.onScroll();
    }

    // 无论是否滚动，都持续用当前 clientX 刷新时间（保持“按住拖拽即跟随”）
    this.time = this.timeFromClientX(this.scrubClientX);

    this.scrubRaf = requestAnimationFrame(this.scrubTick);
  };

  setScaleChanged(cb: (scale: number) => void) {
    this._scaleChanged = cb;
  }

  private applyScale(scale: number) {
    if (scale <= 0.5) scale = 0.5;
    if (scale >= 5) scale = 5;
    this.currentScale = scale;
    this.header?.setScale(scale);
    this.keyframeContent?.setScale(scale);
    this.timeControls?.setScale(scale);
    if (this.sizeDom) {
      this.sizeDom.style.width = this.originX * 2 + this.maxTime * UNIT * this.currentScale + 'px';
    }

    // 背景宽度与交互区域跟随缩放更新
    if (this.background) {
      this.background.clear();
      this.background
        .rect(
          0,
          0,
          this.originX * 2 + this.maxTime * UNIT * this.currentScale,
          this.dom.clientHeight,
        )
        .fill(BACKGROUND_COLOR);
    }

    // 缩放后按当前视口裁剪（避免全量更新）
    this.keyframeContent?.setView(
      this.dom.scrollLeft,
      this.dom.clientWidth,
      this.dom.scrollTop,
      this.dom.clientHeight,
    );
    this._scaleChanged?.(this.currentScale);
  }

  get time() {
    return this.timeControls?.currentTime ?? 0;
  }
  set time(value: number) {
    if (value < 0) {
      value = 0;
    }
    if (value > this.maxTime) {
      value = this.maxTime;
    }
    if (this.timeControls) {
      this.timeControls.currentTime = value;
    }
  }

  get speed() {
    return this.timeControls.speed;
  }
  set speed(value: number) {
    if (this.timeControls) {
      this.timeControls.speed = value;
    }
  }

  async init(config: Partial<TimelineConfig>, dom: HTMLElement) {
    this.dom = dom;
    if (this.dom.style.position !== 'absolute' && this.dom.style.position !== 'relative') {
      this.dom.style.position = 'relative';
    }
    // 让时间线容器可聚焦：用于把键盘焦点从输入框切回时间线
    if (!(this.dom as any).tabIndex || (this.dom as any).tabIndex < 0) {
      (this.dom as any).tabIndex = 0;
    }
    this.maxTime = config.maxTime ?? 100;
    await this.app.init({
      background: BACKGROUND_COLOR,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });
    if (dom) {
      dom.appendChild(this.app.canvas);
    }

    // 标尺区域拖拽：不要求一定点到红线/刻度线，按住在标尺区域拖动即可
    const onCanvasPointerDownCapture = (ev: PointerEvent) => {
      if (typeof (ev as any).button === 'number' && (ev as any).button !== 0) return;
      const c = this.app.canvas;
      const rect = c.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      // 仅在标尺区域（HEADER_HEIGHT）内启动 scrubbing，避免影响下方框选/拖拽 keyframe
      if (y < 0 || y > HEADER_HEIGHT) return;

      this.isScrubbing = true;
      this.scrubPointerId = ev.pointerId;
      this.scrubClientX = ev.clientX;
      // 立即设置一次时间
      this.time = this.timeFromClientX(this.scrubClientX);

      try {
        (c as any).setPointerCapture?.(ev.pointerId);
      } catch {
        // ignore
      }

      if (!this.scrubRaf) {
        this.scrubRaf = requestAnimationFrame(this.scrubTick);
      }
    };

    const onCanvasPointerMove = (ev: PointerEvent) => {
      if (!this.isScrubbing) return;
      if (this.scrubPointerId != null && ev.pointerId !== this.scrubPointerId) return;
      this.scrubClientX = ev.clientX;
      this.time = this.timeFromClientX(this.scrubClientX);
    };

    const endScrub = (ev: PointerEvent) => {
      if (!this.isScrubbing) return;
      if (this.scrubPointerId != null && ev.pointerId !== this.scrubPointerId) return;
      this.isScrubbing = false;
      this.scrubPointerId = null;
      if (this.scrubRaf) {
        cancelAnimationFrame(this.scrubRaf);
        this.scrubRaf = 0;
      }
      try {
        (this.app.canvas as any).releasePointerCapture?.(ev.pointerId);
      } catch {
        // ignore
      }
    };

    // capture：即使 Pixi stopPropagation 也能收到
    this.app.canvas.addEventListener('pointerdown', onCanvasPointerDownCapture, true);
    this.app.canvas.addEventListener('pointermove', onCanvasPointerMove);
    this.app.canvas.addEventListener('pointerup', endScrub);
    this.app.canvas.addEventListener('pointercancel', endScrub);

    this.background = new Graphics();
    this.app.stage.addChild(this.background);
    this.background.eventMode = 'static';

    const blurActiveEditor = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const tag = active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) {
        active.blur();
      }
      // 点击时间线后把焦点切回时间线容器，这样 keydown 的 target 不会再是输入框
      try {
        this.dom.focus({ preventScroll: true } as any);
      } catch {
        try {
          this.dom.focus();
        } catch {
          // ignore
        }
      }
    };

    // 捕获阶段监听点击：用于维护时间线“焦点”与强制 blur（哪怕 Pixi 内部 stopPropagation 也不影响捕获）
    this.onDocPointerDownCaptureRef = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      const inside = !!(target && this.dom && this.dom.contains(target));
      this.hasTimelineFocus = inside;
      if (inside) {
        blurActiveEditor();
      }
    };
    document.addEventListener('pointerdown', this.onDocPointerDownCaptureRef, true);

    // 原生键盘监听（捕获阶段）：只在时间线聚焦且不在输入中时处理
    this.onNativeKeyDownRef = (e: KeyboardEvent) => {
      if (!this.hasTimelineFocus) return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + A 全选
      if (ctrl && key === 'a') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.keyframeContent?.selectAll?.();
        return;
      }

      // Delete / Backspace 删除
      if (key === 'delete' || key === 'backspace') {
        const sel = this.keyframeContent?.getSelectedKeyframes?.() ?? [];
        if (sel.length === 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.keyframeContent?.deleteKeyframe?.();
        return;
      }

      if (!ctrl) return;

      // Ctrl/Cmd + C 复制关键帧
      if (key === 'c') {
        const sel = this.keyframeContent?.getSelectedKeyframes?.() ?? [];
        if (sel.length === 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.keyframeContent.copySelectedKeyframes();
        return;
      }

      // Ctrl/Cmd + V 粘贴关键帧：优先使用鼠标所在时间，否则用当前红线时间
      if (key === 'v') {
        if (!this.keyframeContent?.hasClipboard?.()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // Ctrl+V：按时间线红线（当前 time）粘贴，保持“粘贴到时间线位置”
        this.keyframeContent.pasteClipboardAt(this.time);
        return;
      }
    };
    window.addEventListener('keydown', this.onNativeKeyDownRef, true);

    // 记录鼠标当前所在时间位置，供 Ctrl+V 粘贴使用
    this.background.addEventListener('pointermove', (e: any) => {
      const pos = e.getLocalPosition(this.background);
      this.lastPointerTime = Math.max(0, (pos.x - this.originX) / (UNIT * this.currentScale));

      const cx =
        typeof e?.clientX === 'number'
          ? e.clientX
          : (e?.data?.originalEvent?.clientX as number | undefined);
      if (typeof cx === 'number' && Number.isFinite(cx)) this.lastPointerClientX = cx;
    });

    // 空白处右键：提供粘贴
    this.background.addEventListener('rightclick', (e: any) => {
      blurActiveEditor();
      const pos = e.getLocalPosition(this.background);
      // 统一粘贴规则：按时间线红线（当前 time）粘贴，而不是按鼠标位置
      const time = this.time;
      this.lastPointerTime = time;

      const cx =
        typeof e?.clientX === 'number'
          ? e.clientX
          : (e?.data?.originalEvent?.clientX as number | undefined);
      if (typeof cx === 'number' && Number.isFinite(cx)) this.lastPointerClientX = cx;

      this.keyframeContent?.onBlankContextMenu(time, { x: e.clientX ?? 0, y: e.clientY ?? 0 });
    });

    this.background.addEventListener('pointerdown', (e: any) => {
      blurActiveEditor();
      // 右键不触发框选
      if (typeof e.button === 'number' && (e.button === 2 || e.button === 1)) return;

      // 转换 DOM client 坐标到舞台坐标（x 需要加 scrollLeft；y 不加 scrollTop）
      const clientToStage = (clientX: number, clientY: number) => {
        const rect = this.dom.getBoundingClientRect();
        const x = clientX - rect.left + this.dom.scrollLeft;
        const y = clientY - rect.top;
        return { x, y };
      };

      // 框选时 pointermove 会高频触发 selectKeyframeByRect；这里先静默更新，pointerup 再一次性通知外部
      this.suppressSelectionEvent = true;
      this.keyframeContent.clearSelectKeyframe();
      let startPos = e.getLocalPosition(this.background);
      this.lastPointerTime = Math.max(0, (startPos.x - this.originX) / (UNIT * this.currentScale));

      const updateSelection = (endPos: { x: number; y: number }) => {
        this.lastPointerTime = Math.max(0, (endPos.x - this.originX) / (UNIT * this.currentScale));
        this.selectBox.clear();

        const rawMinX = Math.min(startPos.x, endPos.x);
        const rawMaxX = Math.max(startPos.x, endPos.x);
        const rawMinY = Math.min(startPos.y, endPos.y);
        const rawMaxY = Math.max(startPos.y, endPos.y);

        // clamp：超过左侧时固定在 0
        const x = Math.max(0, rawMinX);
        const maxX = Math.max(0, rawMaxX);
        const y = rawMinY;
        const w = Math.max(0, maxX - x);
        const h = Math.max(0, rawMaxY - rawMinY);

        this.selectBox.rect(x, y, w, h).fill({
          color: 0xff0000,
          alpha: 0.2,
        });
        this.keyframeContent.selectKeyframeByRect(x, y, w, h);
      };

      const move = (e: FederatedPointerEvent) => {
        const endPos = e.getLocalPosition(this.background);
        updateSelection(endPos);
      };

      const moveWindow = (ev: PointerEvent) => {
        const endPos = clientToStage(ev.clientX, ev.clientY);
        updateSelection(endPos);
      };

      this.background.addEventListener('pointermove', move);
      window.addEventListener('pointermove', moveWindow);
      window.addEventListener(
        'pointerup',
        () => {
          this.background.removeEventListener('pointermove', move);
          window.removeEventListener('pointermove', moveWindow);
          this.selectBox.clear();

          // 结束框选后恢复通知，并发出一次最终选中结果
          this.suppressSelectionEvent = false;
          const sel = this.keyframeContent?.getSelectedKeyframes() ?? [];
          this._selectionChanged?.(sel.map((kf) => ({ line: kf.index, data: kf.data })));
        },
        {
          once: true,
        },
      );
    });
    this.app.canvas.style.position = 'sticky';
    this.app.canvas.style.left = '0px';
    this.app.canvas.style.top = '0px';
    this.app.canvas.addEventListener('contextmenu', (event: any) => {
      event.preventDefault();
    });

    this.dom.addEventListener('scroll', this.onScroll);

    // 中键按住拖拽：水平平移视图（拖多少走多少，无插值）
    this.onMiddlePanDownRef = (ev: PointerEvent) => {
      if (ev.button !== 1) return;
      // 避免浏览器中键自动滚动/粘滞滚动
      ev.preventDefault();
      ev.stopPropagation();

      const startX = ev.clientX;
      const startScrollLeft = this.dom.scrollLeft;
      const oldCursor = document.body.style.cursor;
      document.body.style.cursor = 'grabbing';

      const move = (e: PointerEvent) => {
        // 鼠标左拖 => 视图右走 => scrollLeft 增加
        const dx = e.clientX - startX;
        this.dom.scrollLeft = Math.max(0, startScrollLeft - dx);
        this.onScroll();
      };

      const up = () => {
        document.body.style.cursor = oldCursor;
        window.removeEventListener('pointermove', move);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    };
    this.dom.addEventListener('pointerdown', this.onMiddlePanDownRef);

    // 滚轮缩放时间线（以鼠标位置为中心）
    // 使用 rAF 合帧，避免高频 wheel 导致频繁重绘/重排而卡顿。
    this.onWheelRef = (ev: WheelEvent) => {
      ev.preventDefault();

      const rect = this.dom.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const worldX = Math.max(0, mouseX + this.dom.scrollLeft);
      // 这里用当前视图 scale 计算时间锚点（因为 rAF 之前视图尚未改变）
      const timeAtCursor = Math.max(0, (worldX - this.originX) / (UNIT * this.currentScale));

      this.wheelAnchorTime = timeAtCursor;
      this.wheelAnchorMouseX = mouseX;

      const factor = Math.exp(-ev.deltaY * 0.001);
      const base = this.pendingWheelScale ?? this.currentScale;
      this.pendingWheelScale = base * factor;

      if (this.wheelRafId) return;
      this.wheelRafId = requestAnimationFrame(() => {
        const targetScale = this.pendingWheelScale ?? this.currentScale;
        this.pendingWheelScale = null;
        this.wheelRafId = 0;

        this.applyScale(targetScale);
        const newWorldX = this.originX + this.wheelAnchorTime * (UNIT * this.currentScale);
        this.dom.scrollLeft = Math.max(0, newWorldX - this.wheelAnchorMouseX);
        this.onScroll();
      });
    };
    this.dom.addEventListener('wheel', this.onWheelRef, { passive: false });
    this.keyframeContent = new KeyframeContent(this.maxTime);
    this.keyframeContent.setAutoScrollByClientX((clientX) => this.autoScrollForDrag(clientX));
    this.keyframeContent.setStageXToClientX((stageX) => {
      const rect = this.dom.getBoundingClientRect();
      // stageX 是“世界坐标”（像素），视口内对应位置需减去 scrollLeft
      return rect.left + (stageX - this.dom.scrollLeft);
    });
    this.app.stage.addChild(this.keyframeContent.container);
    this.keyframeContent.onMoveEnd = (payload?: KeyframesChangePayload<KeyframeData>) => {
      if (this.timeControls) {
        const times = this.keyframes.flatMap((x) => x.map((v) => v.time));
        const max = times.length > 0 ? Math.max(...times) : 0;
        // 真实末尾时间：允许播放到最后一秒，不再使用 +1 的临时补偿
        this.timeControls.animationMaxTime = max;
      }
      // 通知外部 move end 事件
      this._moveEndCallback?.(payload);
    };

    // 转发选中变化事件（外部可通过 setSelectionChanged 订阅）
    this.keyframeContent.onSelectionChanged = (sel) => {
      if (this.suppressSelectionEvent) return;
      this._selectionChanged?.(sel.map((kf) => ({ line: kf.index, data: kf.data })));
    };

    this.header = new HeaderTime(this.maxTime);
    this.header.setOriginX(this.originX);
    // 让标尺拖拽在离开标尺区域后仍能跟随：用 DOM 坐标换算时间（包含 scrollLeft 与缩放）
    this.header.setClientXToTimeConverter((clientX: number) => {
      const rect = this.dom.getBoundingClientRect();
      const x = clientX - rect.left + this.dom.scrollLeft;
      return Math.max(0, (x - this.originX) / (UNIT * this.currentScale));
    });
    this.header.onSetTime = (e) => (this.time = e);
    this.app.stage.addChild(this.header.container);

    this.sizeDom = document.createElement('div');
    this.sizeDom.style.width = this.originX * 2 + this.maxTime * UNIT * this.currentScale + 'px';
    this.dom.appendChild(this.sizeDom);

    this.timeControls = new TimeControls(this.dom);
    this.timeControls.setViewPadding(this.originX);
    this.timeControls.setLoop(this.loop);
    if (this._playingChanged) {
      this.timeControls.setPlayingChanged(this._playingChanged);
    }
    this.selectBox = new Graphics();
    this.app.stage.addChild(this.selectBox);
    this.keyframeContent.setOriginX(this.originX);

    // ResizeObserver 可能会在 init 尚未完成（尤其是 timeControls 还未创建）时立刻触发。
    // 因此延后到关键成员初始化完成后再开始 observe。
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(dom);

    this.update();
  }

  setLoop(v: boolean) {
    this.loop = !!v;
    this.timeControls?.setLoop(this.loop);
  }

  setPlayingChanged(cb: (playing: boolean) => void) {
    this._playingChanged = cb;
    this.timeControls?.setPlayingChanged(cb);
  }

  setTimeChanged(callback: (time: number) => void) {
    this.timeControls.setTimeChanged(callback);
  }

  onScroll = () => {
    this.app.stage.x = -this.dom.scrollLeft;
    let scrollTop = this.dom.scrollTop;
    const max = Math.max(this.column * UNIT + 40 - this.dom.clientHeight, 0);
    this.keyframeContent.setTop(Math.min(scrollTop, max));
    this.keyframeContent.setView(
      this.dom.scrollLeft,
      this.dom.clientWidth,
      this.dom.scrollTop,
      this.dom.clientHeight,
    );
  };

  setTop(scrollTop: number) {
    this.keyframeContent.setTop(scrollTop);
  }

  dispose() {
    cancelAnimationFrame(this.requestId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.timeControls?.dispose();
    this.sizeDom.remove();
    this.app.canvas.remove();
    this.dom.removeEventListener('scroll', this.onScroll);
    if (this.onWheelRef) {
      this.dom.removeEventListener('wheel', this.onWheelRef as any);
      this.onWheelRef = null;
    }
    if (this.onMiddlePanDownRef) {
      this.dom.removeEventListener('pointerdown', this.onMiddlePanDownRef as any);
      this.onMiddlePanDownRef = null;
    }

    if (this.onNativeKeyDownRef) {
      window.removeEventListener('keydown', this.onNativeKeyDownRef, true);
      this.onNativeKeyDownRef = null;
    }
    if (this.onDocPointerDownCaptureRef) {
      document.removeEventListener('pointerdown', this.onDocPointerDownCaptureRef, true);
      this.onDocPointerDownCaptureRef = null;
    }
  }

  resize = () => {
    this.app.renderer.resize(this.dom.clientWidth, this.dom.clientHeight);
    this.timeControls?.resize();
    this.background.clear();
    this.background
      .rect(0, 0, this.originX * 2 + this.maxTime * UNIT * this.currentScale, this.dom.clientHeight)
      .fill(BACKGROUND_COLOR);
    this.keyframeContent?.setView(
      this.dom.scrollLeft,
      this.dom.clientWidth,
      this.dom.scrollTop,
      this.dom.clientHeight,
    );
  };

  setKeyframes(keyframes: KeyframeData[][]) {
    this.keyframes = keyframes;
    this.column = keyframes.length;
    if (this.keyframeContent) {
      this.keyframeContent.setKeyframes(keyframes);
    }
    if (this.timeControls) {
      const times = keyframes.flatMap((x) => x.map((v) => v.time));
      const max = times.length > 0 ? Math.max(...times) : 0;
      // 真实末尾时间：允许播放到最后一秒，不再使用 +1 的临时补偿
      this.timeControls.animationMaxTime = max;
    }
  }

  get scale() {
    return this.currentScale;
  }
  set scale(scale: number) {
    this.onScaleChange(scale);
  }

  onScaleChange = debounce((scale: number) => {
    this.applyScale(scale);
  }, 100);

  update = () => {
    this.timeControls?.update();
    this.requestId = requestAnimationFrame(this.update);
  };

  private _selectionChanged: ((items: { line: number; data: KeyframeData }[]) => void) | null =
    null;
  private _moveEndCallback: ((payload?: KeyframesChangePayload<KeyframeData>) => void) | null =
    null;

  setSelectionChanged(cb: (items: { line: number; data: KeyframeData }[]) => void) {
    this._selectionChanged = cb;
  }

  // 注册 move end 回调
  setMoveEnd(cb: (payload?: KeyframesChangePayload<KeyframeData>) => void) {
    this._moveEndCallback = cb;
  }

  // 获取当前选中 keyframe 的信息（line 是 clip 行索引，data 是 keyframe 数据）
  getSelectedKeyframeInfos(): { line: number; data: KeyframeData }[] {
    const sel = this.keyframeContent?.getSelectedKeyframes() ?? [];
    return sel.map((kf) => ({ line: kf.index, data: kf.data }));
  }

  // 通过行与时间恢复选中项（用于在重建视图后恢复用户选中）
  setSelectedKeyframes(items: { line: number; data: KeyframeData }[]) {
    if (!items || items.length === 0) {
      // 清空选择：同样抑制内部回调，只对外发一次最终结果
      this.suppressSelectionEvent = true;
      try {
        this.keyframeContent?.clearSelectKeyframe?.();
      } finally {
        this.suppressSelectionEvent = false;
      }
      this._selectionChanged?.([]);
      return;
    }
    const map = items.map((it) => ({ line: it.line, time: it.data.time }));

    // selectByData 内部会触发 onSelectionChanged；此处抑制一次，避免外部回调双触发导致多选状态错乱
    this.suppressSelectionEvent = true;
    try {
      this.keyframeContent?.selectByData(map);
    } finally {
      this.suppressSelectionEvent = false;
    }

    // 恢复完成后仅触发一次外部选中回调
    const sel = this.keyframeContent?.getSelectedKeyframes() ?? [];
    this._selectionChanged?.(sel.map((kf) => ({ line: kf.index, data: kf.data })));
  }

  play() {
    this.timeControls?.play();
  }
  stop() {
    this.timeControls?.stop();
  }
  pause() {
    this.timeControls?.pause();
  }
  seek(time: number) {
    this.time = time;
  }
  next() {
    this.time += 1;
  }
  prev() {
    this.time -= 1;
    if (this.time < 0) {
      this.time = 0;
    }
  }
  toEnd() {
    this.time = this.timeControls.animationMaxTime;
    this.seek(this.time);
  }
  toStart() {
    this.time = 0;
  }

  // moveBlocks = (e: MouseEvent, keyframe: KeyframeBlock) => {
  //     if (e.button != 0) {
  //         return;
  //     }

  //     let startClipArgs: ClipArg[] = [];
  //     let flag = this.scale * unitWidth;
  //     document.body.requestPointerLock();
  //     const allTime = new Set<number>();
  //     this.tracks.map((track, index) => {
  //         if (index == keyframe.line || Math.abs(index - keyframe.line) > 10) {
  //             return;
  //         }
  //         track.times.forEach(time => allTime.add(time));
  //     });
  //     const move = (e: MouseEvent) => {
  //         if (startClipArgs.length == 0) {
  //             this.selectedBlock.forEach(clip => {
  //                 startClipArgs.push({
  //                     clip,
  //                     start: clip.start,
  //                     line: clip.line,
  //                 });
  //             });
  //         }
  //         let dx = e.movementX / flag;
  //         let canX = true;
  //         const needUpdateLine = new Set<number>();
  //         if (this.adsorb) {
  //             if (allTime.size > 0) {
  //                 const targetPos = keyframe.start + dx;
  //                 const closestTime = [...allTime].reduce((prev, curr) => {
  //                     return Math.abs(curr - targetPos) < Math.abs(prev - targetPos) ? curr : prev;
  //                 });
  //                 if (Math.abs(closestTime - targetPos) < 0.1) {
  //                     dx = closestTime - keyframe.start;
  //                 }
  //             }
  //         }

  //         for (let index = 0; index < this.selectedBlock.length; index++) {
  //             const clip = this.selectedBlock[index];
  //             if (clip.start + dx < 0) {
  //                 canX = false;
  //             }
  //         }
  //         if (canX) {
  //             this.selectedBlock.forEach(clip => {
  //                 clip.start += dx;
  //                 needUpdateLine.add(clip.line);
  //             });
  //         }
  //         needUpdateLine.forEach(line => this.allLine.find(x => x.height == line)?.updateLine());
  //     };
  //     const up = (e: MouseEvent) => {
  //         const clipArg2: ClipArg[] = [];
  //         this.selectedBlock.forEach(clip => {
  //             clipArg2.push({
  //                 clip,
  //                 start: clip.start,
  //                 line: clip.line,
  //             });
  //         });
  //         document.exitPointerLock();
  //         this.redoCommand(clipArg2, startClipArgs);
  //         document.removeEventListener('mousemove', move);
  //         document.removeEventListener('mouseup', up);
  //         document.body.style.cursor = 'unset';
  //     };
  //     document.addEventListener('mousemove', move);
  //     document.addEventListener('mouseup', up);
  // };
}
