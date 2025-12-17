import { Graphics } from 'pixi.js';
import { UNIT, KEYFRAME_COLOR, KEYFRAME_SELECT_COLOR, LINE_HEIGHT } from './Const';

export class Keyframe<T extends KeyframeData> {
  private graphics: Graphics;
  private value: T;
  private scale = 1;

  private eventHandler: {
    removeSelectKeyframe: (keyframe: Keyframe<T>) => void;
    addSelectKeyframe: (keyframe: Keyframe<T>) => void;
    startMove: (e: PointerEvent) => void;
  };

  setEventHanler(handler: typeof this.eventHandler) {
    this.eventHandler = handler;
  }

  constructor() {
    this.graphics = new Graphics();
    this.graphics.pivot.set(5, 5);
    this.graphics.rect(0, 0, 10, 10).fill({
      color: KEYFRAME_COLOR,
    });
    this.graphics.cursor = 'pointer';
    this.graphics.rotation = Math.PI / 4;
    this.graphics.eventMode = 'dynamic';
    this.graphics.on('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.shiftKey) {
        this.eventHandler.removeSelectKeyframe(this);
      } else {
        this.eventHandler.addSelectKeyframe(this);
      }
      this.eventHandler?.startMove(e as any);
    });
  }

  move(diff: number) {
    this.graphics.x += diff;
    this.data.time = this.graphics.x / this.scale / UNIT;
  }

  getGraphics() {
    return this.graphics;
  }
  get data() {
    return this.value;
  }
  set data(data: T) {
    this.value = data;
    this.graphics.x = data.time * UNIT * this.scale;
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
    this.scale = scale;
    this.graphics.x = this.data.time * UNIT * scale;
  }

  select(v: boolean) {
    this.graphics.clear();
    this.graphics.rect(0, 0, 10, 10).fill({
      color: v ? KEYFRAME_SELECT_COLOR : KEYFRAME_COLOR,
    });
  }
}
