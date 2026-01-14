import { Container, Graphics } from 'pixi.js';
import { GRID_LINE_COLOR, HEADER_HEIGHT, LINE_HEIGHT, UNIT } from './Const';
import { Keyframe } from './Keyframe';
import { registerKeyDown, unregisterkeyUp } from '@/utils/ShortcutKey';

export type KeyframesSnapshot<T extends KeyframeData> = {
  keyframes: T[][];
  selection: { line: number; time: number }[];
};

export type KeyframesChangePayload<T extends KeyframeData> = {
  before: KeyframesSnapshot<T>;
  after: KeyframesSnapshot<T>;
  reason?: 'move' | 'delete' | 'paste' | 'unknown';
};

export class KeyframeContent<T extends KeyframeData> {
  getMaxTime(): number {
    return 100;
  }

  container: Container;
  private keyframes: T[][] = [];
  private line: Graphics;
  private scale = 1;

  // 0 秒对应的像素起点偏移（用于避免 0 帧被裁切）
  private originX = 0;
  private usedKeyframes: Keyframe<T>[] = [];
  private freeKeyframes: Keyframe<T>[] = [];

  // 视口裁剪（用于缩放/滚动时只更新可视区，避免全量更新导致卡顿）
  private viewScrollLeft = 0;
  private viewWidth = 0;
  private viewScrollTop = 0;
  private viewHeight = 0;
  private viewMarginX = 200;
  private viewMarginY = 2; // 行方向额外多显示的行数
  private rowVisibleRanges: { start: number; end: number }[] = [];
  private lastVisibleLineStart = 0;
  private lastVisibleLineEnd = -1;

  private lastDrawLineRowCount = 0;
  private lastDrawLineScale = NaN;

  // 拖拽关键帧期间会频繁修改 time，导致行内 keyframe 顺序暂时失效；此时暂停视口裁剪避免闪烁
  private isDraggingKeyframes = false;

  // 拖拽多选时，按“首帧到尾帧跨度(px)”动态扩大左右裁剪范围，避免拖拽过程中被过早裁剪导致闪烁/消失
  private getDraggingSelectionSpanPx() {
    if (!this.isDraggingKeyframes) return 0;
    const sel = this.selectKeyframes;
    if (!sel || sel.length < 2) return 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const kf of sel) {
      const x = kf.getGraphics().x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const span = maxX - minX;
    return Number.isFinite(span) && span > 0 ? span : 0;
  }

  private updateVisibleLinear(
    scrollLeft: number,
    viewWidth: number,
    scrollTop: number,
    viewHeight: number,
  ) {
    const hasView = viewWidth > 0 && viewHeight > 0;
    const s = this.scale || 1;
    const dragSpan = this.getDraggingSelectionSpanPx();
    const marginX = Math.max(this.viewMarginX, dragSpan);
    const xStart = Math.max(0, scrollLeft - marginX);
    const xEnd = scrollLeft + viewWidth + marginX;

    // 垂直可见行范围
    const totalLines = this.currnetRows.length;
    let lineStart = 0;
    let lineEnd = totalLines - 1;
    if (hasView) {
      const startIdx = Math.floor(scrollTop / LINE_HEIGHT) - this.viewMarginY;
      const endIdx = Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + this.viewMarginY;
      lineStart = Math.max(0, startIdx);
      lineEnd = Math.min(totalLines - 1, endIdx);
    }

    // 非可视行全隐藏
    if (this.lastVisibleLineEnd >= this.lastVisibleLineStart) {
      for (let i = this.lastVisibleLineStart; i <= this.lastVisibleLineEnd; i++) {
        if (i < lineStart || i > lineEnd) {
          const row = this.currnetRows[i];
          if (row) {
            for (const kf of row.keyframes) {
              kf.getGraphics().renderable = false;
            }
          }
          this.rowVisibleRanges[i] = { start: 0, end: -1 };
        }
      }
    }

    // 线性扫描：不依赖 time 排序，拖拽中也不会“裁剪错”
    for (let i = lineStart; i <= lineEnd; i++) {
      const row = this.currnetRows[i];
      if (!row) continue;
      const kfs = row.keyframes;
      if (!kfs || kfs.length === 0) {
        this.rowVisibleRanges[i] = { start: 0, end: -1 };
        continue;
      }
      this.rowVisibleRanges[i] = { start: 0, end: kfs.length - 1 };
      for (const kf of kfs) {
        // 拖拽/滚动过程中也需要更新 x（否则新进入视口的不会出现）
        kf.setScale(s);
        const g = kf.getGraphics();
        const x = g.x;
        g.renderable = x >= xStart && x <= xEnd;
      }
    }

    this.lastVisibleLineStart = lineStart;
    this.lastVisibleLineEnd = lineEnd;
  }

  // 由外部（Timeline）注入：根据鼠标 clientX 触发边缘自动滚动，返回本次 scrollLeft 变化量（px）
  private autoScrollByClientX: ((clientX: number) => number) | null = null;

