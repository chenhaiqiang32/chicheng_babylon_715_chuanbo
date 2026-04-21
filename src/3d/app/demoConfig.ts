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
    label: '重置视角',
    preset: {
      target: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 10, z: -90 },
    },
  },
  front: {
    label: '切换到视角1',
    preset: {
      target: {x: 1.7885575972922312, y: -16.781598255145852, z: -4.368928323228072},
      // 相机在目标前方稍微抬高
      position: {x: -48.15475591107311, y: -23.514919508935012, z: -9.533224360509042},
    },
  },
  side: {
    label: '切换到视角2',
    preset: {
      target: {x: -1.6979212016149199, y: -9.494988660788001, z: -5.307022957324194},
      // 相机在目标左侧稍微抬高
      position: {x: -5.8082561100814925, y: 5.114003734876908, z: -42.27591496299824},
    },
  },
  top: {
    label: '切换到视角3',
    preset: {
      target: {x: -11.674704370780752, y: -7.04441194738163, z: -17.215962182100814},
      // 相机在目标正上方
      position: {x: 10.793017840888066, y: 4.672317515647392, z: -39.526294176341366},
    },
  },
  /**
   * 业务侧命名的镜头预设（供 public/demo-3d-host.html 发送 cmd: switchCamera 使用）
   * - param: 'default' | 'czz' | 'ttz' | 'jsz'
   */
  czz: {
    label: '垂直阵',
    preset: {
      target: {x: 1.7885575972922312, y: -16.781598255145852, z: -4.368928323228072},
      // 相机在目标前方稍微抬高
      position: {x: -48.15475591107311, y: -23.514919508935012, z: -9.533224360509042},
    },
  },
  ttz: {
    label: '托体阵',
    preset: {
      target: {x: -1.6979212016149199, y: -9.494988660788001, z: -5.307022957324194},
      // 相机在目标左侧稍微抬高
      position: {x: -5.8082561100814925, y: 5.114003734876908, z: -42.27591496299824},
    },
  },
  jsz: {
    label: '接收阵',
    preset: {
      target: {x: -11.674704370780752, y: -7.04441194738163, z: -17.215962182100814},
      // 相机在目标正上方
      position: {x: 10.793017840888066, y: 4.672317515647392, z: -39.526294176341366},
    },
  },
  // close: {
  //   label: '特写',
  //   preset: {
  //     target: { x: 0, y: 0, z: 0 },
  //     // 更靠近目标一点
  //     position: { x: -25, y: 8, z: 0 },
  //   },
  // },
  // // 基于模型包围盒中心点 + 偏移量的示例（以 Soldier 模型为例）
  // soldierFrontClose: {
  //   label: 'Dancing 前方近景',
  //   preset: {
  //     modelName: 'Dancing',
  //     // 以 Soldier 包围盒中心点为 target，向前方 + 稍微抬高的偏移作为 position
  //     offset: { x: 0, y: 0, z: 0 },
  //   },
  // },
  // soldierTop: {
  //   label: 'Soldier 俯视',
  //   preset: {
  //     modelName: 'Soldier',
  //     offset: { x: 0, y: 60, z: 0 },
  //   },
  // },
};
/**
 * 业务指令 directionControl：已改为直接调整 ArcRotateCamera 的水平角 alpha（与鼠标控制器一致），
 * 不再按模型名单旋转根节点。以下字段仅保留兼容旧代码/引用。
 */
export const directionControlConfig = {
  /** @deprecated 不再使用 */
  modelNames: [ '20new',
  'chuanti02',
  'donghua01new',
  'donghua02new',
  'donghua03new',
  'gaiban',],
} as const;
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
  /** 绳子半径（场景单位，与 createRopeDemo 的 ropeRadius 一致） */
  ropeRadius: 0.12,
} as const;

/**
 * 绳子 demo 绑定的模型配置：
 * - id: 绳子唯一标识（用于多绳子管理与 UI 控制）
 * - meshAName: 固定端（A）绑定的模型名称
 * - modelBName: 可移动端（B）绑定的模型名称
 * - config: 每根绳子独立的初始化配置（未填则回退到 ropeDemoConfig，含 ropeRadius 粗细）
 *
 * 实际使用时会从 App 中已加载的模型数据中按名称查找模型进行绑定。
 */
type RopeBoxFaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type RopeBoxFaceTextureConfig = {
  textureUrl: string;
  textureWidthPx: number;
  textureHeightPx: number;
};

