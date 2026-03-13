import type { CameraViewPreset, InfoBoardItem, SeaParams } from './index';

/** 镜头预设 demo 配置：仅存放数据，方便后续按需调整 */
export const cameraPresetsConfig: Record<
  string,
  { label: string; preset: CameraViewPreset }
> = {
  default: {
    label: '默认',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      position: { x: -80, y: 10, z: 0 },
    },
  },
  front: {
    label: '正面',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      alpha: 0,
      beta: Math.PI / 2.5,
      radius: 80,
    },
  },
  side: {
    label: '侧面',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      alpha: -Math.PI / 2,
      beta: Math.PI / 2.5,
      radius: 80,
    },
  },
  top: {
    label: '俯视',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      alpha: -Math.PI / 2,
      beta: 0.35,
      radius: 80,
    },
  },
  close: {
    label: '特写',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      alpha: -Math.PI / 2,
      beta: Math.PI / 2.5,
      radius: 25,
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
  /** 小球 B 默认移动速度（单位/秒） */
  defaultBallSpeed: 2.5,
} as const;

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


