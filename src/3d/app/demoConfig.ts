import type {
  CameraViewPreset,
  FlexibleRopeCreateItem,
  FlexibleRopeUpdatePayload,
  InfoBoardItem,
  SeaParams,
} from './index';

/** 镜头预设 demo 配置：仅存放数据，方便后续按需调整 */
export const cameraPresetsConfig: Record<
  string,
  { label: string; preset: CameraViewPreset }
> = {
  default: {
    label: '默认',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      position: { x: 0.20738870009251056, y: -80.36847884128419, z: -6.392548598726246 },
    },
  },
  front: {
    label: '正面',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      // 相机在目标前方稍微抬高
      position: { x: 0, y: 20, z: 80 },
    },
  },
  side: {
    label: '侧面',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      // 相机在目标左侧稍微抬高
      position: { x: -80, y: 20, z: 0 },
    },
  },
  top: {
    label: '俯视',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      // 相机在目标正上方
      position: { x: 0, y: 80, z: 0 },
    },
  },
  close: {
    label: '特写',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      // 更靠近目标一点
      position: { x: -25, y: 8, z: 0 },
    },
  },
  // 基于模型包围盒中心点 + 偏移量的示例（以 Soldier 模型为例）
  soldierFrontClose: {
    label: 'Dancing 前方近景',
    preset: {
      modelName: 'Dancing',
      // 以 Soldier 包围盒中心点为 target，向前方 + 稍微抬高的偏移作为 position
      offset: { x: 0, y: 0, z: 0 },
    },
  },
  soldierTop: {
    label: 'Soldier 俯视',
    preset: {
      modelName: 'Soldier',
      offset: { x: 0, y: 60, z: 0 },
    },
  },
};

/** 相机限制 demo 的默认参数 */
export const defaultCameraViewLimitConfig = {
  panRadius: 12,
  maxRadius: 120,
  minTargetY: 0,
  maxTargetY: 18,
  limitFlipTo90Deg: true,
} as const;

/** HDR 环境 demo 默认配置 */
export const hdrDemoConfig = {
  /** 面板上默认展示与编辑的 URL */
  defaultUrl: '/venice_sunset_1k.hdr',
  /** 默认尺寸 */
  defaultSize: 512,
  /** 默认环境强度 */
  defaultIntensity: 1,
  /** 初始化（加载模型后）时若未填写使用的兜底 URL */
  initFallbackUrl: '/charolettenbrunn_park_1k.hdr',
  /** 点击“应用 HDR 环境”时若未填写使用的兜底 URL */
  applyFallbackUrl: '/Dutch-Sky_0168_4k.hdr',
} as const;

/** 天空盒 + 水面反射 demo 默认配置 */
export const skyboxDemoConfig = {
  defaultUrl: 'environment/512/TropicalSunnyDay',
  defaultSize: 512,
} as const;

/** 海面参数 demo 默认值（仅用于 UI 初始值；真正默认值来自 App.getSeaParams） */
export const seaDemoDefaults: {
  params: SeaParams;
  /** UI 中使用的默认十六进制水色（便于重置） */
  colorHex: string;
} = {
  params: {
    windForce: 8,
    waveHeight: 0.1,
    bumpHeight: 0.5,
    waveLength: 0.15,
    waveSpeed: 50,
    colorBlendFactor: 0.25,
    bumpTextureScale: { u: 3, v: 3 },
    waterColor: '#07291e',
  },
  colorHex: '#07291e',
};

/** 绳子 demo 默认配置 */
export const ropeDemoConfig = {
  /** 默认绳子纹理路径（public 下） */
  textureUrl: '/1712285623239_7670.jpeg',
  /** 纹理原始像素尺寸（宽 x 高） */
  textureWidthPx: 1600,
  textureHeightPx: 1200,
  /** 初始距离（相对 A） */
  initialDistance: 6,
  /** 初始水平角（yaw，度，绕 Y 轴，0 为 +X） */
  initialYawDeg: 0,
  /** 初始俯仰角（pitch，度，0 为水平，正值向上） */
  initialPitchDeg: 0,
} as const;

/**
 * 绳子 demo 绑定的模型配置：
 * - id: 绳子唯一标识（用于多绳子管理与 UI 控制）
 * - meshAName: 固定端（A）绑定的模型名称
 * - modelBName: 可移动端（B）绑定的模型名称
 * - config: 每根绳子独立的初始化配置（未填则回退到 ropeDemoConfig）
 *
 * 实际使用时会从 App 中已加载的模型数据中按名称查找模型进行绑定。
 */