export const ropeDemoModelBindings: Array<{
  id: string;
  meshAName: string;
  modelBName: string;
  config?: Partial<{
    textureUrl: string;
    textureWidthPx: number;
    textureHeightPx: number;
    /** 绳子渲染形状：tube（旧版管状）/ box（长方体六面贴图） */
    ropeShapeType: 'tube' | 'box';
    /** 长方体类型：绕绳轴自身旋转（度）；未填时回退 boxFlipAngleDeg */
    boxSelfRotationDeg: number;
    /** @deprecated 请优先使用 boxSelfRotationDeg，语义相同 */
    boxFlipAngleDeg: number;
    /** 长方体类型：六个面的贴图与像素尺寸（缺省将回退到 textureUrl/textureWidthPx/textureHeightPx） */
    boxFaces: Partial<Record<RopeBoxFaceName, Partial<RopeBoxFaceTextureConfig>>>;
    /** box 截面宽（front/back 面的 world 宽；默认 ropeRadius*2） */
    boxWidth: number;
    /** box 截面高（front/back 面的 world 高；默认 ropeRadius*2） */
    boxHeight: number;
    initialDistance: number;
    initialYawDeg: number;
    initialPitchDeg: number;
    /** 该根绳子的管状半径（粗细），场景单位 */
    ropeRadius: number;
  }>;
}> = [
  {
    id: 'rope_1',
    meshAName: '20fromA',
    modelBName: 'liantou001',
    config: {
       // rope_1：默认绳子纹理
      textureUrl: '/wenli/hei.png',
      textureWidthPx: 397,
      textureHeightPx: 4096,
      // rope_1：偏短、水平
      initialDistance: 0.5,
      initialYawDeg: -180,
      initialPitchDeg: -89,
      ropeRadius:0.032,
    },
  },
  {
    id: 'rope_2',
    meshAName: '01fromA',
    modelBName: 'donghua01-004',
    config: {
      // rope_2：使用另一张纹理（与 rope_1 不同）
      textureUrl: '/wenli/lvsheng.png',
      // 未知真实像素尺寸时也可不填；这里给出占位值，便于 UI/缩放策略一致
      textureWidthPx: 397,
      textureHeightPx: 4096,
      // rope_2：更长、向右前方、略向上
      initialDistance: 0.5,
      initialYawDeg: -89,
      initialPitchDeg: -28,
      ropeRadius:0.01,
    },
  },
  // 第三根使用一个通用 B 端名称，实际绑定时可根据当前选中模型名称覆盖
  {
    id: 'rope_3',
    meshAName: '02fromA',
    modelBName: 'donghua02-011',
    config: {
      ropeShapeType: 'box',
      // 截面宽/高：用于控制 box 的形状（front/back 的矩形宽高）
      boxWidth: 0.02,
      boxHeight: 0.24,
      // boxSelfRotationDeg：绕绳轴（A→B）自身旋转，用于纹理朝向等
      boxSelfRotationDeg: 0,
      boxFaces: {
        front: {
          textureUrl: '/wenli/donghau02.png',
          textureWidthPx: 1024,
          textureHeightPx: 1024,
        },
        back: {
          textureUrl: '/wenli/donghau02.png',
          textureWidthPx: 1024,
          textureHeightPx: 1024,
        },
        left: {
          textureUrl: '/wenli/donghau0201.png',
          textureWidthPx: 1024,
          textureHeightPx: 66,
        },
        right: {
          textureUrl: '/wenli/donghau0201.png',
          textureWidthPx: 1024,
          textureHeightPx: 66,
        },
        top: {
          textureUrl: '/wenli/donghau02shang.png',
          textureWidthPx: 27,
          textureHeightPx: 1024,
        },
        bottom: {
          textureUrl: '/wenli/donghau02xia.png',
          textureWidthPx: 5,
          textureHeightPx: 1024,
        },
      },
      // rope_3：第三套纹理（与 rope_1/rope_2 不同）
      textureUrl: '/DefaultScene/amiga.jpg',
      textureWidthPx: 1024,
      textureHeightPx: 1024,
      // rope_3：中等长度、向左前方、略向下
      initialDistance: 0,
      initialYawDeg: -91,
      initialPitchDeg: -46,
      ropeRadius: 0.16,
    },
  },
];

