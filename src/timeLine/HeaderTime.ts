import { Container, Graphics, Text } from 'pixi.js';
import { UNIT, HEADER_HEIGHT, BACKGROUND_COLOR, TEXT_COLOR, LINE_HEIGHT } from './Const';
export class HeaderTime {
  public container: Container;
  private count = 0;

  private tickLine: Graphics;
  private bg: Graphics;
  private cameraTrack: Graphics;

  private texts: Text[] = [];

  private scale = 1;

  //0刻度在像素坐标中的起点偏移(用于避免0帧被裁切)
  private originX = 0;

  // 由外部（Timeline）提供：把 clientX 转换为时间（考虑滚动/缩放）
  private clientXToTime: ((clientX: number) => number) | null = null;

  onSetTime: (time: number) => void;

  constructor(count: number) {
    this.container = new Container();
    this.count = count;

    this.tickLine = new Graphics();
    this.bg = new Graphics();
    this.cameraTrack = new Graphics();

    //this.bg.eventMode = 'static';   // 接收事件，但不传递给子元素
    //this.bg.eventMode = 'passive';  // 不接收事件，但会计算鼠标交互
    //this.bg.eventMode = 'auto';     // 根据子元素自动决定
    //this.bg.eventMode = 'none';     // 完全不响应事件（默认
    //this.bg.eventMode = 'dynamic';  // 接收事件，并传递给子元素
    //背景接收事件,
    this.bg.eventMode = 'static';
    this.bg.cursor = 'pointer';

    this.container.addChild(this.tickLine);
    this.container.addChild(this.bg);
    this.container.addChild(this.cameraTrack);

    this.installEvents();
    this.rebuild(count);
  }

  setClientXToTimeConverter(converter: (clientX: number) => number) {
    this.clientXToTime = converter;
  }

  setOriginX(originX: number) {
    this.originX = Number.isFinite(originX) ? Math.max(0, originX) : 0;
    //立即刷新绘制
    this.setScale(this.scale);
  }

  private rebuild(count: number) {
    this.count = count;

    //清理旧文本
    this.texts.forEach((t) => t.destroy());
    this.texts.length = 0;

    // 文本（所有都创建，缩放时通过 visible 控制；位置在 setScale 里更新）
    for (let index = 0; index < count; index++) {
      const timeText = new Text({
        text: index.toString(),
        style: { fill: TEXT_COLOR, fontSize: 12 },
      });
      (timeText as any).anchor?.set?.(0.5, 0);
      timeText.y = 20;
      this.container.addChild(timeText);
      this.texts.push(timeText);
    }

    // 首次按当前 scale 构建
    this.setScale(this.scale);
  }

  private installEvents() {
    const isLeftMouseOnly = (e: any) => {
      const originalEvent = (e as any)?.data?.originalEvent as
        | PointerEvent
        | MouseEvent
        | undefined;

      // Pixi(Federated) 事件通常自带 button/buttons，优先用它
      const pixiButton = typeof e?.button === 'number' ? e.button : undefined;
      const pixiButtons = typeof e?.buttons === 'number' ? e.buttons : undefined;
      const nativeButton =
        typeof (originalEvent as any)?.button === 'number'
          ? (originalEvent as any).button
          : undefined;
      const nativeButtons =
        typeof (originalEvent as any)?.buttons === 'number'
          ? (originalEvent as any).buttons
          : undefined;

      // 若能拿到 buttons（按键位掩码），则要求按下的是左键
      const buttons = pixiButtons ?? nativeButtons;
      if (typeof buttons === 'number' && buttons !== 0) {
        return (buttons & 1) === 1;
      }

      const button = pixiButton ?? nativeButton;
      if (typeof button === 'number') return button === 0;

      // 没有按钮信息：默认放行（用于触摸等场景）
      return true;
    };

    const setTimeFromPixiEvent = (e: any) => {
      // container 可能被水平缩放；getLocalPosition 会自动还原到未缩放的本地坐标
      const x = e.getLocalPosition(this.container).x;
      const time = Math.max(0, (x - this.originX) / UNIT);
      this.onSetTime?.(time);
    };

    const setTimeFromClientX = (clientX: number) => {
      if (this.clientXToTime) {
        this.onSetTime?.(this.clientXToTime(clientX));
        return;
      }
      const time = clientX / UNIT;
      this.onSetTime?.(time);
    };

    const onWindowMove = (ev: PointerEvent) => {
      setTimeFromClientX(ev.clientX);
    };

    this.bg.addEventListener('pointerdown', (e: any) => {
      if (!isLeftMouseOnly(e)) return;

      e.stopPropagation?.();
      e.preventDefault?.();

      const originalEvent = (e as any)?.data?.originalEvent as
        | PointerEvent
        | MouseEvent
        | undefined;
      if (originalEvent && typeof (originalEvent as any).clientX === 'number') {
        setTimeFromClientX((originalEvent as any).clientX);
      } else {
        setTimeFromPixiEvent(e);
      }

      window.addEventListener('pointermove', onWindowMove);
      window.addEventListener(
        'pointerup',
        () => {
          window.removeEventListener('pointermove', onWindowMove);
        },
        { once: true },
      );
    });

    this.bg.addEventListener('click', (e: any) => {
      if (!isLeftMouseOnly(e)) return;

      e.stopPropagation?.();
      e.preventDefault?.();
      const originalEvent = (e as any)?.data?.originalEvent as
        | MouseEvent
        | PointerEvent
        | undefined;
      if (originalEvent && typeof (originalEvent as any).clientX === 'number') {
        setTimeFromClientX((originalEvent as any).clientX);
      } else {
        setTimeFromPixiEvent(e);
      }
    });
  }

  setHeader(count: number) {
    this.rebuild(count);
  }

  setScale(scale: number) {
    this.scale = scale || 1;
    const currentUnit = UNIT * this.scale;

    // 背景
    this.bg.clear();
    this.bg
      .rect(0, 0, this.originX * 2 + this.count * currentUnit, HEADER_HEIGHT - 7)
      .fill({ color: BACKGROUND_COLOR });
    this.bg.zIndex = -1;

    // 刻度线（直接用 currentUnit 重建，避免 transform 缩放带来的子元素影响/线宽变化）
    this.tickLine.clear();
    for (let index = 0; index < this.count; index++) {
      this.tickLine
        .moveTo(this.originX + index * currentUnit, 0)
        .lineTo(this.originX + index * currentUnit, index % 5 == 0 ? 20 : 10)
        .stroke({ width: 1, color: TEXT_COLOR });

      for (let i = 0; i <= 4; i++) {
        this.tickLine
          .moveTo(this.originX + (index + i / 5) * currentUnit, 0)
          .lineTo(this.originX + (index + i / 5) * currentUnit, 5)
          .stroke({ width: 1, color: TEXT_COLOR });
      }
    }

    // 文本位置/可见性
    const dense = this.scale <= 0.6;
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      t.x = this.originX + i * currentUnit;
      t.visible = dense ? i % 5 === 0 : true;
    }
  }

  addCameraKey(times: number[]) {
    this.cameraTrack.clear();

    const currentUnit = UNIT * this.scale;
    for (let index = 0; index < times.length; index++) {
      const time = times[index];
    }
  }
}
