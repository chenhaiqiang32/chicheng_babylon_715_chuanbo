import { Scene, Node, AbstractMesh, Nullable, Vector3 } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Rectangle,
  StackPanel,
  TextBlock,
  Line,
  Control,
  TextWrapping,
} from '@babylonjs/gui';

/** 单个属性项：键值对，用于牌子显示 key: value */
export type InfoBoardAttribute = Record<string, unknown>;

/** 单个信息牌数据 */
export interface InfoBoardItem {
  /** 唯一标识，用于匹配目标节点（节点 uuid）及牌子复用 */
  id: string;
  /** 设备名称，可选，无则不显示标题行 */
  title?: string;
  /** 属性列表，每项为 { key: value }，显示为 "key: value" */
  attribute: InfoBoardAttribute[];
  /**
   * 与 attribute 等长（可选）；对应行为 true 时该行属性文字使用告警色（如传感器状态 1：异常）。
   */
  attributeAlarm?: boolean[];
  /** 点击信息牌时上报给父页面的数据（可选） */
  clickReport?: { type: string; data: string | number };
}

/** 信息牌样式配置 */
export interface InfoBoardStyleOptions {
  /** 牌子宽度（像素） */
  widthPx?: number;
  /** 牌子高度（像素） */
  heightPx?: number;
  /** 牌子最小宽度（像素），用于内容自适应时下限 */
  minWidthPx?: number;
  /** 牌子最大宽度（像素），用于内容自适应时上限 */
  maxWidthPx?: number;
  /** 牌子相对目标节点的像素偏移（向上为正） */
  linkOffsetYPx?: number;
  /** 同 overlapGroup 的 id：用于避免重叠（同组控件互相避让） */
  overlapGroup?: number;
  /** 背景色 hex 或 'rgba(r,g,b,a)' */
  backgroundColor?: string;
  /** 边框颜色 */
  borderColor?: string;
  /** 标题文字颜色 */
  titleColor?: string;
  /** 属性文字颜色 */
  attributeColor?: string;
  /** 字号（px） */
  titleFontSize?: number;
  attributeFontSize?: number;
  /** 内边距（像素）：不区分方向的简写（若设置则同时覆盖上下左右），建议使用 paddingXPx/paddingYPx */
  paddingPx?: number;
  /** 左右内边距（像素） */
  paddingXPx?: number;
  /** 上下内边距（像素） */
  paddingYPx?: number;
  /** 行间距（像素） */
  lineGapPx?: number;
  /**
   * 标题字间距（使用 Unicode 细空格模拟）。
   * 0 表示不处理；>0 表示在大多数字符间插入若干个细空格（对中文更明显）。
   */
  titleCharSpacing?: number;
  /**
   * 属性字间距（使用 Unicode 细空格模拟）。
   * 0 表示不处理；>0 表示在大多数字符间插入若干个细空格。
   */
  attributeCharSpacing?: number;
}

/** 传感器等业务告警时属性行文字颜色 */
const ATTRIBUTE_LINE_ALARM_COLOR = '#f87171';

const DEFAULT_STYLE: Required<InfoBoardStyleOptions> = {
  widthPx: 260,
  heightPx: 140,
  minWidthPx: 220,
  maxWidthPx: 420,
  linkOffsetYPx: -70,
  overlapGroup: 1,
  backgroundColor: 'rgba(13, 16, 22, 0.82)',
  borderColor: 'rgba(96, 165, 250, 0.95)',
  titleColor: '#ffffff',
  attributeColor: 'rgba(219, 234, 254, 0.95)',
  titleFontSize: 14,
  attributeFontSize: 12,
  paddingPx: 10,
  paddingXPx: 10,
  paddingYPx: 6,
  lineGapPx: 2,
  titleCharSpacing: 1.2,
  attributeCharSpacing: 1.04,
};