/** 柔性绳子 demo 默认配置（起点+终点+中间 17 个控制点） */
export const flexibleRopeDemoConfig = {
  /** 中间控制点数量（不含起点与终点） */
  pointCount: 17,
  /** 起点：模型名称（会在已加载模型节点中查找并跟随移动） */
  start: 'Soldier',
  /** 起点到终点方向：水平角 yaw（度，绕 Y 轴，0 为 +X） */
  angle: -91,
  /** 起点到终点方向：俯仰角 pitch（度，0 为水平，向上为正） */
  pitch: -29,
  /** 绳子半径 */
  ropeRadius: 0.01,
  /** 绳子纹理宽像素（public 纹理的原始宽度，用于按像素密度校正 tiling） */
  textureWidthPx: 372,
  /** 绳子纹理高像素（public 纹理的原始高度，用于按像素密度校正 tiling） */
  textureHeightPx: 4096,
  /** 纹理路径（沿用绳子 demo） */
  textureUrl: '/wenli/lansheng.png',
   /**
   * 最远端控制点相对起点的下潜深度（世界单位，沿 Y 向下）；
   * 各控制点深度从 0 线性递增到此值，用于模拟沿绳向逐渐加深。
   */
  maxPointDepth: 2.5,
} as const;
/** 与 flexibleRopeDemoConfig 一致：控制点下潜深度自近端向远端线性递增 */
export function getFlexibleRopeDefaultPointDepths(): number[] {
  const n = flexibleRopeDemoConfig.pointCount;
  const maxD = flexibleRopeDemoConfig.maxPointDepth;
  return Array.from({ length: n }, (_, i) => (n > 1 ? (maxD * i) / (n - 1) : 0));
}

const flexibleRopeDefaultPointDepthsRamp = getFlexibleRopeDefaultPointDepths();

/** 柔性绳子创建示例（用于 message 或直接调用 createFlexibleRopes，默认创建两根绳子） */
export const flexibleRopeCreateExample: FlexibleRopeCreateItem[] = [
  {
    id: 'rope_1',
    angle: flexibleRopeDemoConfig.angle,
    pitch: flexibleRopeDemoConfig.pitch,
    start: 'A',
    textureUrl: flexibleRopeDemoConfig.textureUrl,
    textureWidthPx: flexibleRopeDemoConfig.textureWidthPx,
    textureHeightPx: flexibleRopeDemoConfig.textureHeightPx,
    ropeRadius: flexibleRopeDemoConfig.ropeRadius,
    length: Array.from({ length: flexibleRopeDemoConfig.pointCount }, (_, i) => ({
      id: `p${i}`,
      distance: (20 * (i + 1)) / (flexibleRopeDemoConfig.pointCount + 1),
      depth: flexibleRopeDefaultPointDepthsRamp[i],
    })),
  },
  {
    id: 'rope_2',
    angle: flexibleRopeDemoConfig.angle,
    pitch: flexibleRopeDemoConfig.pitch,
    start: 'A.001',
    textureUrl: flexibleRopeDemoConfig.textureUrl,
    textureWidthPx: flexibleRopeDemoConfig.textureWidthPx,
    textureHeightPx: flexibleRopeDemoConfig.textureHeightPx,
    ropeRadius: flexibleRopeDemoConfig.ropeRadius,
    length: Array.from({ length: flexibleRopeDemoConfig.pointCount }, (_, i) => ({
      id: `q${i}`,
      distance: (20 * (i + 1)) / (flexibleRopeDemoConfig.pointCount + 1),
      depth: flexibleRopeDefaultPointDepthsRamp[i],
    })),
  },
];
/** 动画分割 Demo 配置：用于对某些模型的动画组按帧区间裁剪成“新动画” */
export type AnimationSplitSegmentConfig = {
  /** 分割后动画的名称（会出现在 UI 的动画下拉列表） */
  name: string;
  /** 分割区间起始帧（含） */
  from: number;
  /**
   * 分割区间结束帧（含）
   * - 允许传 `-1`：表示裁剪到源动画组的最后一帧（group.to）
   */
  to: number;
};

