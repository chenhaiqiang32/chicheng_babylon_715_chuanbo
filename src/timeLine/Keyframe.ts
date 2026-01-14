import { Graphics } from 'pixi.js';
import { UNIT, KEYFRAME_COLOR, KEYFRAME_SELECT_COLOR, LINE_HEIGHT } from './Const';

export class Keyframe<T extends KeyframeData> {
  private graphics: Graphics;
  private value: T;

  private originX = 0;

  private blurActiveEditor() {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) active.blur();
  }

  private eventHandler: {
    removeSelectKeyframe: (keyframe: Keyframe<T>) => void;
    addSelectKeyframe: (keyframe: Keyframe<T>, append?: boolean, range?: boolean) => void;
    startMove: (e: PointerEvent) => void;
    onContextMenu?: (
      keyframe: Keyframe<T>,
      stagePos?: { x: number; y: number; stageX?: number; stageY?: number },
    ) => void;
  };

  setEventHanler(handler: typeof this.eventHandler) {
    this.eventHandler = handler;
  }

  constructor() {
    this.graphics = new Graphics();
    this.graphics.pivot.set(5, 5);
    this.graphics.rect(0, 0, 8, 8).fill({
      color: KEYFRAME_COLOR,
    });
    this.graphics.cursor = 'pointer';
    this.graphics.rotation = Math.PI / 4;
    this.graphics.eventMode = 'dynamic';

    const openContextMenu = (originalEvent: MouseEvent | PointerEvent | undefined) => {
      this.blurActiveEditor();
      const stagePos = this.graphics.getGlobalPosition();
      const clientX = originalEvent?.clientX ?? 0;
      const clientY = originalEvent?.clientY ?? 0;
      this.eventHandler?.onContextMenu?.(this, {
        x: clientX,
        y: clientY,
        stageX: stagePos.x,
        stageY: stagePos.y,
      });
    };

    this.graphics.on('pointerdown', (e: any) => {
      const originalEvent = (e as any)?.data?.originalEvent as
        | PointerEvent
        | MouseEvent
        | undefined;
      const button = (originalEvent?.button ?? e?.button ?? -1) as number;
      if (button !== 0) return;

      e.stopPropagation();
      e.preventDefault();
      this.blurActiveEditor();

      const append = !!(originalEvent?.ctrlKey || originalEvent?.metaKey);
      const range = !!originalEvent?.shiftKey;
      // 如果按住 Ctrl/Cmd 则进行累积选择（存在则取消选择），如果按住 Shift 则进行范围选择，否则清除旧选择只选中当前
      this.eventHandler.addSelectKeyframe(this, append, range);

      // 仅在拿到真实 DOM 事件时启动拖拽（KeyframeContent.startMove 依赖 clientX）
      if (originalEvent && typeof (originalEvent as any).clientX === 'number') {
        this.eventHandler?.startMove(originalEvent as PointerEvent);
      }
    });

    this.graphics.on('rightclick', (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      const originalEvent = e?.data?.originalEvent as MouseEvent | PointerEvent | undefined;
      openContextMenu(originalEvent);
    });
  }

  move(diffPx: number, scale: number) {
    const nextX = this.graphics.x + diffPx;
    this.graphics.x = Math.max(this.originX, nextX);
    const s = scale || 1;
    this.data.time = (this.graphics.x - this.originX) / (UNIT * s);
  }

  getGraphics() {
    return this.graphics;
  }
  get data() {
    return this.value;
  }
  set data(data: T) {
    this.value = data;
    this.graphics.x = this.originX + data.time * UNIT;
  }

  setOriginX(originX: number) {
    this.originX = Number.isFinite(originX) ? Math.max(0, originX) : 0;
    // 立即对齐当前位置（不改变 time）
    if (this.value) {
      this.graphics.x = this.originX + (this.value.time ?? 0) * UNIT * (this.graphics.scale.x || 1);
    }
  }

  private lineIndex = 0;
  set index(index: number) {
    this.lineIndex = index;
    this.graphics.y = (index + 0.5) * LINE_HEIGHT;
  }
  get index() {
    return this.lineIndex;
  }

  setScale(scale: number) {
    const s = scale || 1;
    this.graphics.x = this.originX + this.data.time * UNIT * s;
    // 不通过 scale.x 做任何抵消/变形，保持子元素不受影响
    this.graphics.scale.x = 1;
  }

  select(v: boolean) {
    this.graphics.clear();
    this.graphics.rect(0, 0, 8, 8).fill({
      color: v ? KEYFRAME_SELECT_COLOR : KEYFRAME_COLOR,
    });
  }
}