interface BoardEntity {
  id: string;
  rect: Rectangle;
  line: Line;
  titleText: TextBlock;
  sep: Rectangle;
  attrTexts: TextBlock[];
  targetMesh: Nullable<AbstractMesh>;
  /** id 维度的显隐（setVisibleIds 控制） */
  baseVisible: boolean;
  /** 相机距离维度的显隐（相机距离开关控制） */
  distanceVisible: boolean;
}

/**
 * 3D 信息牌：在场景中为指定节点创建带连接线的信息牌，显示 title 与 attribute 键值对。
 * 通过 update() 传入数据，按 id 增删改牌子。
 */
export class InfoBoardHelper {
  private scene: Scene;
  private style: Required<InfoBoardStyleOptions>;
  private boards: Map<string, BoardEntity> = new Map();
  private getNodeById: (id: string) => Node | null;
  private ui: AdvancedDynamicTexture;
  /** 是否启用相机距离控制显隐 */
  private cameraDistanceVisibilityEnabled = false;
  /** 相机最小/最大可见距离（含边界），单位与场景一致 */
  private cameraDistanceMin = 0;
  private cameraDistanceMax = Number.POSITIVE_INFINITY;
  private cameraDistanceObserver: Nullable<
    ReturnType<Scene['onBeforeRenderObservable']['add']>
  > = null;
  private onItemClick?: (item: InfoBoardItem) => void;
  private selectedId: string | null = null;
  private suppressNextDeselect = false;
  private deselectObserver: Nullable<
    ReturnType<Scene['onPointerObservable']['add']>
  > = null;

  constructor(
    scene: Scene,
    getNodeById: (id: string) => Node | null,
    styleOptions: InfoBoardStyleOptions = {},
    options?: { onItemClick?: (item: InfoBoardItem) => void },
  ) {
    this.scene = scene;
    this.getNodeById = getNodeById;
    this.style = { ...DEFAULT_STYLE, ...styleOptions };
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('infoBoardsUI', true, this.scene);
    this.onItemClick = options?.onItemClick;
    // 点击非信息牌区域时，清除选中效果（信息牌点击会设置 suppressNextDeselect）
    this.deselectObserver = this.scene.onPointerObservable.add((pi: any) => {
      // PointerInfoType.POINTERDOWN === 1
      if (pi?.type !== 1) return;
      if (this.suppressNextDeselect) {
        this.suppressNextDeselect = false;
        return;
      }
      this.setSelectedId(null);
    });
    // 不使用 idealWidth/idealHeight：避免 UI 随窗口尺寸缩放，保持像素尺寸一致
  }