/** 动画分割 Demo：针对“源动画组”裁剪出多个分段动画 */
export type AnimationSplitSourceConfig = {
  /**
   * 源动画组选择方式：
   * - 若填 `sourceAnimationNames`，则按 AnimationGroup.name 精确匹配
   * - 若填 `sourceAnimationIndex`，则按 AnimationGroup 在导入结果里的顺序索引匹配
   *
   * 二者可同时填：任意条件命中即可认为该源动画需要分割。
   */
  sourceAnimationNames?: string[];
  sourceAnimationIndex?: number;
  /** 分割后动画段列表 */
  segments: AnimationSplitSegmentConfig[];
  /** 是否保留原始源动画组（默认 false：只保留分割出来的段动画） */
  keepSourceAnimation?: boolean;
};

/** 动画分割 Demo：按模型名称配置需要分割的源动画组 */
export type AnimationSplitModelConfig = {
  /** sources 中每一项都可能命中某个源 AnimationGroup */
  sources: AnimationSplitSourceConfig[];
};

/**
 * 动画分割 Demo 配置（按模型名匹配）。
 *
 * 注意：模型名来自 URL 文件名（如 `/Soldier.fbx` => `Soldier`）。
 * 源动画组 name 来源于 `ImportMeshAsync` 导入后得到的 `result.animationGroups[].name`。
 */
export const animationSplitDemoConfig: Record<string, AnimationSplitModelConfig> = {
  // 示例（按需填写）：
  // Soldier: {
  //   sources: [
  //     {
  //       sourceAnimationNames: ['<源动画组名称>'],
  //       keepSourceAnimation: false,
  //       segments: [
  //         { name: 'Soldier_SegA', from: 0, to: 30 },
  //         { name: 'Soldier_SegB', from: 31, to: 60 },
  //       ],
  //     },
  //   ],
  // },
  donghua02new: {
    sources: [
      {
        sourceAnimationNames: ['Animation'],
        keepSourceAnimation: false,
        segments: [
          { name: 'donghua02_first', from: 0, to: 744 },
          { name: 'donghua02_second', from:744, to: -1 },
        ],
      },
    ],
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
  defaultUrl: '/hdr/grasslands_sunset_1k.hdr',
  /** 默认尺寸 */
  defaultSize: 512,
  /** 默认环境强度 */
  defaultIntensity: 1,
  /** 初始化（加载模型后）时若未填写使用的兜底 URL */
  initFallbackUrl: '/hdr/grasslands_sunset_1k.hdr',
  /** 点击“应用 HDR 环境”时若未填写使用的兜底 URL */
  applyFallbackUrl: '/Dutch-Sky_0168_4k.hdr',
} as const;

/** HDR 环境贴图旋转默认配置：用于让环境光方向随时间变化 */
export const hdrEnvironmentRotationDefaults = {
  /** 是否启用环境贴图逐渐旋转（默认开启） */
  enabled: false,
  /** 旋转速度（弧度/秒），建议 0.01 ~ 0.2 */
  speedRadPerSec: 0.2,
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
    // 更“波涛汹涌”的默认值（偏大浪 + 更强法线 + 更快流动）
    windDirection: { x: 1, y: 0.35 },
    windForce: 14,
    waveHeight: 0,
    bumpHeight: 1.2,
    waveLength: 0.08,
    waveSpeed: 120,
    // 提高泡沫/颜色混合强度（更像浪花）
    colorBlendFactor: 0.45,
    bumpTextureScale: { u: 6, v: 6 },
    waterColor: '#0a3b41',
  },
  colorHex: '#0a3b41',
};

/**
 * 螺旋桨浪花粒子示例：发射器世界坐标数组（每个点会创建一组尾流/浪花粒子）。
 * - 仅存放数据，方便在不同模型/场景下快速调整位置
 */
export const propellerWaveParticleEmitters: Array<{ x: number; y: number; z: number }> = [
  // 默认示例：船尾附近（与 App.createPropellerWaveEffect 里的默认 emitterCenter 对齐）
  { x: -2, y: -4, z: -28 },
];




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