export const ropeDemoModelBindings: Array<{
  id: string;
  meshAName: string;
  modelBName: string;
  config?: Partial<{
    textureUrl: string;
    textureWidthPx: number;
    textureHeightPx: number;
    initialDistance: number;
    initialYawDeg: number;
    initialPitchDeg: number;
  }>;
}> = [
  {
    id: 'rope_1',
    meshAName: 'DamagedHelmet',
    modelBName: 'Soldier',
    config: {
      // rope_1：默认绳子纹理
      textureUrl: '/1712285623239_7670.jpeg',
      textureWidthPx: 1600,
      textureHeightPx: 1200,
      // rope_1：偏短、水平
      initialDistance: 6,
      initialYawDeg: 0,
      initialPitchDeg: 0,
    },
  },
  {
    id: 'rope_2',
    meshAName: 'rope_Third',
    modelBName: 'Dancing',
    config: {
      // rope_2：使用另一张纹理（与 rope_1 不同）
      textureUrl: '/1711002072994_1522.jpeg',
      // 未知真实像素尺寸时也可不填；这里给出占位值，便于 UI/缩放策略一致
      textureWidthPx: 1600,
      textureHeightPx: 1200,
      // rope_2：更长、向右前方、略向上
      initialDistance: 9,
      initialYawDeg: 45,
      initialPitchDeg: 8,
    },
  },
  // 第三根使用一个通用 B 端名称，实际绑定时可根据当前选中模型名称覆盖
  {
    id: 'rope_3',
    meshAName: 'rope_Third',
    modelBName: 'Soldier',
    config: {
      // rope_3：第三套纹理（与 rope_1/rope_2 不同）
      textureUrl: '/DefaultScene/amiga.jpg',
      textureWidthPx: 1024,
      textureHeightPx: 1024,
      // rope_3：中等长度、向左前方、略向下
      initialDistance: 7,
      initialYawDeg: 315,
      initialPitchDeg: -6,
    },
  },
];

/** 柔性绳子 demo 默认配置（起点+终点+中间 17 个控制点） */
export const flexibleRopeDemoConfig = {
  /** 中间控制点数量（不含起点与终点） */
  pointCount: 17,
  /** 起点位置（世界坐标） */
  start: { x: -10, y: 6, z: 0 },
  /** 终点位置（世界坐标） */
  end: { x: 10, y: 6, z: 0 },
  /** 绳子半径 */
  ropeRadius: 0.12,
  /** 纹理路径（沿用绳子 demo） */
  textureUrl: '/1712285623239_7670.jpeg',
} as const;

/** 柔性绳子创建示例（用于 message 或直接调用 createFlexibleRopes，默认创建两根绳子） */
export const flexibleRopeCreateExample: FlexibleRopeCreateItem[] = [
  {
    id: 'rope_1',
    angle: 0,
    start: { x: -10, y: 6, z: 0 },
    end: { x: 10, y: 6, z: 0 },
    length: Array.from({ length: 17 }, (_, i) => ({
      id: `p${i}`,
      distance: (20 * (i + 1)) / 18,
    })),
  },
  {
    id: 'rope_2',
    angle: 0,
    start: { x: -10, y: 4, z: 5 },
    end: { x: 10, y: 4, z: 5 },
    length: Array.from({ length: 17 }, (_, i) => ({
      id: `q${i}`,
      distance: (20 * (i + 1)) / 18,
    })),
  },
];

/** 柔性绳子更新示例（用于 message 或直接调用 updateFlexibleRopePoints） */
export const flexibleRopeUpdateExample: FlexibleRopeUpdatePayload = {
  parentId: 'rope_1',
  length: [{ id: 'p0', angle: 15 }, { id: 'p8', angle: -10 }],
};

/** 信息牌 demo：创建调试小球与牌子时的默认配置 */
export const infoBoardDemoConfig = {
  /** 调试小球数量 */
  ballCount: 6,
  ballOptions: {
    diameter: 0.8,
    radius: 7,
    speed: 1.2,
    yAmplitude: 0.8,
    namePrefix: 'debugBall',
  },
  /** 通过 ball id 生成默认信息牌数据的方法 */
  createItems(ballIds: string[]): InfoBoardItem[] {
    return ballIds.map((id, i) => ({
      id,
      title: `移动小球 #${i + 1}`,
      attribute: [{ 状态: '循环运动' }, { 速度: '1.2 rad/s' }],
    }));
  },
} as const;