  private applyTitleCharSpacing(text: string): string {
    const n = this.style.titleCharSpacing;
    if (!n || n <= 0) return text;
    const spacer = '\u200A'.repeat(n); // hair space
    // 给非空白字符之间插入细空格（英文单词内部也会插入，但视觉更清晰；需要可再细分规则）
    const chars = Array.from(text);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      out += c;
      const next = chars[i + 1];
      if (!next) continue;
      if (c.trim().length === 0) continue;
      if (next.trim().length === 0) continue;
      out += spacer;
    }
    return out;
  }

  private applyAttributeCharSpacing(text: string): string {
    const n = this.style.attributeCharSpacing;
    if (!n || n <= 0) return text;
    const spacer = '\u200A'.repeat(n); // hair space
    const chars = Array.from(text);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      out += c;
      const next = chars[i + 1];
      if (!next) continue;
      if (c.trim().length === 0) continue;
      if (next.trim().length === 0) continue;
      out += spacer;
    }
    return out;
  }

  /**
   * 根据数据更新信息牌：存在则更新内容与目标，不存在则创建，数据中不存在的 id 则移除。
   */
  update(data: InfoBoardItem[]): void {
    const ids = new Set(data.map((d) => d.id));

    // 移除数据中已不存在的牌子
    for (const [id, entity] of this.boards) {
      if (!ids.has(id)) {
        this.disposeBoard(entity);
        this.boards.delete(id);
      }
    }
    if (this.selectedId && !ids.has(this.selectedId)) {
      this.selectedId = null;
    }

    for (const item of data) {
      const existing = this.boards.get(item.id);
      const targetNode = this.getNodeById(item.id);
      const targetMesh = (targetNode as any) instanceof AbstractMesh ? (targetNode as AbstractMesh) : null;

      if (existing) {
        this.updateBoardContent(existing, item);
        existing.targetMesh = targetMesh;
        this.linkBoard(existing);
        continue;
      }

      if (!targetMesh) continue;
      const entity = this.createBoard(item, targetMesh);
      if (entity) this.boards.set(item.id, entity);
    }
  }

  /** 清空所有信息牌 */
  clear(): void {
    for (const entity of this.boards.values()) {
      this.disposeBoard(entity);
    }
    this.boards.clear();
  }

  /**
   * 按 id 控制牌子显示/隐藏：传入的 id 对应牌子显示，未传入的隐藏。
   * @param visibleIds 需要显示的牌子 id 数组；空数组表示全部隐藏。
   */
  setVisibleIds(visibleIds: string[]): void {
    const set = new Set(visibleIds);
    for (const [id, entity] of this.boards) {
      entity.baseVisible = set.has(id);
      this.applyFinalVisibility(entity);
    }
  }

  dispose(): void {
    this.clear();
    this.ui.dispose();
    if (this.deselectObserver) {
      this.scene.onPointerObservable.remove(this.deselectObserver);
      this.deselectObserver = null;
    }
  }
  private createBoard(item: InfoBoardItem, targetMesh: AbstractMesh): BoardEntity | null {
    const rect = new Rectangle(`infoBoardRect_${item.id}`);
    rect.widthInPixels = this.style.widthPx;
    rect.heightInPixels = this.style.heightPx;
    rect.thickness = 1;
    rect.cornerRadius = 10;
    rect.background = this.style.backgroundColor;
    rect.color = this.style.borderColor;
    // 允许点击信息牌（用于 switchDevice_3d）
    rect.isPointerBlocker = true;
    rect.zIndex = 10;
    rect.overlapGroup = this.style.overlapGroup;
    rect.alpha = 1;
    // subtle shadow (better depth on bright scenes)
    rect.shadowBlur = 10;
    rect.shadowOffsetX = 0;
    rect.shadowOffsetY = 4;
    rect.shadowColor = 'rgba(0, 0, 0, 0.45)';
    // 内容自适应：高度随内容撑开；宽度在 min/max 范围内可撑开
    rect.adaptWidthToChildren = true;
    rect.adaptHeightToChildren = true;
    // Rectangle 本身没有 min/maxWidthInPixels（不同版本 API 不一致），这里用硬限制：初始化时 clamp 一次
    rect.widthInPixels = Math.max(this.style.minWidthPx, Math.min(this.style.maxWidthPx, rect.widthInPixels));

    const stack = new StackPanel(`infoBoardStack_${item.id}`);
    // 让内容撑开（不要强制 100% 宽高，否则宽度无法随内容自适应）
    stack.adaptHeightToChildren = true;
    (stack as any).adaptWidthToChildren = true;
    (stack as any).spacing = this.style.lineGapPx;
    stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const paddingX = this.style.paddingXPx ?? this.style.paddingPx;
    const paddingY = this.style.paddingYPx ?? this.style.paddingPx;
    stack.paddingLeftInPixels = paddingX;
    stack.paddingRightInPixels = paddingX;
    stack.paddingTopInPixels = paddingY;
    stack.paddingBottomInPixels = paddingY;
    stack.isVertical = true;
    rect.addControl(stack);
    rect.onPointerClickObservable.add(() => {
      // 当前 pointerdown 来自信息牌：避免紧接着的 scene POINTERDOWN 触发“取消选中”
      this.suppressNextDeselect = true;
      this.onItemClick?.(item);
    });

    const titleText = new TextBlock(`infoBoardTitle_${item.id}`);
    titleText.text = '';
    titleText.color = this.style.titleColor;
    titleText.fontSize = this.style.titleFontSize;
    titleText.fontWeight = '700';
    titleText.fontFamily = 'Segoe UI, Microsoft YaHei, Arial, sans-serif';
    titleText.outlineColor = 'rgba(0, 0, 0, 0.55)';
    titleText.outlineWidth = 2;
    // 文本不换行：Clip + resizeToFit 让控件宽度随文本增长
    titleText.textWrapping = TextWrapping.Clip;
    titleText.resizeToFit = true;
    titleText.forceResizeWidth = true;
    titleText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    titleText.heightInPixels = this.style.titleFontSize + 4;
    titleText.paddingBottomInPixels = 2;
    stack.addControl(titleText);

    // separator
    const sep = new Rectangle(`infoBoardSep_${item.id}`);
    sep.heightInPixels = 1;
    sep.thickness = 0;
    // 更细、更不明显
    sep.background = 'rgba(255, 255, 255, 0.08)';
    sep.width = 1;
    sep.paddingTopInPixels = 0;
    sep.paddingBottomInPixels = 2;
    stack.addControl(sep);

    const attrTexts: TextBlock[] = [];
    const maxLines = 6;
    for (let i = 0; i < maxLines; i++) {
      const t = new TextBlock(`infoBoardAttr_${item.id}_${i}`);
      t.text = '';
      t.color = this.style.attributeColor;
      t.fontSize = this.style.attributeFontSize;
      t.fontFamily = 'Segoe UI, Microsoft YaHei, Arial, sans-serif';
      t.outlineColor = 'rgba(0, 0, 0, 0.45)';
      t.outlineWidth = 1;
      // 文本不换行：Clip + resizeToFit 让控件宽度随文本增长
      t.textWrapping = TextWrapping.Clip;
      t.resizeToFit = true;
      t.forceResizeWidth = true;
      t.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      t.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      t.heightInPixels = this.style.attributeFontSize + this.style.lineGapPx + 2;
      stack.addControl(t);
      attrTexts.push(t);
    }

    const line = new Line(`infoBoardLine_${item.id}`);
    // 连接线：从模型位置到牌子底部居中，使用淡化虚线
    line.lineWidth = 1.5;
    line.color = 'rgba(147, 197, 253, 0.45)';
    line.isPointerBlocker = false;
    line.zIndex = 9;
    line.overlapGroup = this.style.overlapGroup;
    line.alpha = 0.9;
    line.dash = [6, 5];
    // 线从牌子底部中心连到 mesh 位置
    line.connectedControl = rect;
    line.y2 = 0;
    line.x2 = 0;
    line.linkWithMesh(targetMesh);
    line.linkOffsetY = 0;

    this.ui.addControl(line);
    this.ui.addControl(rect);

    const entity: BoardEntity = {
      id: item.id,
      rect,
      line,
      titleText,
      sep,
      attrTexts,
      targetMesh,
      baseVisible: true,
      distanceVisible: true,
    };
    this.updateBoardContent(entity, item);
    this.linkBoard(entity);
    return entity;
  }

  /** 设置当前选中信息牌（用于轮廓高亮） */
  setSelectedId(id: string | null): void {
    const next = id ? String(id) : null;
    if (this.selectedId === next) return;
    this.selectedId = next;
    for (const [bid, entity] of this.boards) {
      this.applySelectionStyle(entity, bid === this.selectedId);
    }
  }

  private applySelectionStyle(entity: BoardEntity, selected: boolean): void {
    if (selected) {
      entity.rect.thickness = 2.5;
      entity.rect.color = 'rgba(248, 250, 252, 0.98)'; // near-white
      entity.rect.shadowBlur = 16;
      entity.rect.shadowColor = 'rgba(96, 165, 250, 0.55)'; // blue glow
      entity.line.alpha = 1;
    } else {
      entity.rect.thickness = 1;
      entity.rect.color = this.style.borderColor;
      entity.rect.shadowBlur = 10;
      entity.rect.shadowColor = 'rgba(0, 0, 0, 0.45)';
      entity.line.alpha = 0.9;
    }
  }

  private linkBoard(entity: BoardEntity): void {
    if (!entity.targetMesh) return;
    entity.rect.linkWithMesh(entity.targetMesh);
    entity.rect.linkOffsetY = this.style.linkOffsetYPx;
    entity.line.linkWithMesh(entity.targetMesh);
    // connectedControl 默认连到中心点，这里偏移到“底部居中”
    // Line 的 effectiveY2 = connectedControl.centerY + y2，因此 y2 取半高即可到达底部
    entity.line.x2 = 0;
    entity.line.y2 = entity.rect.heightInPixels / 2;
  }

  private updateBoardContent(entity: BoardEntity, item: InfoBoardItem): void {
    const title = item.title != null ? String(item.title) : '';
    entity.titleText.text = this.applyTitleCharSpacing(title);
    const hasTitle = title.trim().length > 0;
    entity.titleText.isVisible = hasTitle;
    entity.sep.isVisible = hasTitle;

    const lines = (item.attribute || [])
      .flatMap((att) =>
        Object.entries(att).map(([k, v]) => `${k}: ${v == null ? '' : String(v)}`),
      )
      .filter((x) => x.trim().length > 0);

    const alarms = item.attributeAlarm ?? [];
    for (let i = 0; i < entity.attrTexts.length; i++) {
      const t = entity.attrTexts[i];
      const text = lines[i] ?? '';
      t.text = this.applyAttributeCharSpacing(text);
      t.isVisible = text.length > 0;
      t.color = alarms[i]
        ? ATTRIBUTE_LINE_ALARM_COLOR
        : this.style.attributeColor;
    }

    // 内容变化可能导致 rect 自适应高度变化，这里同步一次连线锚点到底部
    entity.line.y2 = entity.rect.heightInPixels / 2;
    this.applySelectionStyle(entity, entity.id === this.selectedId);
    this.applyFinalVisibility(entity);
  }

  private disposeBoard(entity: BoardEntity): void {
    entity.rect.dispose();
    entity.line.dispose();
  }

  /** 组合 baseVisible 与 distanceVisible，得到最终显隐状态 */
  private applyFinalVisibility(entity: BoardEntity): void {
    const visible = entity.baseVisible && entity.distanceVisible;
    entity.rect.isVisible = visible;
    entity.line.isVisible = visible;
  }

  /** 相机距离控制显隐：开启/关闭 + 距离范围（单位与场景一致） */
  setCameraDistanceVisibility(
    enabled: boolean,
    options?: { min?: number; max?: number },
  ): void {
    this.cameraDistanceVisibilityEnabled = enabled;
    if (typeof options?.min === 'number') this.cameraDistanceMin = Math.max(0, options.min);
    if (typeof options?.max === 'number' && options.max > 0) {
      this.cameraDistanceMax = options.max;
    }

    if (!enabled) {
      if (this.cameraDistanceObserver) {
        this.scene.onBeforeRenderObservable.remove(this.cameraDistanceObserver);
        this.cameraDistanceObserver = null;
      }
      // 关闭时恢复 distanceVisible = true
      for (const entity of this.boards.values()) {
        entity.distanceVisible = true;
        this.applyFinalVisibility(entity);
      }
      return;
    }

    if (!this.cameraDistanceObserver) {
      this.cameraDistanceObserver = this.scene.onBeforeRenderObservable.add(() => {
        const cam = this.scene.activeCamera as any;
        if (!cam) return;
        const camPos: Vector3 =
          typeof cam.globalPosition !== 'undefined' ? cam.globalPosition : cam.position;
        for (const entity of this.boards.values()) {
          const mesh = entity.targetMesh;
          if (!mesh) {
            entity.distanceVisible = false;
            this.applyFinalVisibility(entity);
            continue;
          }
          const pos = mesh.getAbsolutePosition();
          const d = Vector3.Distance(camPos, pos);
          entity.distanceVisible =
            d >= this.cameraDistanceMin && d <= this.cameraDistanceMax;
          this.applyFinalVisibility(entity);
        }
      });
    }
  }

  isCameraDistanceVisibilityEnabled(): boolean {
    return this.cameraDistanceVisibilityEnabled;
  }
}