/** 传感器绑定信息牌子绑定配置*/
export const infoBoardBindConfig = {
  czz:{ // 垂直阵
    modelName: "20new", // 关联的模型名称
    boardBindCmd: "5206H", // 绑定的指令cmd名称
    sensorList: [ // 传感器数组
      {
        childModelName: "1#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "上抗偏单元",
        boardAttribute: [
          {
            boardBindCmdKey: "skpdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "skpdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "skpdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "20#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "下抗偏单元",
        boardAttribute: [
          {
            boardBindCmdKey: "xkpdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "xkpdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "xkpdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "2#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "首部单元",
        boardAttribute: [
          {
            boardBindCmdKey: "sbdyObject.fgsszRaw", // 绑定的指令cmd的key结构（与 5206H param 一致）
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "sbdyObject.fysszRaw",
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "sbdyObject.hxsszRaw",
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "5#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "1#发射单元",
        boardAttribute: [
          {
            boardBindCmdKey: "onefsdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "onefsdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "onefsdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "10#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "2#发射单元",
        boardAttribute: [
          {
            boardBindCmdKey: "twofsdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "twofsdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "twofsdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "15#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "3#发射单元",
        boardAttribute: [
          {
            boardBindCmdKey: "threefsdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "threefsdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "threefsdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "18#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "4#发射单元",
        boardAttribute: [
          {
            boardBindCmdKey: "fourfsdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "fourfsdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "fourfsdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
      {
        childModelName: "16#", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "5#发射单元",
        boardAttribute: [
          {
            boardBindCmdKey: "fivefsdyObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "fivefsdyObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "fivefsdyObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
    ],
  },
  ttz:{ // 托体阵传感器
    modelName: "donghua02new", // 关联的模型名称
    boardBindCmd: "5208H", // 绑定的指令cmd名称
    sensorList: [ // 传感器数组
      {
        childModelName: "donghua02-010", // 关联的子模型名称
        offset: { // 产生的信息牌子相对于子模型位置的偏移
          x: 0,
          y: 0,
          z: 0,
        },
        boardTitle: "拖体阵传感器",
        boardAttribute: [
          {
            boardBindCmdKey: "ttzcgqObject.fgsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"翻滚值"
          },
          {
            boardBindCmdKey: "ttzcgqObject.fysszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"俯仰值"
          },
          {
            boardBindCmdKey: "ttzcgqObject.hxsszRaw", // 绑定的指令cmd的key结构
            boardBindCmdName:"航向值"
          }
        ],
      },
    ],
  },
} as const;
/** 传感器报警关联信息牌子配置*/
export const infoBoardAlarmBindConfig = {
  alarmList: [
    {
      cmdName:"5207H", // 命令码
      cmdBindCmd: "5206H", // 关联的命令码
      sensorList: [
        // 上抗偏单元
        {
          cmdKey: "skpdyObject.fgztRaw",
          cmdKeyBind: "skpdyObject.fgsszRaw",
        },
        {
          cmdKey: "skpdyObject.fyztRaw",
          cmdKeyBind: "skpdyObject.fysszRaw",
        },
        // 下抗偏单元
        {
          cmdKey: "xkpdyObject.fgztRaw",
          cmdKeyBind: "xkpdyObject.fgsszRaw",
        },
        {
          cmdKey: "xkpdyObject.fyztRaw",
          cmdKeyBind: "xkpdyObject.fysszRaw",
        },
        // 首部单元
        {
          cmdKey: "sbdyObject.fgztRaw",
          cmdKeyBind: "sbdyObject.fgsszRaw",
        },
        {
          cmdKey: "sbdyObject.fyztRaw",
          cmdKeyBind: "sbdyObject.fysszRaw",
        },
        {
          cmdKey: "sbdyObject.hxztRaw",
          cmdKeyBind: "sbdyObject.hxsszRaw",
        },
        // 1#发射单元
        {
          cmdKey: "onefsdyObject.fgztRaw",
          cmdKeyBind: "onefsdyObject.fgsszRaw",
        },
        {
          cmdKey: "onefsdyObject.fyztRaw",
          cmdKeyBind: "onefsdyObject.fysszRaw",
        },
        {
          cmdKey: "onefsdyObject.hxztRaw",
          cmdKeyBind: "onefsdyObject.hxsszRaw",
        },
        // 2#发射单元
        {
          cmdKey: "twofsdyObject.fgztRaw",
          cmdKeyBind: "twofsdyObject.fgsszRaw",
        },
        {
          cmdKey: "twofsdyObject.fyztRaw",
          cmdKeyBind: "twofsdyObject.fysszRaw",
        },  
        {
          cmdKey: "twofsdyObject.hxztRaw",
          cmdKeyBind: "twofsdyObject.hxsszRaw",
        },
        // 3#发射单元
        {
          cmdKey: "threefsdyObject.fgztRaw",
          cmdKeyBind: "threefsdyObject.fgsszRaw",
        },
        {
          cmdKey: "threefsdyObject.fyztRaw",
          cmdKeyBind: "threefsdyObject.fysszRaw",
        },
        {
          cmdKey: "threefsdyObject.hxztRaw",
          cmdKeyBind: "threefsdyObject.hxsszRaw",
        },
        // 4#发射单元
        {
          cmdKey: "fourfsdyObject.fgztRaw",
          cmdKeyBind: "fourfsdyObject.fgsszRaw",
        },
        {
          cmdKey: "fourfsdyObject.fyztRaw",
          cmdKeyBind: "fourfsdyObject.fysszRaw",
        },
        {
          cmdKey: "fourfsdyObject.hxztRaw",
          cmdKeyBind: "fourfsdyObject.hxsszRaw",
        },
        // 5#发射单元
        {
          cmdKey: "fivefsdyObject.fgztRaw",
          cmdKeyBind: "fivefsdyObject.fgsszRaw",
        },
        {
          cmdKey: "fivefsdyObject.fyztRaw",
          cmdKeyBind: "fivefsdyObject.fysszRaw",
        },
        {
          cmdKey: "fivefsdyObject.hxztRaw",
          cmdKeyBind: "fivefsdyObject.hxsszRaw",
        },
      ],
    },
    {
      cmdName:"5209H", // 命令码
      cmdBindCmd: "5208H", // 关联的命令码
      sensorList: [
        {
          cmdKey: "fsdyfgztRaw",
          cmdKeyBind: "ttzcgqObject.fgsszRaw",
        },
        {
          cmdKey: "fsdyfyztRaw",
          cmdKeyBind: "ttzcgqObject.fysszRaw",
        },
        {
          cmdKey: "fsdyhxztRaw",
          cmdKeyBind: "ttzcgqObject.hxsszRaw",
        }
      ]
   }
  ]
} as const;

/**
 * 渲染性能 / 低显存友好配置（demo 与 Vue 页共用）。
 *
 * - `qualityPreset` 为 `low` / `medium` 时会合并一组默认值（仍可被下方显式字段覆盖）。
 * - `hardwareScalingLevel`：Babylon 内部渲染缩放，**大于 1 降低分辨率**（减轻显存与片元压力），常用 `1`（全分辨率）、`1.5`、`2`。
 * - `limitDeviceRatio`：与高 DPI（如 Retina）下的 `devicePixelRatio` 相关，见 Engine 构造参数；小于 1 可进一步减轻负担（视引擎版本行为为准）。
 * - `showFpsOverlay`：是否在画布角落叠加 FPS。
 * - `fpsHudRealtime` / `fpsHudPollMs`：Vue 页「性能」页签与叠加层的帧率刷新方式（rAF 实时 / 定时）。
 * - `gpuLightIntensityScale`：场景灯光强度乘数，降低可减轻 GPU 光照相关负载。
 * - `gpuTextureQuality`：纹理与各向异性过滤档位，降低可减轻采样开销。
 * - `gpuEnvironmentEnabled` / `gpuEnvironmentIntensityScale`：环境光/环境反射（IBL）开关与强度缩放，可明显降低 PBR 光照开销。
 */
export type RendererQualityPreset = 'default' | 'medium' | 'low';

/** 场景材质纹理采样档位：降低可减轻各向异性过滤与三线性采样开销 */
export type GpuTextureQuality = 'high' | 'medium' | 'low';

export type RendererPerformanceDemoConfig = {
  qualityPreset: RendererQualityPreset;
  /** 内部渲染缩放，值越大分辨率越低（越省显存） */
  hardwareScalingLevel: number;
  antialias: boolean;
  adaptToDeviceRatio: boolean;
  limitDeviceRatio: number;
  showFpsOverlay: boolean;
  /**
   * 帧率调试：为 `true` 时用 `requestAnimationFrame` 每帧采样（与屏幕刷新同步，便于实时调参）；
   * 为 `false` 时按 `fpsHudPollMs` 定时读取引擎统计值（略省主线程占用）。
   */
  fpsHudRealtime: boolean;
  /** 当 `fpsHudRealtime === false` 时的采样间隔（毫秒） */
  fpsHudPollMs: number;
  /**
   * 场景灯光强度全局乘数（约 0.2～1），降低可减轻光照相关负载（观感上整体变暗）。
   * 运行时按比值乘到当前场景各 `Light.intensity`，切换场景会重新以该目标值套用。
   */
  gpuLightIntensityScale: number;
  /** 纹理与各向异性过滤档位，见 `GpuTextureQuality` */
  gpuTextureQuality: GpuTextureQuality;
  /** 是否启用环境贴图（IBL 环境光/反射）。关闭可明显减轻 PBR 负载，但模型反射会消失 */
  gpuEnvironmentEnabled: boolean;
  /** 环境强度缩放（0~1），在启用 IBL 时生效 */
  gpuEnvironmentIntensityScale: number;
};

/** 解析后的性能参数（已展开 preset），供引擎初始化使用 */
export type RendererPerformanceResolved = Omit<RendererPerformanceDemoConfig, 'qualityPreset'>;

const RENDERER_PERF_DEFAULTS: RendererPerformanceResolved = {
  hardwareScalingLevel: 1,
  antialias: true,
  adaptToDeviceRatio: true,
  limitDeviceRatio: 1,
  showFpsOverlay: false,
  fpsHudRealtime: true,
  fpsHudPollMs: 200,
  gpuLightIntensityScale: 1,
  gpuTextureQuality: 'high',
  gpuEnvironmentEnabled: true,
  gpuEnvironmentIntensityScale: 1,
};

const QUALITY_PRESETS: Record<RendererQualityPreset, Partial<RendererPerformanceResolved>> = {
  default: {},
  /** 略降分辨率，保留抗锯齿；略降灯光与纹理档位 */
  medium: {
    hardwareScalingLevel: 1.5,
    antialias: true,
    limitDeviceRatio: 1,
    gpuLightIntensityScale: 0.85,
    gpuTextureQuality: 'medium',
    gpuEnvironmentEnabled: true,
    gpuEnvironmentIntensityScale: 0.85,
  },
  /** 低显存 / 集显：显著降低内部分辨率，关闭 MSAA；进一步降灯光与纹理清晰度 */
  low: {
    hardwareScalingLevel: 2,
    antialias: false,
    limitDeviceRatio: 0.75,
    gpuLightIntensityScale: 0.65,
    gpuTextureQuality: 'low',
    gpuEnvironmentEnabled: false,
    gpuEnvironmentIntensityScale: 0.65,
  },
};

/**
 * 画质预设对应的推荐 `hardwareScalingLevel`（与 `QUALITY_PRESETS` 一致，供 Vue 侧栏切换预设时立即套用）。
 */
export function getHardwareScalingLevelForQualityPreset(
  q: RendererQualityPreset,
): number {
  const preset = QUALITY_PRESETS[q] ?? {};
  if (typeof preset.hardwareScalingLevel === 'number') return preset.hardwareScalingLevel;
  return RENDERER_PERF_DEFAULTS.hardwareScalingLevel;
}

/** 画质预设对应的推荐灯光强度乘数（与 `QUALITY_PRESETS` 一致） */
export function getGpuLightIntensityScaleForQualityPreset(
  q: RendererQualityPreset,
): number {
  const preset = QUALITY_PRESETS[q] ?? {};
  if (typeof preset.gpuLightIntensityScale === 'number') return preset.gpuLightIntensityScale;
  return RENDERER_PERF_DEFAULTS.gpuLightIntensityScale;
}

/** 画质预设对应的推荐纹理质量档位（与 `QUALITY_PRESETS` 一致） */
export function getGpuTextureQualityForQualityPreset(q: RendererQualityPreset): GpuTextureQuality {
  const preset = QUALITY_PRESETS[q] ?? {};
  if (preset.gpuTextureQuality) return preset.gpuTextureQuality;
  return RENDERER_PERF_DEFAULTS.gpuTextureQuality;
}

export function getGpuEnvironmentEnabledForQualityPreset(q: RendererQualityPreset): boolean {
  const preset = QUALITY_PRESETS[q] ?? {};
  if (typeof preset.gpuEnvironmentEnabled === 'boolean') return preset.gpuEnvironmentEnabled;
  return RENDERER_PERF_DEFAULTS.gpuEnvironmentEnabled;
}

export function getGpuEnvironmentIntensityScaleForQualityPreset(q: RendererQualityPreset): number {
  const preset = QUALITY_PRESETS[q] ?? {};
  if (typeof preset.gpuEnvironmentIntensityScale === 'number') return preset.gpuEnvironmentIntensityScale;
  return RENDERER_PERF_DEFAULTS.gpuEnvironmentIntensityScale;
}

/**
 * 合并 demo 配置与画质预设。显式写在 `rendererPerformanceDemoConfig` 里的字段会覆盖 preset 的同名字段。
 */
export function resolveRendererPerformanceDemo(
  cfg: RendererPerformanceDemoConfig,
): RendererPerformanceResolved {
  const preset = QUALITY_PRESETS[cfg.qualityPreset] ?? {};
  const { qualityPreset: _q, ...explicit } = cfg;
  return { ...RENDERER_PERF_DEFAULTS, ...preset, ...explicit };
}

/**
 * 低显存 / 弱显卡：优先改 `qualityPreset` 为 `'low'`（降分辨率 + 关 MSAA + 限制 DPI），
 * 仍卡再单独把 `hardwareScalingLevel` 调到 `2`～`2.5`。
 * Vue 全功能页可用侧栏「性能」微调缩放并看 FPS；iframe `#/3d-viewer` 读同一配置。
 */
export const rendererPerformanceDemoConfig: RendererPerformanceDemoConfig = {
  qualityPreset: 'default',
  hardwareScalingLevel: 1,
  antialias: true,
  adaptToDeviceRatio: true,
  limitDeviceRatio: 1,
  showFpsOverlay: true,
  fpsHudRealtime: true,
  fpsHudPollMs: 200,
  gpuLightIntensityScale: 1,
  gpuTextureQuality: 'high',
  gpuEnvironmentEnabled: true,
  gpuEnvironmentIntensityScale: 1,
};

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim().length) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * 从浏览器 URL query 解析性能覆盖参数（用于 `#/app` 与 `#/3d-viewer` 直接通过地址栏传参调性能）。
 *
 * 支持长参数名与短别名：
 * - hardwareScalingLevel | hsl
 * - gpuLightIntensityScale | gls
 * - gpuTextureQuality | gtq  (high/medium/low)
 * - gpuEnvironmentEnabled | ibl (1/0/true/false)
 * - gpuEnvironmentIntensityScale | ibls
 * - showFpsOverlay | fps
 * - fpsHudRealtime | fpsr
 * - fpsHudPollMs | fpsms
 * - qualityPreset | q (default/medium/low)
 */
export function parseRendererPerformanceFromQuery(
  query: Record<string, unknown>,
): Partial<RendererPerformanceDemoConfig> {
  const get = (k: string) => query[k];
  const out: Partial<RendererPerformanceDemoConfig> = {};

  const qp = (get('qualityPreset') ?? get('q')) as unknown;
  if (qp === 'default' || qp === 'medium' || qp === 'low') out.qualityPreset = qp;

  const hsl = toNumber(get('hardwareScalingLevel') ?? get('hsl'));
  if (hsl != null) out.hardwareScalingLevel = clamp(hsl, 0.25, 6);

  const gls = toNumber(get('gpuLightIntensityScale') ?? get('gls'));
  if (gls != null) out.gpuLightIntensityScale = clamp(gls, 0.2, 1);

  const gtq = String(get('gpuTextureQuality') ?? get('gtq') ?? '').trim().toLowerCase();
  if (gtq === 'high' || gtq === 'medium' || gtq === 'low') out.gpuTextureQuality = gtq;

  const ibl = toBool(get('gpuEnvironmentEnabled') ?? get('ibl'));
  if (ibl != null) out.gpuEnvironmentEnabled = ibl;

  const ibls = toNumber(get('gpuEnvironmentIntensityScale') ?? get('ibls'));
  if (ibls != null) out.gpuEnvironmentIntensityScale = clamp(ibls, 0, 1);

  const fps = toBool(get('showFpsOverlay') ?? get('fps'));
  if (fps != null) out.showFpsOverlay = fps;

  const fpsr = toBool(get('fpsHudRealtime') ?? get('fpsr'));
  if (fpsr != null) out.fpsHudRealtime = fpsr;

  const fpsms = toNumber(get('fpsHudPollMs') ?? get('fpsms'));
  if (fpsms != null) out.fpsHudPollMs = Math.max(16, Math.round(fpsms));

  return out;
}

/** 场景饱和度后处理默认配置（用于 UI 初始值 + 3D 初始化默认值） */
export const sceneSaturationDefaults = {
  /** 默认是否启用饱和度后处理 */
  enabled: true,
  /**
   * 默认饱和度值：
   * - 对应 Babylon `colorCurves.globalSaturation`
   * - 建议范围：-100 ~ 100
   */
  value: 30,
} as const;


