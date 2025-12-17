import { Container, Graphics } from 'pixi.js';
import { GRID_LINE_COLOR, HEADER_HEIGHT, LINE_HEIGHT, UNIT } from './Const';
import { Keyframe } from './Keyframe';

export class KeyframeContent<T extends KeyframeData> {
  getMaxTime(): number {
    return 100;
  }

  container: Container;
  private keyframes: T[][] = [];
  private line: Graphics;
  private scale = 1;
  private usedKeyframes: Keyframe<T>[] = [];
  private freeKeyframes: Keyframe<T>[] = [];

  onMoveEnd: () => void;

  private selectKeyframes: Keyframe<T>[] = [];

  currnetRows: {
    keyframes: Keyframe<T>[];
    line: Graphics;
  }[] = [];

  constructor(private count: number) {
    this.container = new Container();
    this.container.y = HEADER_HEIGHT + LINE_HEIGHT;
    this.line = new Graphics();
    this.drawLine();
  }

  drawLine() {
    this.line.clear();
    this.container.removeChild(this.line);
    const currentUnit = UNIT * this.scale;
    const rowCount = Math.max(this.keyframes.length, 50);
    for (let index = 1; index <= rowCount; index++) {
      const y = index * LINE_HEIGHT;
      this.line.moveTo(0, y);
      this.line.lineTo(this.count * currentUnit, y).stroke({
        width: 1,
        color: GRID_LINE_COLOR,
      });
    }
    this.container.addChild(this.line);
  }

  setKeyframes(keyframes: T[][]) {
    this.keyframes = keyframes;
    this.freeAllKeyframe();
    this.drawLine();
    this.currnetRows.forEach((x) => {
      x.line.removeFromParent();
      x.line.destroy();
    });
    this.currnetRows.length = 0;
    for (let i = 0; i < keyframes.length; i++) {
      const element = keyframes[i];
      const result = this.drawRow(element, i);
      this.currnetRows.push(result);
    }
  }
  setTop(scrollTop: number) {
    this.container.y = -scrollTop + HEADER_HEIGHT + LINE_HEIGHT;
  }

  setScale(scale: number) {
    this.scale = scale;
    this.setKeyframes(this.keyframes);
  }

  selectKeyframeByRect(x: number, y: number, w: number, h: number) {
    const selectArray = this.usedKeyframes
      .map((keyframe) => {
        const pos = keyframe.getGraphics().getGlobalPosition();
        if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
          return keyframe;
        } else {
          return null;
        }
      })
      .filter((x) => x != null);
    this.selectKeyframeArray(selectArray);
  }

  removeSelectKeyframe = (keyframe: Keyframe<T>) => {
    const index = this.selectKeyframes.indexOf(keyframe);
    if (index != -1) {
      this.selectKeyframes.splice(index, 1);
      keyframe.select(false);
    }
  };
  addSelectKeyframe = (keyframe?: Keyframe<T>) => {
    if (keyframe && this.selectKeyframes.indexOf(keyframe) == -1) {
      this.selectKeyframes.push(keyframe);
      keyframe.select(true);
    }
  };

  clearSelectKeyframe() {
    this.selectKeyframes.forEach((f) => {
      f.select(false);
    });
    this.selectKeyframes.length = 0;
  }

  selectKeyframeArray(keyframes: Keyframe<T>[]) {
    this.selectKeyframes.forEach((x) => {
      x.select(false);
    });
    this.selectKeyframes.length = 0;
    keyframes.forEach((x) => {
      x.select(true);
    });
    this.selectKeyframes = keyframes;
  }
  startMove = (e: PointerEvent) => {
    let originX = e.clientX;
    let oldX = e.clientX;
    document.body.style.cursor = 'pointer';
    const resultArray = this.selectKeyframes.map((x) => {
      return {
        oldTime: x.data.time,
        newTime: 0,
        index: x.index,
      };
    });
    const move = (e: PointerEvent) => {
      const diff = e.clientX - oldX;
      oldX = e.clientX;
      this.selectKeyframes.forEach((x) => {
        x.move(diff);
      });
      new Set(this.selectKeyframes.map((x) => x.index)).forEach((x) => {
        this.updateRow(x);
      });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener(
      'pointerup',
      () => {
        if (originX != oldX) {
          resultArray.forEach((item, index) => {
            item.newTime = this.selectKeyframes[index].data.time;
          });
          this.onMoveEnd?.();
        } else {
          console.log('未发生拖拽');
        }
        document.body.style.cursor = 'default';
        window.removeEventListener('pointermove', move);
      },
      {
        once: true,
      },
    );
  };

  private updateRow(lineIndex: number) {
    const row = this.currnetRows[lineIndex];
    const array = this.keyframes[lineIndex];
    const currentUnit = UNIT * this.scale;
    const lineY = (lineIndex + 0.5) * LINE_HEIGHT;
    const times = array.map((x) => x.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    row.line.clear();
    row.line.moveTo(min * currentUnit, lineY);
    row.line.lineTo(max * currentUnit, lineY).stroke({
      width: 1,
      color: GRID_LINE_COLOR,
    });
  }

  private drawRow(keyframes: T[], index: number) {
    const currentUnit = UNIT * this.scale;
    const keyframeArray = new Array<Keyframe<T>>();
    for (let count = 0; count < keyframes.length; count++) {
      const data = keyframes[count];
      const keyframe = this.getKeyframe();
      keyframe.data = data;
      keyframe.index = index;
      keyframe.setScale(this.scale);
      const graphics = keyframe.getGraphics();
      this.container.addChild(graphics);
      keyframeArray.push(keyframe);
    }
    const lineY = (index + 0.5) * LINE_HEIGHT;
    const times = keyframes.map((x) => x.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const line = new Graphics();
    line.moveTo(min * currentUnit, lineY);
    line.lineTo(max * currentUnit, lineY).stroke({
      width: 1,
      color: GRID_LINE_COLOR,
    });
    line.zIndex = -1;
    this.container.addChild(line);

    return {
      keyframes: keyframeArray,
      line,
    };
  }
  private getKeyframe() {
    const keyframe = this.freeKeyframes.length > 0 ? this.freeKeyframes.pop() : new Keyframe<T>();
    keyframe.setEventHanler(this);
    this.usedKeyframes.push(keyframe);
    return keyframe;
  }

  private freeAllKeyframe() {
    this.usedKeyframes.forEach((item) => {
      const graphics = item.getGraphics();
      graphics.removeFromParent();
    });
    this.freeKeyframes.push(...this.usedKeyframes);
    this.usedKeyframes.length = 0;
  }
  // private freeKeyframe(...keyframe: Keyframe<T>[]) {
  //     keyframe.forEach(item => {
  //         const graphics = item.getGraphics();
  //         graphics.removeFromParent()
  //         this.freeKeyframes.push(item)
  //     })
  // }
}