  // 由外部（Timeline）注入：把舞台坐标 x（像素，包含 scrollLeft 的“世界坐标”）转换为 DOM 的 clientX
  // 用于“按选中集合最左/最右 keyframe”触发边缘滚动。
  private stageXToClientX: ((stageX: number) => number) | null = null;

  setAutoScrollByClientX(fn: ((clientX: number) => number) | null) {
    this.autoScrollByClientX = fn;
  }

  setStageXToClientX(fn: ((stageX: number) => number) | null) {
    this.stageXToClientX = fn;
  }

  private getSelectedBoundsStageX() {
    const sel = this.selectKeyframes;
    if (!sel || sel.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const kf of sel) {
      const x = kf.getGraphics().x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
    return { minX, maxX };
  }

  onMoveEnd?: (payload?: KeyframesChangePayload<T>) => void;

  //当选中集合发生变化时的回调
  onSelectionChanged?: (selected: Keyframe<T>[]) => void;

  //外部可通过该方法获取当前选中的 Keyframe 列表
  getSelectedKeyframes(): Keyframe<T>[] {
    return this.selectKeyframes.slice();
  }

  private selectKeyframes: Keyframe<T>[] = [];
  //存储第一次被选中的 keyframe，用于Shift范围选择
  private anchorKeyframe: Keyframe<T> | null = null;

  currnetRows: {
    keyframes: Keyframe<T>[];
    line: Graphics;
  }[] = [];

  private clipboard: { line: number; time: number; value: any }[] = [];
  private clipboardMinTime = 0;

  constructor(private count: number) {
    this.container = new Container();
    this.container.y = LINE_HEIGHT + 10;
    this.line = new Graphics();
    this.drawLine();

    registerKeyDown(this.onKeyDownRef);
  }

  onKeyDownRef = (e: KeyboardEvent) => {
    const key = e.key;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
    )
      return;

    //Ctrl/Cmd + A 全选
    if ((e.ctrlKey || e.metaKey) && (key === 'a' || key === 'A')) {
      e.preventDefault();
      this.selectAll();
      return;
    }

    // Delete 删除
    if (key === 'Delete') {
      if (this.selectKeyframes.length === 0) return;
      e.preventDefault();
      this.deleteKeyframe();
    }
  };

  setOriginX(originX: number) {
    this.originX = Number.isFinite(originX) ? Math.max(0, originX) : 0;
    // 更新当前已创建 keyframe 的位置（不改变 time）
    for (const kf of this.usedKeyframes) {
      kf.setOriginX(this.originX);
      kf.setScale(this.scale);
    }
    // 更新行段线
    for (let i = 0; i < this.currnetRows.length; i++) {
      this.updateRow(i);
    }
    this.updateVisible();
  }

  private cloneValue<V>(value: V): V {
    try {
      const sc = (globalThis as any).structuredClone;
      if (typeof sc === 'function') {
        return sc(value);
      }
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(value));
  }

  hasClipboard(): boolean {
    return this.clipboard.length > 0;
  }

  copySelectedKeyframes() {
    if (this.selectKeyframes.length === 0) return;
    const items = this.selectKeyframes.map((kf) => ({
      line: kf.index,
      time: kf.data.time,
      value: this.cloneValue((kf.data as any).value),
    }));
    const times = items.map((x) => x.time);
    this.clipboardMinTime = times.length > 0 ? Math.min(...times) : 0;
    this.clipboard = items;
  }

  pasteClipboardAt(targetTime: number) {
    if (!this.hasClipboard()) return;

    const before: KeyframesSnapshot<T> = {
      keyframes: this.cloneKeyframes(this.keyframes),
      selection: this.getSelectionInfos(),
    };

    const offset = targetTime - this.clipboardMinTime;
    const pastedSelection: { line: number; time: number }[] = [];
    const touchedLines = new Set<number>();

    for (const item of this.clipboard) {
      const lineIndex = item.line;
      if (!this.keyframes[lineIndex]) this.keyframes[lineIndex] = [] as any;
      const arr = this.keyframes[lineIndex];
      const newTime = Math.max(0, item.time + offset);
      const existingIndex = arr.findIndex((d) => d.time === newTime);
      const newValue = this.cloneValue(item.value);
      if (existingIndex !== -1) {
        (arr[existingIndex] as any).value = newValue;
      } else {
        (arr as any).push({ time: newTime, value: newValue });
      }
      touchedLines.add(lineIndex);
      pastedSelection.push({ line: lineIndex, time: newTime });
    }

    touchedLines.forEach((lineIndex) => {
      const arr = this.keyframes[lineIndex];
      if (arr && arr.length > 1) {
        arr.sort((a, b) => a.time - b.time);
      }
    });

    this.setKeyframes(this.keyframes);
    this.selectByData(pastedSelection);

    const after: KeyframesSnapshot<T> = {
      keyframes: this.cloneKeyframes(this.keyframes),
      selection: pastedSelection,
    };
    this.onMoveEnd?.({ before, after, reason: 'paste' });
  }

  private cloneKeyframes(keyframes: T[][]): T[][] {
    try {
      const sc = (globalThis as any).structuredClone;
      if (typeof sc === 'function') {
        return sc(keyframes);
      }
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(keyframes));
  }

  private getSelectionInfos(): { line: number; time: number }[] {
    return this.selectKeyframes.map((kf) => ({ line: kf.index, time: kf.data.time }));
  }

  //处理来自关键帧的上下文菜单请求
  private contextMenuElement: HTMLElement | null = null;

  private closeContextMenu() {
    if (this.contextMenuElement) {
      this.contextMenuElement.remove();
      this.contextMenuElement = null;
    }
  }

  onBlankContextMenu(targetTime: number, pos: { x: number; y: number }) {
    this.closeContextMenu();

    const menu = document.createElement('div');
    const offsetX = 8;
    const offsetY = 8;
    let left = (pos.x ?? 0) + offsetX;
    let top = (pos.y ?? 0) + offsetY;
    const menuMaxWidth = 220;
    const menuMaxHeight = 120;
    const maxW = window.innerWidth - 10;
    const maxH = window.innerHeight - 10;
    if (left + menuMaxWidth > maxW) left = Math.max(10, (pos.x ?? 0) - menuMaxWidth - offsetX);
    if (top + menuMaxHeight > maxH) top = Math.max(10, (pos.y ?? 0) - menuMaxHeight - offsetY);

    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.zIndex = '100000';
    menu.style.padding = '6px';
    menu.style.background = 'var(--bg-color-1, #222)';
    menu.style.border = '1px solid var(--bg-color-2, #444)';
    menu.style.borderRadius = '4px';
    menu.style.color = 'var(--text-color, #fff)';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';

    const createItem = (text: string, cb: () => void, enabled = true) => {
      const item = document.createElement('div');
      item.style.padding = '6px 12px';
      item.style.cursor = enabled ? 'pointer' : 'not-allowed';
      item.style.opacity = enabled ? '1' : '0.5';
      item.textContent = text;
      if (enabled) {
        item.onmouseenter = () => (item.style.background = 'var(--bg-color-2, #333)');
        item.onmouseleave = () => (item.style.background = 'transparent');
        item.onclick = (e) => {
          e.stopPropagation();
          try {
            cb();
          } catch (err) {
            console.error(err);
          }
          this.closeContextMenu();
        };
      }
      return item;
    };

    const canPaste = this.hasClipboard();
    const btnPaste = createItem('粘贴关键帧', () => this.pasteClipboardAt(targetTime), canPaste);
    menu.appendChild(btnPaste);

    document.body.appendChild(menu);
    this.contextMenuElement = menu;

    setTimeout(() => {
      const onDown = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          this.closeContextMenu();
        }
      };
      document.addEventListener('pointerdown', onDown, { once: true });
    }, 0);
  }

  drawLine() {
    const rowCount = Math.max(this.keyframes.length, 50);
    const s = this.scale || 1;
    const needRedraw = this.lastDrawLineRowCount !== rowCount || this.lastDrawLineScale !== s;

    // 行数或缩放变化时重绘（不使用 scale.x 拉伸，避免 originX/端点错位）
    if (needRedraw) {
      this.lastDrawLineRowCount = rowCount;
      this.lastDrawLineScale = s;
      this.line.clear();
      this.container.removeChild(this.line);
      const currentUnit = UNIT * s;
      const width = this.count * currentUnit;
      for (let index = 1; index <= rowCount; index++) {
        const y = index * LINE_HEIGHT;
        this.line.moveTo(0, y);
        this.line.lineTo(width, y).stroke({
          width: 1,
          color: GRID_LINE_COLOR,
        });
      }
      this.container.addChild(this.line);
    }
  }

  setKeyframes(keyframes: T[][]) {
    // 注意：这里不能 clone 行数组。
    // 上层（Animation.vue）会用 currentRuntimeAction.clips[i].key 作为数据源重新 setKeyframes；
    // 若这里 clone，会导致编辑只改到内部副本，随后又被上层“旧数据”覆盖，表现为删除/复制/粘贴无效。
    this.keyframes = keyframes as any;
    // 保证每行按 time 排序（后续视口裁剪使用二分查找）。排序直接作用在原数组上。
    for (let i = 0; i < this.keyframes.length; i++) {
      if (!this.keyframes[i]) this.keyframes[i] = [] as any;
      const row = this.keyframes[i];
      if (row && row.length > 1) {
        row.sort((a, b) => a.time - b.time);
      }
    }
    this.freeAllKeyframe();
    this.drawLine();
    this.currnetRows.forEach((x) => {
      x.line.removeFromParent();
      x.line.destroy();
    });
    this.currnetRows.length = 0;
    this.rowVisibleRanges.length = 0;
    for (let i = 0; i < keyframes.length; i++) {
      const element = this.keyframes[i];
      const result = this.drawRow(element, i);
      this.currnetRows.push(result);
      this.rowVisibleRanges[i] = { start: 0, end: -1 };
    }

    // 初次构建后，按当前视口裁剪一次（若尚未设置视口，则默认全可见）
    this.updateVisible();
  }
  setTop(scrollTop: number) {
    this.container.y = -scrollTop + LINE_HEIGHT;
  }

  // 由 Timeline 传入视口信息（scroll/resize/scale 时调用）
  setView(scrollLeft: number, viewWidth: number, scrollTop: number, viewHeight: number) {
    this.viewScrollLeft = scrollLeft;
    this.viewWidth = viewWidth;
    this.viewScrollTop = scrollTop;
    this.viewHeight = viewHeight;
    this.updateVisible();
  }

  setScale(scale: number) {
    this.scale = scale;
    this.drawLine();
    // 行连接线需要按 UNIT*scale 重算端点，不能用 scale.x 拉伸
    for (let i = 0; i < this.currnetRows.length; i++) {
      this.updateRow(i);
    }
    // 缩放只更新可视区内 keyframe 的 x（避免全量遍历）
    this.updateVisible();
  }

  private lowerBound(arr: Keyframe<T>[], time: number) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((arr[mid].data?.time ?? 0) < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private upperBound(arr: Keyframe<T>[], time: number) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((arr[mid].data?.time ?? 0) <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private hideLineRange(lineIndex: number, start: number, end: number) {
    const row = this.currnetRows[lineIndex];
    if (!row) return;
    const kfs = row.keyframes;
    const s = Math.max(0, start);
    const e = Math.min(kfs.length - 1, end);
    for (let i = s; i <= e; i++) {
      kfs[i].getGraphics().renderable = false;
    }
  }

  private updateLineVisible(lineIndex: number, timeStart: number, timeEnd: number) {
    const row = this.currnetRows[lineIndex];
    if (!row) return;
    const kfs = row.keyframes;
    if (kfs.length === 0) {
      this.rowVisibleRanges[lineIndex] = { start: 0, end: -1 };
      return;
    }

    const prev = this.rowVisibleRanges[lineIndex] ?? { start: 0, end: -1 };
    const start = this.lowerBound(kfs, timeStart);
    const endExclusive = this.upperBound(kfs, timeEnd);
    const end = endExclusive - 1;

    // 隐藏之前可见但现在不可见的部分
    if (prev.end >= prev.start) {
      // 左侧收缩
      if (start > prev.start)
        this.hideLineRange(lineIndex, prev.start, Math.min(prev.end, start - 1));
      // 右侧收缩
      if (end < prev.end) this.hideLineRange(lineIndex, Math.max(prev.start, end + 1), prev.end);
    }

    // 显示新的可见范围并更新 x
    if (end >= start) {
      const s = this.scale || 1;
      for (let i = start; i <= end; i++) {
        const g = kfs[i].getGraphics();
        g.renderable = true;
        // setScale 内部会根据 time*UNIT*scale 更新 x
        kfs[i].setScale(s);
      }
    }

    this.rowVisibleRanges[lineIndex] = end >= start ? { start, end } : { start: 0, end: -1 };
  }

  private updateVisible() {
    // 如果外部没有提供视口信息，则默认全可见（但仍不做额外遍历）
    const hasView = this.viewWidth > 0 && this.viewHeight > 0;
    const scrollLeft = this.viewScrollLeft;
    const viewWidth = this.viewWidth || this.count * UNIT * (this.scale || 1);
    const scrollTop = this.viewScrollTop;
    const viewHeight = this.viewHeight || 999999;

    // 拖拽中：行内排序可能暂时失效，二分会算错范围；此时改用线性扫描保证视觉正确
    if (this.isDraggingKeyframes) {
      this.updateVisibleLinear(scrollLeft, viewWidth, scrollTop, viewHeight);
      return;
    }

    const s = this.scale || 1;
    const xStart = Math.max(0, scrollLeft - this.viewMarginX);
    const xEnd = scrollLeft + viewWidth + this.viewMarginX;
    const timeStart = xStart / (UNIT * s);
    const timeEnd = xEnd / (UNIT * s);

    // 垂直可见行范围
    const totalLines = this.currnetRows.length;
    let lineStart = 0;
    let lineEnd = totalLines - 1;
    if (hasView) {
      const startIdx = Math.floor(scrollTop / LINE_HEIGHT) - this.viewMarginY;
      const endIdx = Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + this.viewMarginY;
      lineStart = Math.max(0, startIdx);
      lineEnd = Math.min(totalLines - 1, endIdx);
    }

    // 隐藏离开可视区的整行（避免留下渲染）
    if (this.lastVisibleLineEnd >= this.lastVisibleLineStart) {
      for (let i = this.lastVisibleLineStart; i <= this.lastVisibleLineEnd; i++) {
        if (i < lineStart || i > lineEnd) {
          const prev = this.rowVisibleRanges[i];
          if (prev && prev.end >= prev.start) this.hideLineRange(i, prev.start, prev.end);
          this.rowVisibleRanges[i] = { start: 0, end: -1 };
        }
      }
    }

    for (let i = lineStart; i <= lineEnd; i++) {
      this.updateLineVisible(i, timeStart, timeEnd);
    }

    this.lastVisibleLineStart = lineStart;
    this.lastVisibleLineEnd = lineEnd;
  }

  selectKeyframeByRect(x: number, y: number, w: number, h: number) {
    // 这里的 x/y/w/h 是舞台坐标（像素），不走 getGlobalPosition（点多时会非常慢）
    const maxX = x + w;
    const maxY = y + h;
    const baseY = this.container.y;
    // 只遍历当前可视行 & 可见 keyframe（renderable=true）
    const selectArray: Keyframe<T>[] = [];
    const startLine = this.lastVisibleLineStart;
    const endLine = this.lastVisibleLineEnd;
    for (let li = startLine; li <= endLine; li++) {
      const row = this.currnetRows[li];
      if (!row) continue;
      const range = this.rowVisibleRanges[li];
      if (!range || range.end < range.start) continue;
      for (let i = range.start; i <= range.end; i++) {
        const keyframe = row.keyframes[i];
        const g = keyframe.getGraphics();
        if (!g.renderable) continue;
        const px = g.x;
        const py = baseY + g.y;
        if (px >= x && px <= maxX && py >= y && py <= maxY) {
          selectArray.push(keyframe);
        }
      }
    }
    this.selectKeyframeArray(selectArray);
  }

  removeSelectKeyframe = (keyframe: Keyframe<T>) => {
    const index = this.selectKeyframes.indexOf(keyframe);
    if (index != -1) {
      this.selectKeyframes.splice(index, 1);
      keyframe.select(false);
      this.onSelectionChanged?.(this.selectKeyframes.slice());
    }
  };
  addSelectKeyframe = (keyframe?: Keyframe<T>, append = false, range = false) => {
    // range = true 表示 Shift 点击，使用 anchor-first 逻辑：以第一次被选中的点作为 anchor，选中 anchor 与当前点击点之间的所有 keyframe（按时间），并清除其它选择
    if (range && keyframe) {
      if (!this.anchorKeyframe) {
        // 如果没有 anchor，则把现有选择的第一个作为 anchor；若没有任何选择，则以当前点击项作为 anchor
        if (this.selectKeyframes.length > 0) {
          this.anchorKeyframe = this.selectKeyframes[0];
        } else {
          // 没有选择项，直接选中当前并设为 anchor
          this.selectKeyframes.forEach((x) => x.select(false));
          this.selectKeyframes.length = 0;
          this.selectKeyframes.push(keyframe);
          keyframe.select(true);
          this.anchorKeyframe = keyframe;
          this.onSelectionChanged?.(this.selectKeyframes.slice());
          return;
        }
      }

      const startTime = Math.min(this.anchorKeyframe.data.time, keyframe.data.time);
      const endTime = Math.max(this.anchorKeyframe.data.time, keyframe.data.time);
      // 限制行范围：只选中 anchor 行到当前点击行之间的行（包含端点），避免跨所有行
      const startLine = Math.min(this.anchorKeyframe.index, keyframe.index);
      const endLine = Math.max(this.anchorKeyframe.index, keyframe.index);
      const sel = this.usedKeyframes
        .filter((kf) => kf.index >= startLine && kf.index <= endLine)
        .filter((kf) => kf.data.time >= startTime && kf.data.time <= endTime)
        .sort((a, b) => a.data.time - b.data.time || a.index - b.index);
      this.selectKeyframeArray(sel);
      return;
    }

    // 非范围选择逻辑
    if (!append) {
      if (!keyframe) {
        // 未点击到任何 keyframe，则清空选择
        this.selectKeyframes.forEach((x) => x.select(false));
        this.selectKeyframes.length = 0;
        this.anchorKeyframe = null;
        return;
      }

      // 若点击的 keyframe 已在当前选中集合中，则保留现有选择（用于直接拖拽多选项）
      if (this.selectKeyframes.indexOf(keyframe) !== -1) {
        if (!this.anchorKeyframe && this.selectKeyframes.length > 0) {
          this.anchorKeyframe = this.selectKeyframes[0];
        }
        return;
      }

      // 否则清空旧选择并只选中当前点击项
      this.selectKeyframes.forEach((x) => x.select(false));
      this.selectKeyframes.length = 0;
      this.selectKeyframes.push(keyframe);
      keyframe.select(true);
      this.anchorKeyframe = keyframe;
      this.onSelectionChanged?.(this.selectKeyframes.slice());
      return;
    }

    // append = true 表示 Ctrl/Cmd 点击，执行累积选择（若已选中则取消）
    if (!keyframe) return;
    const index = this.selectKeyframes.indexOf(keyframe);
    if (index === -1) {
      this.selectKeyframes.push(keyframe);
      keyframe.select(true);
      // 如果之前没有 anchor，则把第一个加入的作为 anchor
      if (!this.anchorKeyframe) this.anchorKeyframe = keyframe;
      this.onSelectionChanged?.(this.selectKeyframes.slice());
    } else {
      this.selectKeyframes.splice(index, 1);
      keyframe.select(false);
      // 如果被取消的是 anchor，则把 anchor 移动到剩余选择的第一个或清空
      if (this.anchorKeyframe === keyframe) {
        this.anchorKeyframe = this.selectKeyframes.length > 0 ? this.selectKeyframes[0] : null;
      }
      this.onSelectionChanged?.(this.selectKeyframes.slice());
    }
  };

  startMove = (e: PointerEvent) => {
    let originX = e.clientX;
    let oldX = e.clientX;
    let lastClientX = e.clientX;
    document.body.style.cursor = 'pointer';
    let dragRaf = 0;
    let moved = false;
    const movedLines = new Set<number>();

    // 拖拽方向：1 右拖，-1 左拖；用于决定用最右/最左 keyframe 触发边缘滚动
    let dragDir: 1 | -1 | 0 = 0;

    this.isDraggingKeyframes = true;

    const before: KeyframesSnapshot<T> = {
      keyframes: this.cloneKeyframes(this.keyframes),
      selection: this.getSelectionInfos(),
    };

    const tickAutoScroll = () => {
      // 若未提供自动滚动回调，则无需 rAF
      if (!this.autoScrollByClientX) {
        dragRaf = 0;
        return;
      }

      // 只有在明确方向后才进行“按最左/最右 keyframe”触发的自动滚动
      if (dragDir === 0) {
        dragRaf = requestAnimationFrame(tickAutoScroll);
        return;
      }

      const bounds = this.getSelectedBoundsStageX();
      const edgeStageX = bounds ? (dragDir > 0 ? bounds.maxX : bounds.minX) : NaN;
      const edgeClientX =
        this.stageXToClientX && Number.isFinite(edgeStageX)
          ? this.stageXToClientX(edgeStageX)
          : lastClientX;

      // 持续边缘滚动（即便鼠标不动也滚），并把滚动增量应用到关键帧位移
      const scrollDelta = this.autoScrollByClientX(edgeClientX) || 0;
      if (scrollDelta !== 0) {
        moved = true;
        this.selectKeyframes.forEach((x) => x.move(scrollDelta, this.scale));
        for (const kf of this.selectKeyframes) movedLines.add(kf.index);
        movedLines.forEach((x) => this.updateRow(x));
      }

      dragRaf = requestAnimationFrame(tickAutoScroll);
    };

    const move = (ev: PointerEvent) => {
      // 只在按住左键(primary)拖拽时移动关键帧。
      // 避免中键平移/其他 pointermove 导致选中关键帧“跟着跑”（通常是上次拖拽监听未及时清理）。
      if ((ev.buttons & 1) === 0) return;

      lastClientX = ev.clientX;

      const diff = ev.clientX - oldX;
      oldX = ev.clientX;

      // 更新拖拽方向（允许 diff=0 时保持上一方向）
      if (diff > 0) dragDir = 1;
      else if (diff < 0) dragDir = -1;

      // 边缘自动滚动：按“最右/最左 keyframe（预测位置）”决定是否触发滚动
      const bounds = this.getSelectedBoundsStageX();
      const edgeStageX = bounds ? (dragDir >= 0 ? bounds.maxX : bounds.minX) : NaN;
      const predictedEdgeStageX = Number.isFinite(edgeStageX) ? edgeStageX + diff : NaN;
      const edgeClientX =
        this.autoScrollByClientX && this.stageXToClientX && Number.isFinite(predictedEdgeStageX)
          ? this.stageXToClientX(predictedEdgeStageX)
          : ev.clientX;
      const scrollDelta = this.autoScrollByClientX ? this.autoScrollByClientX(edgeClientX) : 0;

      const localDiff = diff + scrollDelta;
      if (localDiff !== 0) moved = true;
      this.selectKeyframes.forEach((x) => {
        x.move(localDiff, this.scale);
      });
      for (const kf of this.selectKeyframes) movedLines.add(kf.index);
      movedLines.forEach((x) => this.updateRow(x));
    };

    const cleanup = () => {
      document.body.style.cursor = 'default';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);

      if (dragRaf) {
        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
      }

      this.isDraggingKeyframes = false;
    };

    const onUp = () => {
      try {
        if (moved) {
          // 松手时恢复行内 time 排序（updateVisible 的二分裁剪依赖排序）
          for (const li of movedLines) {
            const rowData = this.keyframes[li];
            if (rowData && rowData.length > 1) rowData.sort((a, b) => a.time - b.time);
            const row = this.currnetRows[li];
            if (row && row.keyframes && row.keyframes.length > 1) {
              row.keyframes.sort((a, b) => (a.data?.time ?? 0) - (b.data?.time ?? 0));
            }
            this.rowVisibleRanges[li] = { start: 0, end: -1 };
            this.updateRow(li);
          }

          const after: KeyframesSnapshot<T> = {
            keyframes: this.cloneKeyframes(this.keyframes),
            selection: this.getSelectionInfos(),
          };
          this.onMoveEnd?.({ before, after, reason: 'move' });
        }
      } finally {
        cleanup();

        // 拖拽结束后按最新视口刷新一次可视裁剪
        this.updateVisible();
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    window.addEventListener('blur', onUp, { once: true });

    // 启动持续边缘滚动（保持与标尺拖拽一致的手感）
    if (!dragRaf) {
      dragRaf = requestAnimationFrame(tickAutoScroll);
    }
  };

  onContextMenu(
    keyframe: Keyframe<T>,
    pos: { x: number; y: number; stageX?: number; stageY?: number },
  ) {
    // 如果已有选中项且点击的 keyframe 不在选中集合中，则只选中被点击的 keyframe；若点击的是已选中的，则保持原有选择
    const isSelected = this.selectKeyframes.indexOf(keyframe) !== -1;
    if (!isSelected) {
      // 以非累积方式只选中当前点击项
      this.addSelectKeyframe(keyframe, false);
    }
    this.closeContextMenu();
    let clientX = pos.x ?? 0;
    let clientY = pos.y ?? 0;

    if (clientX === 0 && clientY === 0 && pos.stageX !== undefined && pos.stageY !== undefined) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        clientX = rect.left + (pos.stageX as number);
        clientY = rect.top + (pos.stageY as number);
      }
    }

    const menu = document.createElement('div');
    //加个偏移
    const offsetX = 8;
    const offsetY = 8;
    let left = clientX + offsetX;
    let top = clientY + offsetY;
    const menuMaxWidth = 200;
    const menuMaxHeight = 120;
    const maxW = window.innerWidth - 10;
    const maxH = window.innerHeight - 10;
    if (left + menuMaxWidth > maxW) left = Math.max(10, clientX - menuMaxWidth - offsetX);
    if (top + menuMaxHeight > maxH) top = Math.max(10, clientY - menuMaxHeight - offsetY);

    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.zIndex = '100000';
    menu.style.padding = '6px';
    menu.style.background = 'var(--bg-color-1, #222)';
    menu.style.border = '1px solid var(--bg-color-2, #444)';
    menu.style.borderRadius = '4px';
    menu.style.color = 'var(--text-color, #fff)';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';

    const createItem = (text: string, cb: () => void) => {
      const item = document.createElement('div');
      item.style.padding = '6px 12px';
      item.style.cursor = 'pointer';
      item.textContent = text;
      item.onmouseenter = () => (item.style.background = 'var(--bg-color-2, #333)');
      item.onmouseleave = () => (item.style.background = 'transparent');
      item.onclick = (e) => {
        e.stopPropagation();
        try {
          cb();
        } catch (err) {
          console.error(err);
        }
        this.closeContextMenu();
      };
      return item;
    };

    const btnA = createItem('删除关键帧', () => {
      //删除当前选中的关键帧并同步（会触发重绘）
      console.log('Delete Keyframe from Context Menu');
      this.deleteKeyframe();
    });

    const btnCopy = createItem('复制关键帧', () => {
      this.copySelectedKeyframes();
    });

    menu.appendChild(btnA);
    menu.appendChild(btnCopy);

    document.body.appendChild(menu);
    this.contextMenuElement = menu;
    console.log('OnContextMenu3');
    setTimeout(() => {
      const onDown = (e: PointerEvent) => {
        if (!menu.contains(e.target as Node)) {
          this.closeContextMenu();
        }
      };
      document.addEventListener('pointerdown', onDown, { once: true });
    }, 0);
  }

  deleteKeyframe() {
    if (this.selectKeyframes.length === 0) return;

    const before: KeyframesSnapshot<T> = {
      keyframes: this.cloneKeyframes(this.keyframes),
      selection: this.getSelectionInfos(),
    };

    // 从数据中移除对应的 keyframe 项
    this.selectKeyframes.forEach((kf) => {
      const lineIndex = kf.index;
      const arr = this.keyframes[lineIndex];
      if (!arr) return;
      const idx = arr.findIndex((d) => d === kf.data || d.time === kf.data.time);
      if (idx !== -1) {
        arr.splice(idx, 1);
      }
    });
    // 重新构建渲染（会回收并重新分配 Keyframe 实例）
    this.setKeyframes(this.keyframes);
    // 清空选择并触发变更回调（供上层同步）
    this.clearSelectKeyframe();

    const after: KeyframesSnapshot<T> = {
      keyframes: this.cloneKeyframes(this.keyframes),
      selection: [],
    };
    this.onMoveEnd?.({ before, after, reason: 'delete' });
  }

  // 全选当前所有 keyframe
  selectAll() {
    if (this.usedKeyframes.length === 0) return;
    this.selectKeyframeArray(this.usedKeyframes.slice());
  }

  clearSelectKeyframe() {
    this.selectKeyframes.forEach((f) => {
      f.select(false);
    });
    this.selectKeyframes.length = 0;
    this.anchorKeyframe = null;
    this.onSelectionChanged?.(this.selectKeyframes.slice());
  }

  selectKeyframeArray(keyframes: Keyframe<T>[]) {
    // 取消之前的选中
    this.selectKeyframes.forEach((x) => {
      x.select(false);
    });
    this.selectKeyframes.length = 0;

    if (!keyframes || keyframes.length === 0) {
      this.anchorKeyframe = null;
      // 通知外部选中变化
      this.onSelectionChanged?.(this.selectKeyframes.slice());
      return;
    }

    // 先按时间（再按行）排序以保证确定性
    const sorted = keyframes.slice().sort((a, b) => a.data.time - b.data.time || a.index - b.index);

    let newSelection: Keyframe<T>[] = [];
    if (this.anchorKeyframe && sorted.indexOf(this.anchorKeyframe) !== -1) {
      // 如果有 anchor 并且它包含在新选择中，则把 anchor 放到第一个位置，后面跟随按时间排序的其他项
      newSelection.push(this.anchorKeyframe);
      for (const kf of sorted) {
        if (kf !== this.anchorKeyframe) newSelection.push(kf);
      }
    } else {
      // 否则按时间顺序使用 sorted，并在 absence of anchor 时把第一个设为 anchor
      newSelection = sorted;
      if (!this.anchorKeyframe && newSelection.length > 0) {
        this.anchorKeyframe = newSelection[0];
      }
    }

    newSelection.forEach((x) => x.select(true));
    this.selectKeyframes = newSelection;

    if (this.selectKeyframes.length === 0) {
      this.anchorKeyframe = null;
    }

    // 通知外部选中变化
    this.onSelectionChanged?.(this.selectKeyframes.slice());
  }

  // 根据行索引与时间值（time）恢复选中
  selectByData(items: { line: number; time: number }[]) {
    if (!items || items.length === 0) {
      this.clearSelectKeyframe();
      return;
    }
    const found: Keyframe<T>[] = [];
    for (const it of items) {
      const row = this.currnetRows[it.line];
      if (!row) continue;
      const kf = row.keyframes.find((x) => x.data && x.data.time === it.time);
      if (kf) found.push(kf);
    }
    if (found.length > 0) {
      this.selectKeyframeArray(found);
    } else {
      // 如果没有找到任何对应项，则清空选择
      this.clearSelectKeyframe();
    }
  }

  private updateRow(lineIndex: number) {
    const row = this.currnetRows[lineIndex];
    const array = this.keyframes[lineIndex];
    const currentUnit = UNIT * (this.scale || 1);
    const lineY = (lineIndex + 0.5) * LINE_HEIGHT;
    const times = array.map((x) => x.time);
    if (times.length === 0) {
      row.line.clear();
      return;
    }
    const min = Math.min(...times);
    const max = Math.max(...times);
    row.line.clear();
    row.line.moveTo(this.originX + min * currentUnit, lineY);
    row.line.lineTo(this.originX + max * currentUnit, lineY).stroke({
      width: 1,
      color: GRID_LINE_COLOR,
    });
  }

  private drawRow(keyframes: T[], index: number) {
    const currentUnit = UNIT * (this.scale || 1);
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
    const line = new Graphics();
    if (times.length > 0) {
      const min = Math.min(...times);
      const max = Math.max(...times);
      line.moveTo(this.originX + min * currentUnit, lineY);
      line.lineTo(this.originX + max * currentUnit, lineY).stroke({
        width: 1,
        color: GRID_LINE_COLOR,
      });
    }
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
    keyframe.setOriginX(this.originX);
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

  // 清理资源（移除键盘监听）
  destroy() {
    if (this.onKeyDownRef) {
      unregisterkeyUp(this.onKeyDownRef);
      this.onKeyDownRef = null;
    }
  }

  // private freeKeyframe(...keyframe: Keyframe<T>[]) {
  //     keyframe.forEach(item => {
  //         const graphics = item.getGraphics();
  //         graphics.removeFromParent()
  //         this.freeKeyframes.push(item)
  //     })
  // }
}
