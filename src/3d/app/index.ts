import {
  AbstractEngine,
  ActionManager,
  AnimationGroup,
  DirectionalLight,
  CascadedShadowGenerator,
  DefaultRenderingPipeline,
  Engine,
  ExecuteCodeAction,
  ImportMeshAsync,
  Mesh,
  TransformNode,
  RegisterSceneLoaderPlugin,
  Scene,
  Node,
  ShadowGenerator,
  WebGPUEngine,
  MeshBuilder,
  Vector3,
  Texture,
  Color3,
  PBRMaterial,
  CubeTexture,
  HDRCubeTexture,
  Vector2,
  ArcRotateCamera,
  AbstractMesh,
  SceneOptimizer,
  SceneOptimizerOptions,
  HemisphericLight,
  ReflectionProbe,
  ParticleSystem,
  Color4,
  Path3D,
  Curve3,
  Quaternion,
  Matrix,
  ShaderMaterial,
  PostProcess,
  Effect,
  PointerEventTypes,
} from '@babylonjs/core';
import { FBXLoader } from 'babylonjs-fbx-loader';
import { DirectionalLightHelper } from './DirectionalLightHelper';
import { CameraHelper } from './CameraHelper';
import { CameraTargetHelper } from './CameraTargetHelper';
import {
  InfoBoardHelper,
  type InfoBoardItem,
  type InfoBoardStyleOptions,
} from './InfoBoardHelper';
import {
  animationSplitDemoConfig,
  type AnimationSplitModelConfig,
  type AnimationSplitSourceConfig,
  type AnimationSplitSegmentConfig,
  propellerWaveParticleEmitters,
  sceneSaturationDefaults,
  seaDemoDefaults,
} from './demoConfig';
import {
  createTimedShaderMaterial,
  startShaderTimeObserver,
  createTiledTexture,
} from '../shader/ShaderMaterialHelper';
import { AppAssets } from '../assets/PublishLibrary';
import { ArrayUtils } from '@/utils/Array';
import { Shadow } from '../Shadow';
import { SkyMaterial, WaterMaterial } from '@babylonjs/materials';
import gsap from 'gsap';
import '@babylonjs/inspector';

export type { InfoBoardItem, InfoBoardStyleOptions } from './InfoBoardHelper';
export { MODEL_URLS } from './modelUrls.generated';
export { HDR_URLS } from './hdrUrls.generated';

/** 镜头预设：可将相机与控制器切换到指定位置（仅支持 ArcRotateCamera） */
export interface CameraViewPreset {
  /**
   * 观察目标点（控制器 target）。
   *
   * - 直接位置切换场景：显式传入 target + position/alpha/beta/radius。
   * - 模型包围盒场景：若提供 modelName，则可不传 target，而是自动使用模型包围盒中心点。
   */
  target?: { x: number; y: number; z: number } | Vector3;
  /** 相机位置；若提供则根据 target 自动计算 alpha/beta/radius */
  position?: { x: number; y: number; z: number } | Vector3;
  /** 水平角度（弧度），与 position 二选一 */
  alpha?: number;
  /** 垂直角度（弧度） */
  beta?: number;
  /** 相机到目标的距离 */
  radius?: number;
  /**
   * 基于模型名称 + 偏移的切换方式：
   * - modelName：使用该模型包围盒中心点作为默认 target。
   * - offset：相对于 target 的偏移量，用于计算相机位置 position = target + offset。
   *
   * 当同时提供 target 和 modelName 时，以显式传入的 target 为准。
   */
  modelName?: string;
  offset?: { x: number; y: number; z: number } | Vector3;
}

/** 柔性绳子：创建单根绳子的数据项 */
export interface FlexibleRopeCreateItem {
  /** 唯一标识，用于后续通过 parentId 更新该绳子 */
  id: string;
  /**
   * 可选：方向水平角 yaw（度，绕 Y 轴，0 为 +X，正角度沿 +Z 旋转）。
   * 当 start 为“模型名称”时，与 pitch 一起决定终点方向。
   */
  angle?: number;
  /**
   * 可选：方向俯仰角 pitch（度，0 为水平，向上为正）。
   * 与 angle（yaw）一起决定起点到终点的方向。
   */
  pitch?: number;
  /**
   * 起点：
   * - string：模型名称（会在场景已加载模型节点中查找并跟随移动）
   * - 坐标：显式世界坐标（兼容旧数据）
   */
  start: string | { x: number; y: number; z: number };
  /**
   * 终点坐标（世界坐标）。
   * - 当 start 为模型名称时无需传入（会按 angle+长度推导）。
   * - 当 start 为坐标时建议传入（兼容旧数据）。
   */
  end?: { x: number; y: number; z: number };
  /** 中间控制点：每项为到起点的距离及该点的唯一 id */
  length: Array<{ id: string; distance: number }>;
  /** 绳子纹理 URL（可选；用于覆盖默认纹理） */
  textureUrl?: string;
  /** 绳子纹理宽像素（可选；用于按像素密度校正纹理在 Tube 上的映射） */
  textureWidthPx?: number;
  /** 绳子纹理高像素（可选；用于按像素密度校正纹理在 Tube 上的映射） */
  textureHeightPx?: number;
  /** 绳子半径（可选；用于覆盖默认半径） */
  ropeRadius?: number | string;
}

/** 柔性绳子：更新某根绳子上连接点角度的数据格式 */
export interface FlexibleRopeUpdatePayload {
  /** 要更新的绳子 id（创建时的 id） */
  parentId: string;
  /**
   * 要更新的节点列表：id 为 length[].id
   * - 新语义：每个点支持 yaw/pitch 控制偏移（度）
   * - 兼容旧语义：若只提供 angle，则按 pitch=angle、yaw=0 进行映射
   */
  length: Array<{ id: string; yaw?: number; pitch?: number; angle?: number }>;
}

/** 海面（水面）材质参数：用于 demo 面板配置 WaterMaterial。 */
export interface SeaParams {
  /** 法线贴图平铺 */
  bumpTextureScale?: { u: number; v: number };
  /** 风向（单位向量/任意向量均可，WaterMaterial 内部会使用） */
  windDirection?: { x: number; y: number };
  windForce?: number;
  waveHeight?: number;
  bumpHeight?: number;
  waveLength?: number;
  waveSpeed?: number;
  colorBlendFactor?: number;
  /** 0: CW, 1: CCW（沿用当前代码的 1） */
  sideOrientation?: number;
  /** 颜色（0~1）或 hex */
  waterColor?: { r: number; g: number; b: number } | string;
}

export type RopeBoxFaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface RopeBoxFaceTextureConfig {
  textureUrl: string;
  textureWidthPx: number;
  textureHeightPx: number;
}

type RopeDemoShapeType = 'tube' | 'box';

// 螺旋桨波浪面片着色器（基于 docs/水面波浪.glsl）
const PROPELLER_WAVE_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() {
  vUV = uv;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

// 水面波浪片段着色器：仅保留流动部分（iChannel0 噪声 + 双层 flow，无喷溅）
const PROPELLER_WAVE_FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * texture2D(iChannel0, fract(p * frequency)).r;
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float get_mask(vec2 uv) {
  uv.x *= iResolution.x / iResolution.y;
  uv.x += sign(uv.x) * uv.y * 0.2;
  uv.x = abs(uv.x);
  return clamp(1.0 - smoothstep(0.2, 0.6, uv.x), 0.0, 1.0);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;

  vec2 flowuv = uv * 0.06 + vec2(0.0, iTime * 0.04);
  float n = fbm(flowuv);
  vec2 flowmap = vec2(0.0, smoothstep(0.2, 1.0, n)) * 0.025;
  float t = iTime * 2.0;
  float progressA = fract(t + 0.0);
  float progressB = fract(t + 0.5);
  float weightA = 1.0 - abs(progressA * 2.0 - 1.0);
  float weightB = 1.0 - abs(progressB * 2.0 - 1.0);
  vec2 uvA = flowuv + flowmap * progressA;
  vec2 uvB = flowuv + flowmap * progressB;
  float flowA = fbm(uvA) * weightA;
  float flowB = fbm(uvB) * weightB;
  float flow_val = flowA + flowB;

  float waterfall_mask = get_mask(uv);
  float flow_vis = smoothstep(0.2, 0.8, flow_val);
  vec3 waterColor = vec3(7.0/255.0, 41.0/255.0, 30.0/255.0);
  // vec3 waterMid = vec3(0.12, 0.28, 0.82);
  vec3 waterMid = vec3(0.82, 0.82, 0.8);
  vec3 foamColor = vec3(0.82, 0.82, 0.8);
  vec3 col = mix(waterColor, waterMid, 0.5);
  col = mix(col, foamColor, flow_vis);
  col *= waterfall_mask;

  float alpha = waterfall_mask * (0.45 + 0.5 * flow_vis);
  float headFade = smoothstep(0.0, 0.35, vUV.y);
  float tailFade = 1.0 - smoothstep(0.65, 1.0, vUV.y);
  alpha *= headFade * tailFade;
  alpha = clamp(alpha, 0.0, 0.92);
  if (alpha < 0.02) alpha = 0.0;

  gl_FragColor = vec4(col, alpha);
}
`;

// 绳子着色器：B 端（path 末端，v=1）纹理不动，A 端（v=0）纹理由 vOffset 控制进出
const ROPE_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() {
  vUV = uv;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;
const ROPE_FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float vScale;
uniform float vOffset;
void main() {
  float vTex = vScale * vUV.y + vOffset * (1.0 - vUV.y);
  gl_FragColor = texture2D(textureSampler, vec2(vUV.x, vTex));
}
`;

export class App {
  private engine: AbstractEngine;
  private static instance: App;
  private assets: AppAssets;
  scene: Scene;
  private canvas: HTMLCanvasElement;
  weakMap: Map<string, Node> = new Map();
  /** 环境贴图旋转：每帧更新 environmentTexture.rotationY */
  private environmentRotationObserver: ReturnType<
    Scene['onBeforeRenderObservable']['add']
  > | null = null;
  private environmentRotationEnabled = true;
  /** 环境贴图旋转速度（弧度/秒） */
  private environmentRotationSpeedRadPerSec = 0.05;
  private environmentRotationLastTimeMs: number | null = null;
  /** 相机视角限制：每帧钳制 target / beta / radius */
  private cameraViewLimitObserver: ReturnType<
    Scene['onBeforeRenderObservable']['add']
  > | null = null;
  /** 相机视角限制：水平/垂直拖动限制的中心点（默认为调用时 target） */
  private cameraViewLimitCenter: Vector3 | null = null;
  private cameraViewLimitParams: {
    panRadius?: number;
    maxRadius?: number;
    minTargetY?: number;
    maxTargetY?: number;
    /** 是否限制翻转（beta）不超过 90° */
    limitFlipTo90Deg?: boolean;
  } | null = null;
  /** 从 GLB/FBX 加载的动画组，用于播放与控制 */
  private modelAnimationGroups: AnimationGroup[] = [];
  /** 多个模型的动画组映射，按模型名称区分 */
  private modelAnimationsMap: Map<string, AnimationGroup[]> = new Map();
  /** 每个模型的根节点（ImportMeshAsync 的 meshes[0]），用于信息牌等挂接 */
  private modelRootMap: Map<string, AbstractMesh> = new Map();
  /**
   * 每个模型的所有节点（Node）扁平索引：modelName -> (name/id -> node)
   * 仅用于按名称快速查找，层级结构不在此处体现
   */
  /**
   * 节点索引：单层存储（name/id -> Node），同名覆盖。
   * 注意：该索引是全局的，不区分模型层级；当多个模型存在同名节点时，后写入的会覆盖旧值。
   */
  private modelNodesByNameMap: Map<string, Node> = new Map();
  /** 当前正在播放的动画组（按模型名称），用于 seek/进度 */
  private currentPlayingGroupByModel: Map<string, AnimationGroup> = new Map();
  /** 动画播放结束时回调（正放/倒放均会触发） */
  private animationEndHandler?: (info: {
    modelName: string;
    animationName: string;
    direction: 'forward' | 'backward';
  }) => void;
  /** 当前激活的模型名称（主要用于 UI） */
  private currentModelName: string | null = null;
  private skyMaterial?: SkyMaterial;
  private sunLight?: DirectionalLight;
  private skyObserver?: any;
  /** DirectionalLight 辅助线，可通过 setDirectionalLightHelperEnabled 控制开关 */
  private directionalLightHelper: DirectionalLightHelper | null = null;
  /** 是否默认启用 DirectionalLight 辅助线 */
  private directionalLightHelperEnabledByDefault = false;
  /** 相机辅助（位置 + 视线方向），可通过 setCameraHelperEnabled 控制开关 */
  private cameraHelper: CameraHelper | null = null;
  /** 控制器/目标点辅助（ArcRotateCamera.target），可通过 setCameraTargetHelperEnabled 控制开关 */
  private cameraTargetHelper: CameraTargetHelper | null = null;
  private cameraHelperEnabledByDefault = false;
  private cameraTargetHelperEnabledByDefault = false;
  /** 3D 信息牌：底部连线到指定节点，显示 title 与 attribute */
  private infoBoardHelper: InfoBoardHelper | null = null;
  /** 调试：循环移动的小球 */
  private debugMovingBalls: Map<
    string,
    {
      mesh: Mesh;
      observer: ReturnType<Scene['onBeforeRenderObservable']['add']>;
    }
  > = new Map();
  /**
   * 绳子 Demo：支持多根绳子。
   * key 使用“绳子名称”或“模型名称”（通常为可移动端 B 的模型名）。
   */
  private ropeStates: Map<
    string,
    {
      shapeType: RopeDemoShapeType;
      name: string;
      meshA: TransformNode;
      meshB: TransformNode;
      refLength: number;
      radius: number;
      /** 最近一次 UI/外部控制参数；存在时每帧重算，确保 B 始终贴合绳子末端 */
      liveControl?: {
        distance: number;
        yawDeg: number;
        pitchDeg: number;
        /** 仅 box：绕绳轴自身旋转（度） */
        boxSelfRotationDeg?: number;
      };
      // tube / box 的专用字段在下面通过联合结构补齐（TS 通过 shapeType 做区分）
    } & (
      | {
          shapeType: 'tube';
          tube: Mesh;
          material: PBRMaterial;
          texture: Texture;
          /** 与柔性绳一致：用于管状纹理无拉伸平铺 */
          textureWidthPx: number;
          textureHeightPx: number;
        }
      | {
          shapeType: 'box';
          boxRoot: TransformNode;
          boxDepthRef: number;
          boxWidth: number;
          boxHeight: number;
          /** 绕绳轴（A→B）自身旋转（度） */
          boxSelfRotationDeg: number;
          boxFaces: Record<
            RopeBoxFaceName,
            {
              plane: Mesh;
              material: PBRMaterial;
              texture: Texture;
              textureWidthPx: number;
              textureHeightPx: number;
              // 当绳子长度变化时，对应纹理的 u/v 需要跟随“重复平铺”更新
              uDependsOnLength: boolean;
              vDependsOnLength: boolean;
              // 纹理像素密度（等价：每个世界单位覆盖多少“纹理像素”）
              // 用于保证 u/v 在缩放（伸缩）时不会出现非等比拉伸观感。
              pixelsPerWorld: number;
              // 初始 u/v 平铺缩放（用于初始化与回退）
              uScaleRef: number;
              vScaleRef: number;
            }
          >;
        }
    )
  > = new Map();
  /** 兼容旧实现：若外部未传 name，则仍保存一份“默认绳子”引用 */
  private ropeBallA: Mesh | null = null;
  private ropeBallB: Mesh | null = null;
  private ropeTube: Mesh | null = null;
  private ropeMaterial: PBRMaterial | null = null;
  private ropeTexture: Texture | null = null;
  private ropeObserver: ReturnType<Scene['onBeforeRenderObservable']['add']> | null = null;
  private ropeRefLength = 1;
  private ropeFlowOffset = 0;
  private ropePrevBPos: Vector3 = new Vector3();
  private ropePhase = 0;
  /** 绳子 Demo：B 往复一次的总路程（用于根据速度算周期） */
  private ropeRange = 10;
  /** 绳子 Demo：B 的移动速度（世界单位/秒），可被 setRopeDemoBallSpeed 更新 */
  private ropeBallSpeed = 2.5;
  /** 绳子 Demo：当前绳子半径，供后续更新 Tube 使用 */
  private ropeRadiusCurrent = 0.12;
  /** 绳子 Demo：当前使用的纹理像素尺寸（用于按像素统一控制缩放，可选） */
  private ropeTextureWidthPx = 1600;
  private ropeTextureHeightPx = 1200;
  /** 多根柔性绳子：id -> 单根绳子状态 */
  private flexibleRopesMap: Map<
    string,
    {
      id: string;
      start: Vector3;
      end: Vector3;
      distances: number[];
      pointIds: string[];
      pointMeshes: Mesh[];
      tube: Mesh;
      refLength: number;
      /** 每个控制点的水平偏移 yaw（度） */
      pointYawDegs: number[];
      /** 每个控制点的俯仰偏移 pitch（度） */
      pointPitchDegs: number[];
      /** 纹理宽/高像素：用于 uScale/vScale 归一化 */
      textureWidthPx: number;
      textureHeightPx: number;
      radius: number;
      material: PBRMaterial;
      texture: Texture;
      /** 跟随模式：起点模型名称（有值则代表该绳子会跟随模型移动） */
      startModelName?: string;
      /** 跟随模式：方向水平角 yaw（度） */
      angleDeg?: number;
      /** 跟随模式：方向俯仰角 pitch（度） */
      pitchDeg?: number;
      /** 跟随模式：缓存到的起点节点 */
      startNode?: TransformNode | null;
      /** 跟随模式：每帧更新监听 */
      followObserver?: ReturnType<Scene['onBeforeRenderObservable']['add']> | null;
    }
  > = new Map();
  /** 柔性绳子默认半径（新建时未指定时使用） */
  private flexibleRopeRadius = 0.12;
  /** 海水下效果后处理 */
  private underwaterPostProcess: PostProcess | null = null;
  private underwaterTime = 0;
  /** 场景饱和度后处理（DefaultRenderingPipeline + colorCurves） */
  private saturationPipeline: DefaultRenderingPipeline | null = null;
  private saturationPipelineSceneId: number | null = null;
  private saturationEnabled: boolean = sceneSaturationDefaults.enabled;
  /** 饱和度：Babylon colorCurves.globalSaturation，范围建议 -100~100 */
  private saturationValue: number = sceneSaturationDefaults.value;
  /** 海水下效果自动切换：记录当前是否处于“水下”状态，避免重复开关 */
  private isUnderwaterAuto = false;
  /** 海水下效果自动切换：每帧监听句柄 */
  private underwaterAutoObserver: ReturnType<Scene['onBeforeRenderObservable']['add']> | null =
    null;
  static get Instance(): App {
    if (!this.instance) {
      this.instance = new App();
    }
    return this.instance;
  }

  private path3D?: Path3D;
  private meshArray: Mesh[] = [];

  /** 螺旋桨波浪粒子效果（可切换显示） */
  private propellerWaveParticles: ParticleSystem[] = [];
  /** 螺旋桨波浪面片+着色器效果（与粒子二选一，当前使用此项） */
  private propellerWaveMesh: Mesh | null = null;
  private propellerWaveShaderMaterial: ShaderMaterial | null = null;
  /** 移除 iTime 每帧更新的观察者，在 dispose 或不再需要时调用 */
  private propellerWaveRemoveTimeObserver: (() => void) | null = null;
  private propellerWaveEnabled = true;
  /** 螺旋桨浪花粒子是否启用（仅影响粒子版；着色器版不受影响） */
  private propellerWaveParticlesEnabled = true;
  private static readonly PROPELLER_WAVE_EMIT_RATE = 150;
  private propellerWaveEmitRateTween: gsap.core.Tween | null = null;
  /** 关闭时“从后往前”回收粒子的每帧观察者，回收完后移除 */
  private propellerWaveClosingObserver: ReturnType<Scene['onBeforeRenderObservable']['add']> | null = null;
  private static readonly PROPELLER_WAVE_RECYCLE_PER_FRAME = 100;

  /** 是否已注册相机调试点击事件，避免重复注册 */
  private cameraClickDebugRegistered = false;

  private currentCount = 0;
  allCount = 18;
  /** 水面材质，用于在加载 HDR 后设置反射贴图使水面接受环境效果 */
  private waterMaterial: WaterMaterial | null = null;
  /** 水面默认参数快照（用于 reset demo） */
  private seaParamsDefaults: SeaParams | null = null;

  /** 获取当前水面参数（从 WaterMaterial 读取）。 */
  getSeaParams(): SeaParams {
    const wm = this.waterMaterial;
    const bump = wm?.bumpTexture as Texture | null | undefined;
    const windDir = (wm as any)?.windDirection as Vector2 | undefined;
    const waterColor = wm?.waterColor;
    return {
      bumpTextureScale: bump ? { u: bump.uScale ?? 1, v: bump.vScale ?? 1 } : undefined,
      windDirection: windDir ? { x: windDir.x, y: windDir.y } : undefined,
      windForce: wm?.windForce,
      waveHeight: wm?.waveHeight,
      bumpHeight: wm?.bumpHeight,
      waveLength: wm?.waveLength,
      waveSpeed: wm?.waveSpeed,
      colorBlendFactor: wm?.colorBlendFactor,
      sideOrientation: (wm as any)?.sideOrientation,
      waterColor: waterColor ? { r: waterColor.r, g: waterColor.g, b: waterColor.b } : undefined,
    };
  }

  /**
   * 应用海面参数（部分覆盖）。不会改动未传入的字段。
   * 注意：需在 setGround 之后（waterMaterial 创建完成）调用。
   */
  setSeaParams(params: SeaParams): void {
    const wm = this.waterMaterial;
    if (!wm) return;

    if (params.bumpTextureScale && wm.bumpTexture) {
      const bump = wm.bumpTexture as Texture;
      bump.uScale = params.bumpTextureScale.u;
      bump.vScale = params.bumpTextureScale.v;
    }
    if (params.windDirection) {
      (wm as any).windDirection = new Vector2(params.windDirection.x, params.windDirection.y);
    }
    if (typeof params.windForce === 'number') wm.windForce = params.windForce;
    if (typeof params.waveHeight === 'number') wm.waveHeight = params.waveHeight;
    if (typeof params.bumpHeight === 'number') wm.bumpHeight = params.bumpHeight;
    if (typeof params.waveLength === 'number') wm.waveLength = params.waveLength;
    if (typeof params.waveSpeed === 'number') wm.waveSpeed = params.waveSpeed;
    if (typeof params.colorBlendFactor === 'number') wm.colorBlendFactor = params.colorBlendFactor;
    if (typeof params.sideOrientation === 'number') (wm as any).sideOrientation = params.sideOrientation;
    if (params.waterColor != null) {
      if (typeof params.waterColor === 'string') {
        wm.waterColor = Color3.FromHexString(params.waterColor);
      } else {
        wm.waterColor = new Color3(params.waterColor.r, params.waterColor.g, params.waterColor.b);
      }
    }
  }

  /** 重置海面参数为 setGround 时的默认值快照。 */
  resetSeaParams(): void {
    if (!this.seaParamsDefaults) return;
    this.setSeaParams(this.seaParamsDefaults);
  }

  async init(canvas: HTMLCanvasElement, gpu: boolean) {
    this.canvas = canvas;
    RegisterSceneLoaderPlugin(new FBXLoader());
    if (gpu) {
      this.engine = new Engine(canvas, true, {
        antialias: true,
        adaptToDeviceRatio: true,
        limitDeviceRatio: 1,
      });
      if (this.engine instanceof WebGPUEngine) {
        await this.engine.initAsync();
      }
    } else {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
      });
    }
    // this.engine.setHardwareScalingLevel(2);
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
    window.addEventListener('resize', this.resize);
  }

  resize = () => {
    this.engine.resize();
  };

  onDispose() {
    window.removeEventListener('resize', this.resize);
    this.directionalLightHelper?.dispose();
    this.directionalLightHelper = null;
    this.cameraHelper?.dispose();
    this.cameraHelper = null;
    this.cameraTargetHelper?.dispose();
    this.cameraTargetHelper = null;
    this.infoBoardHelper?.dispose();
    this.infoBoardHelper = null;
    if (this.saturationPipeline) {
      this.saturationPipeline.dispose();
      this.saturationPipeline = null;
      this.saturationPipelineSceneId = null;
    }
    if (this.scene) {
      for (const { mesh, observer } of this.debugMovingBalls.values()) {
        this.scene.onBeforeRenderObservable.remove(observer);
        mesh.dispose();
      }
    }
    this.debugMovingBalls.clear();
    if (this.environmentRotationObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.environmentRotationObserver);
      this.environmentRotationObserver = null;
    }
    this.environmentRotationLastTimeMs = null;
    if (this.ropeObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.ropeObserver);
      this.ropeObserver = null;
    }
    // 兼容旧单绳子实现的清理
    this.ropeBallA?.dispose();
    this.ropeBallA = null;
    this.ropeBallB?.dispose();
    this.ropeBallB = null;
    this.ropeTube?.dispose();
    this.ropeTube = null;
    this.ropeMaterial?.dispose();
    this.ropeMaterial = null;
    this.ropeTexture?.dispose();
    this.ropeTexture = null;
    // 多根绳子统一清理
    for (const state of this.ropeStates.values()) {
      if (state.shapeType === 'tube') {
        state.tube.dispose();
        state.material.dispose();
        state.texture.dispose();
      } else {
        for (const face of Object.values(state.boxFaces)) {
          face.plane.dispose();
          face.material.dispose();
          face.texture.dispose();
        }
        state.boxRoot.dispose();
      }
    }
    this.ropeStates.clear();
    for (const state of this.flexibleRopesMap.values()) {
      state.pointMeshes.forEach((m) => m.dispose());
      state.tube.dispose();
      state.material.dispose();
      state.texture.dispose();
    }
    this.flexibleRopesMap.clear();
    if (this.underwaterPostProcess) {
      this.underwaterPostProcess.dispose();
      this.underwaterPostProcess = null;
    }
    if (this.underwaterAutoObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.underwaterAutoObserver);
      this.underwaterAutoObserver = null;
    }
    this.engine.dispose();
    if (this.skyObserver) {
      this.scene.onBeforeRenderObservable.remove(this.skyObserver);
      this.skyObserver = null;
    }
  }

  setAssetsLibrary(assets: AppAssets) {
    this.assets = assets;
  }

  /**
   * 按 demoConfig 的动画分割规则，生成“分段动画组”，并与未分割动画一并返回。
   *
   * - 只有当 modelName 命中 `animationSplitDemoConfig` 时才会生效
   * - 若某个源动画组命中 sources 配置，则会用 `AnimationGroup.ClipFrames` 生成 segments
   * - 默认不保留源动画组（keepSourceAnimation: false），以避免 UI 出现重复来源
   */
  private applyAnimationSplits(modelName: string, groups: AnimationGroup[]): AnimationGroup[] {
    const modelCfg: AnimationSplitModelConfig | undefined = animationSplitDemoConfig[modelName];
    if (!modelCfg || !groups.length) return groups;

    const out: AnimationGroup[] = [];

    groups.forEach((g, groupIndex) => {
      const matchedSources = (modelCfg.sources ?? []).filter((sourceCfg) => {
        const matchByIndex =
          typeof sourceCfg.sourceAnimationIndex === 'number' && sourceCfg.sourceAnimationIndex === groupIndex;
        const matchByNames =
          Array.isArray(sourceCfg.sourceAnimationNames) && sourceCfg.sourceAnimationNames.includes(g.name);
        return matchByIndex || matchByNames;
      });

      if (!matchedSources.length) {
        out.push(g);
        return;
      }

      const keepSourceAnimation = matchedSources.some((s) => !!s.keepSourceAnimation);
      if (keepSourceAnimation) {
        out.push(g);
      } else {
        // 源组不再加入 modelAnimationsMap，但仍在 scene 中；若不显式 stop，会与分段动画同时作用在骨骼上，
        // 表现为停不下、循环播放、play/stop 与进度条异常。
        g.stop();
        if (typeof g.from === 'number') {
          g.goToFrame(g.from);
        }
      }

      matchedSources.forEach((sourceCfg: AnimationSplitSourceConfig) => {
        (sourceCfg.segments ?? []).forEach((seg: AnimationSplitSegmentConfig) => {
          if (!seg || typeof seg.name !== 'string') return;

          const from = seg.from;
          let to = seg.to;
          // 支持 demoConfig：to=-1 表示裁剪到源动画组最后一帧
          if (to === -1) {
            if (typeof g.to !== 'number') return;
            to = g.to;
          }
          if (!Number.isFinite(from) || !Number.isFinite(to)) return;

          const fromFrame = Math.min(from, to);
          const toFrame = Math.max(from, to);

          // ClipFrames 会生成一个新的 AnimationGroup，只保留指定帧区间内的帧
          const clipped = AnimationGroup.ClipFrames(g, fromFrame, toFrame, seg.name);
          out.push(clipped);
        });
      });
    });

    return out;
  }

  /**
   * 从 GLB 或 FBX 地址加载模型并创建/复用场景，支持多个模型与动画控制。
   * @param modelUrl 模型完整 URL，支持 .glb / .gltf / .fbx
   * @param modelNameOrOnProgress 可选：模型名称（用于区分存储）或进度回调
   * @param onProgress 加载进度回调 0~1
   */
  async loadModelAndScene(
    modelUrl: string,
    modelNameOrOnProgress?: string | ((progress: number) => void),
    onProgress?: (progress: number) => void,
  ): Promise<Scene> {
    let modelName: string | undefined;
    let progressCb: ((progress: number) => void) | undefined = onProgress;

    if (typeof modelNameOrOnProgress === 'function') {
      progressCb = modelNameOrOnProgress;
    } else if (typeof modelNameOrOnProgress === 'string') {
      modelName = modelNameOrOnProgress;
    }
    console.log('test')
    const sceneJustCreated = !this.scene;
    const scene = this.scene ?? new Scene(this.engine);
    if (!this.scene) {
      this.scene = scene;
      scene.fogEnabled = false;

      const camera = new ArcRotateCamera(
        'camera',
        -Math.PI / 2,
        Math.PI / 2.5,
        15,
        Vector3.Zero(),
        scene,
      );
      // 默认相机位置 (0,0,0)，目标点 (0,0,15)，便于看到相机辅助线
      camera.target = new Vector3(0, 0, 0);
      camera.setPosition(new Vector3(-80, 10, 0));
      // 调整滚轮缩放比例（数值越大缩放越慢）
      camera.wheelPrecision = 10;
      // 调整右键拖动平移灵敏度（数值越小拖动同样距离移动越远）
      camera.panningSensibility = 400;
      camera.attachControl(this.canvas, true);
      camera.maxZ = 10000;
      camera.minZ = 0.1;
      scene.activeCamera = camera;
      this.registerCameraClickDebug();
      this.ensureSaturationPipeline();
    } else {
      // 复用已有场景时也确保已注册点击事件
      this.registerCameraClickDebug();
      this.ensureSaturationPipeline();
    }

    progressCb?.(0.1);
    const result = await ImportMeshAsync(modelUrl, scene, {
      onProgress: (event) => {
        if (event.lengthComputable && event.total) {
          progressCb?.(0.1 + (event.loaded / event.total) * 0.5);
        }
      },
    });
    progressCb?.(0.6);

    const finalModelName = modelName ?? this.getModelNameFromUrl(modelUrl);
    let groups = result.animationGroups ?? [];
    // 按配置对指定模型的动画组做“分段裁剪”，并与未分割动画一起存储
    groups = this.applyAnimationSplits(finalModelName, groups);

    // 加载完成后，默认不让任何动画自动播放，统一停止在起始帧
    if (groups.length) {
      groups.forEach((g) => {
        g.stop();
        // 将动画时间轴重置到 from 帧，避免停在中间位置
        if (typeof g.from === 'number') {
          g.goToFrame(g.from);
        }
      });
    }
    // 无论是否有动画组，都记录模型名称；没有动画则存空数组，方便在 UI 中按模型选择
    this.modelAnimationsMap.set(finalModelName, groups);
    console.log('modelAnimationsMap', this.modelAnimationsMap);
    if (result.meshes?.length) {
      const root = result.meshes[0];
      this.modelRootMap.set(finalModelName, root);
      const allNodes: Node[] = [];
      const visited = new Set<number>();
      const walk = (n: Node) => {
        const uid = (n as any)?.uniqueId;
        if (typeof uid === 'number') {
          if (visited.has(uid)) return;
          visited.add(uid);
        }
        allNodes.push(n);
        const children = n.getChildren();
        for (const c of children) walk(c);
      };
      walk(root);
      for (const node of allNodes) {
        const key = (node as any).name || (node as any).id;
        if (!key) continue;
        // 单层索引：同名覆盖
        this.modelNodesByNameMap.set(key, node);
      }
      // 重要：写入“模型名 -> root”别名，兼容外部用 modelName 直接查根节点
      this.modelNodesByNameMap.set(finalModelName, root);
    }
    this.currentModelName = finalModelName;
    this.modelAnimationGroups = groups;
    if (sceneJustCreated) {
      // this.setGround();
    }
    progressCb?.(1);
    return this.scene;
  }

  /** 从 URL 推断模型名称（去掉路径与扩展名） */
  private getModelNameFromUrl(url: string): string {
    const clean = url.split(/[?#]/)[0];
    const parts = clean.split(/[\\/]/);
    const filename = parts[parts.length - 1] || clean;
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt || filename;
  }

  /** 获取指定模型（或当前模型）的动画名称列表 */
  getAnimationNames(modelName?: string): string[] {
    const name = modelName ?? this.currentModelName;
    if (!name) return [];
    const groups = this.modelAnimationsMap.get(name) ?? [];
    return groups.map((g) => g.name);
  }

  /** 获取所有已加载的模型名称 */
  getModelNames(): string[] {
    return Array.from(this.modelAnimationsMap.keys());
  }

  /** 按名称（name/id/模型名别名）查找节点（Node），找不到返回 null */
  getNodeByModelAndName(modelName: string): Node | null {
    if (!modelName) return null;

    const cached = this.modelNodesByNameMap.get(modelName);
    if (cached) return cached;

    // 若缓存中没有，则遍历所有已加载模型 root 下的节点并写入单层索引（同名覆盖）
    const visited = new Set<number>();
    const stack: Node[] = [];
    for (const root of this.modelRootMap.values()) {
      stack.push(root);
    }

    while (stack.length) {
      const n = stack.pop()!;
      const uid = (n as any)?.uniqueId;
      if (typeof uid === 'number') {
        if (visited.has(uid)) continue;
        visited.add(uid);
      }

      const key = (n as any).name || (n as any).id;
      if (key) {
        this.modelNodesByNameMap.set(key, n);
        if (key === modelName) return n;
      }

      const children = n.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }

    return this.modelNodesByNameMap.get(modelName) ?? null;
  }

  /** 获取指定模型的根节点（用于信息牌挂接等），不存在则返回 null */
  getModelRootNode(modelName: string): AbstractMesh | null {
    return this.modelRootMap.get(modelName) ?? null;
  }

  /**
   * 调试：创建一个不断循环移动的小球（mesh），用于挂接信息牌测试样式与跟随效果。
   * @returns 返回该小球的 mesh.id（可直接用于 setInfoBoards 的 id）
   */
  createDebugMovingBall(options?: {
    /** 小球唯一名称（重复会复用并更新运动参数） */
    name?: string;
    /** 球直径（场景单位） */
    diameter?: number;
    /** 圆周运动半径（场景单位） */
    radius?: number;
    /** 圆心位置 */
    center?: Vector3;
    /** 运动速度（弧度/秒） */
    speed?: number;
    /** 高度（y）振幅 */
    yAmplitude?: number;
    /** 初始相位（弧度） */
    phase?: number;
  }): string | null {
    if (!this.scene) return null;
    const name = options?.name ?? 'debugMovingBall';
    const diameter = options?.diameter ?? 0.8;
    const radius = options?.radius ?? 6;
    const center = options?.center ?? new Vector3(0, 2, 0);
    const speed = options?.speed ?? 1.2;
    const yAmplitude = options?.yAmplitude ?? 0.6;
    const phase = options?.phase ?? 0;

    const existing = this.debugMovingBalls.get(name);
    if (existing) {
      // 更新运动逻辑：先移除旧 observer，再重新注册
      this.scene.onBeforeRenderObservable.remove(existing.observer);
      let t = phase;
      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        t += dt * speed;
        const x = center.x + Math.cos(t) * radius;
        const z = center.z + Math.sin(t) * radius;
        const y = center.y + Math.sin(t * 2.0) * yAmplitude;
        existing.mesh.position.set(x, y, z);
      });
      this.debugMovingBalls.set(name, { mesh: existing.mesh, observer: obs });
      return existing.mesh.id;
    }

    const mesh = MeshBuilder.CreateSphere(
        name,
        { diameter, segments: 16 },
        this.scene,
      );
    mesh.isPickable = false;
    mesh.renderingGroupId = 1;
    const mat = new PBRMaterial(`${name}Mat`, this.scene);
    mat.emissiveColor = new Color3(0.3, 0.8, 1);
    mat.albedoColor = new Color3(0.1, 0.2, 0.25);
    mat.metallic = 0.2;
    mat.roughness = 0.25;
    mesh.material = mat;

    let t = phase;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000;
      t += dt * speed;
      const x = center.x + Math.cos(t) * radius;
      const z = center.z + Math.sin(t) * radius;
      const y = center.y + Math.sin(t * 2.0) * yAmplitude;
      mesh.position.set(x, y, z);
    });
    this.debugMovingBalls.set(name, { mesh, observer });
    return mesh.id;
  }

  /** 调试：批量创建多个循环运动的小球（返回每个小球的 mesh.id） */
  createDebugMovingBalls(options?: {
    count?: number;
    diameter?: number;
    radius?: number;
    center?: Vector3;
    speed?: number;
    yAmplitude?: number;
    /** 名称前缀 */
    namePrefix?: string;
  }): string[] {
    const count = Math.max(1, Math.floor(options?.count ?? 5));
    const prefix = options?.namePrefix ?? 'debugMovingBall';
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.createDebugMovingBall({
        name: `${prefix}_${i}`,
        diameter: options?.diameter ?? 0.8,
        radius: options?.radius ?? 6,
        center: options?.center,
        speed: options?.speed ?? 1.2,
        yAmplitude: options?.yAmplitude ?? 0.6,
        phase: (Math.PI * 2 * i) / count,
      });
      if (id) ids.push(id);
    }
    return ids;
  }

  /**
   * 创建绳子 Demo：固定模型 A、可移动模型 B、中间带纹理的绳子。
   * A/B 可以是外部传入的任意 Mesh；若未传入则内部使用两个小球作为示例。
   * 本方法只负责初始化绳子与纹理，不做自动运动；后续通过 updateRopeDemoByAngleDistance 手动更新。
   */
  createRopeDemo(options?: {
    /** 绳子名称/标识；不传则默认使用 'default'，或回退到 meshBName / meshAName / 'default' */
    name?: string;
    /** 绳子纹理 URL，默认 /1712285623239_7670.jpeg（1600×1200） */
    textureUrl?: string;
    /** 纹理宽度（像素），用于与其它纹理统一缩放策略（可选） */
    textureWidthPx?: number;
    /** 纹理高度（像素），用于与其它纹理统一缩放策略（可选） */
    textureHeightPx?: number;
    /**
     * 固定端模型（A）的名称：将从本地已加载的模型数据中匹配模型根节点进行绑定。
     * 若找不到对应模型，则退回到内部创建的小球。
     */
    meshAName?: string;
    /**
     * 可移动端模型（B）的名称：将从本地已加载的模型数据中匹配模型根节点进行绑定。
     * 若找不到对应模型，则退回到内部创建的小球。
     */
    meshBName?: string;
    /** 初始 A 位置（仅在未传 meshA 时生效） */
    positionA?: Vector3;
    /** 初始 B 与 A 在水平面 XZ 上的距离（未传 meshB 时用于默认小球；与 updateRopeDemoByAngleDistance 的 distance 语义一致） */
    initialDistance?: number;
    /** 初始角度（度，绕 Y 轴，0 为 +X 方向，仅在未传 meshB 时生效） */
    initialAngleDeg?: number;
    /** 绳子半径（场景单位） */
    ropeRadius?: number;
    /** 绳子渲染形状：tube（旧版管状）/ box（长方体六面贴图） */
    ropeShapeType?: RopeDemoShapeType;
    /** box 截面宽（front/back 面的 world 宽；未传则回退到 ropeRadius*2） */
    boxWidth?: number;
    /** box 截面高（front/back 面的 world 高；未传则回退到 ropeRadius*2） */
    boxHeight?: number;
    /** 长方体：绕绳轴自身旋转（度） */
    boxSelfRotationDeg?: number;
    /** @deprecated 同 boxSelfRotationDeg */
    boxFlipAngleDeg?: number;
    /**
     * 长方体类型：六个面的贴图配置
     * - 缺省将回退到本方法的 textureUrl/textureWidthPx/textureHeightPx 作为默认贴图与像素尺寸
     */
    boxFaces?: Partial<Record<RopeBoxFaceName, Partial<RopeBoxFaceTextureConfig>>>;
  }): void {
    if (!this.scene) return;
    const textureUrl = options?.textureUrl ?? '/1712285623239_7670.jpeg';
    const ropeRadius = options?.ropeRadius ?? 0.12;
    this.ropeRadiusCurrent = ropeRadius;
    if (typeof options?.textureWidthPx === 'number') {
      this.ropeTextureWidthPx = options.textureWidthPx;
    }
    if (typeof options?.textureHeightPx === 'number') {
      this.ropeTextureHeightPx = options.textureHeightPx;
    }

    // 计算当前绳子的 key（名称），用于多绳子管理
    const ropeKey =
      options?.name ??
      options?.meshBName ??
      options?.meshAName ??
      'default';

    // 若已有同名绳子，先销毁旧的 Mesh/材质/纹理
    const existing = this.ropeStates.get(ropeKey);
    if (existing) {
      if (existing.shapeType === 'tube') {
        existing.tube.dispose();
        existing.material.dispose();
        existing.texture.dispose();
      } else {
        for (const face of Object.values(existing.boxFaces)) {
          face.plane.dispose();
          face.material.dispose();
          face.texture.dispose();
        }
        existing.boxRoot.dispose();
      }
      this.ropeStates.delete(ropeKey);
    }

    // 使用传入的模型名称作为 A/B；若未提供或未找到对应模型，则创建默认小球
    let ballA: TransformNode | null = null;
    let ballB: TransformNode | null = null;

    if (options?.meshAName) {
      const nodeA = this.getNodeByModelAndName(options.meshAName);
      // 允许 mesh / group（TransformNode），从而支持绑定到模型根节点或任意分组节点
      if (nodeA && nodeA instanceof TransformNode) {
        ballA = nodeA;
      }
    }

    if (options?.meshBName) {
      const nodeB = this.getNodeByModelAndName(options.meshBName);
      if (nodeB && nodeB instanceof TransformNode) {
        ballB = nodeB;
      }
    }

    const basePosA = options?.positionA ?? new Vector3(0, 4, 0);
    const initialDistance = Math.max(0.5, options?.initialDistance ?? 6);
    // 为了兼容旧的 initialAngleDeg，仅在未传 meshB 时用作水平角（pitch=0）
    const initialYawDeg = options?.initialAngleDeg ?? 0;
    const yawRad = (initialYawDeg * Math.PI) / 180;
    const dir = new Vector3(Math.cos(yawRad), 0, Math.sin(yawRad));
    const basePosB = basePosA.add(dir.scale(initialDistance));

    if (!ballA) {
      ballA = MeshBuilder.CreateSphere(
        'ropeBallA',
        { diameter: 0.8, segments: 16 },
        this.scene,
      );
      ballA.position.copyFrom(basePosA);
      // ballA 此处一定是 Mesh
      (ballA as Mesh).isPickable = false;
      const matA = new PBRMaterial('ropeBallAMat', this.scene);
      matA.albedoColor = new Color3(0.9, 0.25, 0.2);
      matA.emissiveColor = new Color3(0.15, 0, 0);
      (ballA as Mesh).material = matA;
    }

    if (!ballB) {
      ballB = MeshBuilder.CreateSphere(
        'ropeBallB',
        { diameter: 0.8, segments: 16 },
        this.scene,
      );
      ballB.position.copyFrom(basePosB);
      // ballB 此处一定是 Mesh
      (ballB as Mesh).isPickable = false;
      const matB = new PBRMaterial('ropeBallBMat', this.scene);
      matB.albedoColor = new Color3(0.2, 0.4, 0.9);
      matB.emissiveColor = new Color3(0, 0.1, 0.2);
      (ballB as Mesh).material = matB;
    }

    const ropeShapeType: RopeDemoShapeType = options?.ropeShapeType ?? 'tube';
    const boxSelfRotationDegInit =
      (typeof options?.boxSelfRotationDeg === 'number' && Number.isFinite(options.boxSelfRotationDeg)
        ? options.boxSelfRotationDeg
        : undefined) ??
      (typeof options?.boxFlipAngleDeg === 'number' && Number.isFinite(options.boxFlipAngleDeg)
        ? options.boxFlipAngleDeg
        : undefined) ??
      0;

    // 参考长度：以当前 A/B 位置距离为基准
    const posA = ballA.getAbsolutePosition();
    const posB = ballB.getAbsolutePosition();
    const initialLength = Vector3.Distance(posA, posB);
    this.ropeRefLength = Math.max(0.1, initialLength);
    this.ropeFlowOffset = 0;
    this.ropePhase = 0;
    this.ropePrevBPos.copyFrom(posB);

    if (ropeShapeType === 'box') {
      const boxDepthRef = this.ropeRefLength;
      const boxWidth =
        typeof options?.boxWidth === 'number' && Number.isFinite(options.boxWidth) ? options.boxWidth : ropeRadius * 2;
      const boxHeight =
        typeof options?.boxHeight === 'number' && Number.isFinite(options.boxHeight)
          ? options.boxHeight
          : ropeRadius * 2;
      const safeBoxWidth = Math.max(1e-6, boxWidth);
      const safeBoxHeight = Math.max(1e-6, boxHeight);
      const safeBoxDepthRef = Math.max(1e-6, boxDepthRef);

      const forwardInit = posB.subtract(posA);

      // boxRoot：锚定在 A 端世界坐标，本地 +Z 指向 B（与 tube 仅拉伸两端之间的几何一致，避免以中点为 pivot 时拉远整段沿绳平移、带俯仰时像“整体下沉”）
      const boxRoot = new TransformNode(`ropeBoxRoot_${ropeKey}`, this.scene);
      boxRoot.position.copyFrom(posA);
      boxRoot.rotationQuaternion = this.computeRopeBoxRotationQuaternion(forwardInit, boxSelfRotationDegInit);

      const faceNames: RopeBoxFaceName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
      const defaultWidthPx = this.ropeTextureWidthPx;
      const defaultHeightPx = this.ropeTextureHeightPx;

      const boxFaces = {} as Record<
        RopeBoxFaceName,
        {
          plane: Mesh;
          material: PBRMaterial;
          texture: Texture;
          textureWidthPx: number;
          textureHeightPx: number;
          uDependsOnLength: boolean;
          vDependsOnLength: boolean;
          pixelsPerWorld: number;
          uScaleRef: number;
          vScaleRef: number;
        }
      >;

      const resolveFaceTextureCfg = (
        faceName: RopeBoxFaceName,
      ): { textureUrl: string; textureWidthPx: number; textureHeightPx: number } => {
        const faceCfg = options?.boxFaces?.[faceName];
        const textureUrlResolved =
          typeof faceCfg?.textureUrl === 'string' && faceCfg.textureUrl.trim().length > 0
            ? faceCfg.textureUrl
            : textureUrl;
        const textureWidthResolvedRaw = faceCfg?.textureWidthPx;
        const textureWidthResolved =
          typeof textureWidthResolvedRaw === 'number' && Number.isFinite(textureWidthResolvedRaw)
            ? textureWidthResolvedRaw
            : defaultWidthPx;
        const textureHeightResolvedRaw = faceCfg?.textureHeightPx;
        const textureHeightResolved =
          typeof textureHeightResolvedRaw === 'number' && Number.isFinite(textureHeightResolvedRaw)
            ? textureHeightResolvedRaw
            : defaultHeightPx;

        return { textureUrl: textureUrlResolved, textureWidthPx: textureWidthResolved, textureHeightPx: textureHeightResolved };
      };

      const createFacePlane = (
        faceName: RopeBoxFaceName,
      ): {
        plane: Mesh;
        material: PBRMaterial;
        texture: Texture;
        uDependsOnLength: boolean;
        vDependsOnLength: boolean;
        uScaleRef: number;
        vScaleRef: number;
        pixelsPerWorld: number;
      } => {
        const { textureUrl: faceTextureUrl, textureWidthPx, textureHeightPx } = resolveFaceTextureCfg(faceName);
        const tex = new Texture(faceTextureUrl, this.scene, false, false);
        tex.wrapU = Texture.WRAP_ADDRESSMODE;
        tex.wrapV = Texture.WRAP_ADDRESSMODE;

        const mat = new PBRMaterial(`ropeBox_${ropeKey}_${faceName}_mat`, this.scene);
        mat.albedoTexture = tex;
        mat.roughness = 1;
        mat.metallic = 0;
        mat.backFaceCulling = false;

        // 不同面：其 UV 轴对应的世界尺寸不同
        // - right/left：u 对应长度（depth），v 对应高度（height）
        // - top/bottom：u 对应宽度（width），v 对应长度（depth）
        // - front/back：u 对应宽度（width），v 对应高度（height）
        const uDependsOnLength = faceName === 'right' || faceName === 'left';
        const vDependsOnLength = faceName === 'top' || faceName === 'bottom';

        const worldURef = uDependsOnLength ? safeBoxDepthRef : safeBoxWidth;
        const worldVRef = vDependsOnLength ? safeBoxDepthRef : safeBoxHeight;

        // 选择“等密度”的像素密度常量：保证 u/v 方向的 texel 在世界空间里呈等比（不拉伸观感）
        const pixelsPerWorld =
          Math.sqrt(
            (Math.max(1, textureWidthPx) / Math.max(1e-6, worldURef)) *
              (Math.max(1, textureHeightPx) / Math.max(1e-6, worldVRef)),
          ) || 1;

        const uScaleRef = (pixelsPerWorld * worldURef) / Math.max(1, textureWidthPx);
        const vScaleRef = (pixelsPerWorld * worldVRef) / Math.max(1, textureHeightPx);
        tex.uScale = uScaleRef;
        tex.vScale = vScaleRef;

        let plane: Mesh;
        // 原点锚在 A：back 在 z=0，front 在 z=depth，侧面/顶底在 z=depth/2（与 update 中伸缩逻辑一致）
        if (faceName === 'front') {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_front`,
            { width: safeBoxWidth, height: safeBoxHeight },
            this.scene,
          );
          plane.position.z = safeBoxDepthRef;
        } else if (faceName === 'back') {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_back`,
            { width: safeBoxWidth, height: safeBoxHeight },
            this.scene,
          );
          plane.position.z = 0;
          plane.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI);
        } else if (faceName === 'right') {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_right`,
            { width: safeBoxDepthRef, height: safeBoxHeight },
            this.scene,
          );
          plane.position.x = safeBoxWidth / 2;
          plane.position.z = safeBoxDepthRef / 2;
          plane.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI / 2);
        } else if (faceName === 'left') {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_left`,
            { width: safeBoxDepthRef, height: safeBoxHeight },
            this.scene,
          );
          plane.position.x = -safeBoxWidth / 2;
          plane.position.z = safeBoxDepthRef / 2;
          plane.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), -Math.PI / 2);
        } else if (faceName === 'top') {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_top`,
            { width: safeBoxWidth, height: safeBoxDepthRef },
            this.scene,
          );
          plane.position.y = safeBoxHeight / 2;
          plane.position.z = safeBoxDepthRef / 2;
          plane.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), -Math.PI / 2);
        } else {
          plane = MeshBuilder.CreatePlane(
            `ropeBox_${ropeKey}_bottom`,
            { width: safeBoxWidth, height: safeBoxDepthRef },
            this.scene,
          );
          plane.position.y = -safeBoxHeight / 2;
          plane.position.z = safeBoxDepthRef / 2;
          plane.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2);
        }

        plane.parent = boxRoot;
        plane.material = mat;
        plane.isPickable = false;

        return {
          plane,
          material: mat,
          texture: tex,
          uDependsOnLength,
          vDependsOnLength,
          uScaleRef,
          vScaleRef,
          pixelsPerWorld,
        };
      };

      for (const faceName of faceNames) {
        const {
          plane,
          material,
          texture,
          uDependsOnLength,
          vDependsOnLength,
          uScaleRef,
          vScaleRef,
          pixelsPerWorld,
        } = createFacePlane(faceName);
        const { textureWidthPx, textureHeightPx } = resolveFaceTextureCfg(faceName);
        boxFaces[faceName] = {
          plane,
          material,
          texture,
          textureWidthPx,
          textureHeightPx,
          uDependsOnLength,
          vDependsOnLength,
          pixelsPerWorld,
          uScaleRef,
          vScaleRef,
        };
      }

      // 保存到多绳子状态表
      this.ropeStates.set(ropeKey, {
        shapeType: 'box',
        name: ropeKey,
        meshA: ballA,
        meshB: ballB,
        boxRoot,
        boxDepthRef: safeBoxDepthRef,
        boxWidth: safeBoxWidth,
        boxHeight: safeBoxHeight,
        boxSelfRotationDeg: boxSelfRotationDegInit,
        boxFaces,
        refLength: this.ropeRefLength,
        radius: ropeRadius,
      });

      return;
    }

    // tube：原有管状绳子逻辑（保持旧行为）
    // 绳子贴图 + PBR 材质
    const ropeTex = new Texture(textureUrl, this.scene, false, false);
    ropeTex.wrapU = Texture.WRAP_ADDRESSMODE;
    ropeTex.wrapV = Texture.WRAP_ADDRESSMODE;
    const ropeMat = new PBRMaterial('ropeMat', this.scene);
    ropeMat.albedoTexture = ropeTex;
    ropeMat.roughness = 1;
    ropeMat.metallic = 0;

    const pathPoints = [posA.clone(), posB.clone()];
    const ropeTube = MeshBuilder.CreateTube(
      'ropeTube',
      {
        path: pathPoints,
        radius: ropeRadius,
        tessellation: 8,
        cap: Mesh.CAP_ALL,
      },
      this.scene,
    );
    ropeTube.material = ropeMat;
    ropeTube.isPickable = false;

    // 保存到多绳子状态表
    const textureWidthPxTube = this.ropeTextureWidthPx;
    const textureHeightPxTube = this.ropeTextureHeightPx;
    this.ropeStates.set(ropeKey, {
      shapeType: 'tube',
      name: ropeKey,
      meshA: ballA,
      meshB: ballB,
      tube: ropeTube,
      material: ropeMat,
      texture: ropeTex,
      refLength: this.ropeRefLength,
      radius: ropeRadius,
      textureWidthPx: textureWidthPxTube,
      textureHeightPx: textureHeightPxTube,
    });

    // 兼容旧字段（默认绳子），便于老代码仍可工作
    if (ropeKey === 'default' && !options?.name && !options?.meshBName && !options?.meshAName) {
      // 旧字段类型为 Mesh，仅当 A/B 确实为 Mesh 时才回填（若绑定到 group/TransformNode，则旧接口不适用）
      this.ropeBallA = ballA instanceof Mesh ? ballA : null;
      this.ropeBallB = ballB instanceof Mesh ? ballB : null;
      this.ropeTube = ropeTube;
      this.ropeMaterial = ropeMat;
      this.ropeTexture = ropeTex;
    }

    // 管状：按 textureWidthPx / textureHeightPx / ropeRadius / 绳长 保持截面与轴向 texel 比例（与柔性绳一致）
    this.applyFlexibleRopeTubeTextureScale(
      ropeTex,
      initialLength,
      textureWidthPxTube,
      textureHeightPxTube,
      ropeRadius,
    );
  }

  /**
   * 计算绳子 Demo B 端目标世界坐标（tube / box 共用球坐标）。
   * - distance：A→B 三维直线长度（绳长）；pitch=0 时其在 XZ 上的投影长度等于该值。
   * - pitch：相对水平面仰角（向上为正），与 yaw 组合可在竖直方向转满 360°。
   */
  private computeRopeDemoTargetWorldPosB(
    posA: Vector3,
    distance: number,
    yawDeg: number,
    pitchDeg: number,
  ): Vector3 {
    const yawRad = (yawDeg * Math.PI) / 180;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const d = Math.max(1e-6, distance);
    const dir = new Vector3(
      Math.cos(yawRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      Math.sin(yawRad) * Math.cos(pitchRad),
    );
    return posA.add(dir.scale(d));
  }

  /**
   * 计算 box 绳子的朝向：本地 +Z 对齐 A->B，并可绕前向滚转。
   * 使用 FromUnitVectors(本地 +Z → forward) 得到最短旋转，避免用世界 Up 叉乘 forward 时在俯仰变化时产生绕绳扭转（观感像自转）。
   */
  private computeRopeBoxRotationQuaternion(forward: Vector3, rollAngleDeg: number): Quaternion {
    const f = forward.clone();
    const fLen = f.length();
    if (fLen < 1e-6) {
      f.set(0, 0, 1);
    } else {
      f.scaleInPlace(1 / fLen);
    }

    const localZ = new Vector3(0, 0, 1);
    const qAlign = new Quaternion();
    Quaternion.FromUnitVectorsToRef(localZ, f, qAlign);

    const rollRad = (rollAngleDeg * Math.PI) / 180;
    if (Math.abs(rollRad) < 1e-10) {
      return qAlign;
    }

    const qRoll = Quaternion.RotationAxis(f, rollRad);
    return qRoll.multiply(qAlign);
  }

  /** 确保 rope demo 的控制目标在每帧都能保持“B 在绳子末端”。 */
  private ensureRopeDemoLiveSyncObserver(): void {
    if (!this.scene || this.ropeObserver) return;
    this.ropeObserver = this.scene.onBeforeRenderObservable.add(() => {
      for (const s of this.ropeStates.values()) {
        const c = s.liveControl;
        if (!c) continue;
        this.updateRopeDemoByAngleDistance(
          s.name,
          c.distance,
          c.yawDeg,
          c.pitchDeg,
          c.boxSelfRotationDeg,
        );
      }
    });
  }

  /**
   * 手动更新绳子 Demo：根据距离和三维角度更新 B 的位置与绳子形状/纹理。
   * - tube / box：distance 均为 A→B 三维直线长度；pitch 为球坐标仰角（竖直方向可 360°）。
   * - yawDeg：绕 Y 轴的水平角度（度），0 表示从 A 指向 +X，正角度沿 +Z 旋转，可 0~360。
   * - boxSelfRotationDeg：仅 box 有效，绕绳轴（A→B）自身旋转（度）；tube 忽略。
   */
  updateRopeDemoByAngleDistance(
    name: string,
    distance: number,
    yawDeg: number,
    pitchDeg = 0,
    boxSelfRotationDeg?: number,
  ): void {
    if (!this.scene) return;

    // 优先按 name 在多绳子表中查找（通常为“模型名称”或“绳子名称”）
    let state = this.ropeStates.get(name);

    // 若未找到，尝试以“模型名称”匹配 B 端模型
    if (!state) {
      const targetMesh = this.getNodeByModelAndName(name) as any;
      if (targetMesh) {
        for (const s of this.ropeStates.values()) {
          if (s.meshB === targetMesh) {
            state = s;
            break;
          }
        }
      }
    }

    // 兼容旧实现：若仍未找到且存在默认单绳子，则用旧字段更新
    if (!state) {
      if (!this.ropeBallA || !this.ropeBallB || !this.ropeTexture) return;

      const distFallback = Math.max(0.01, distance);
      const posAFallback = this.ropeBallA.getAbsolutePosition().clone();
      const posBFallback = this.computeRopeDemoTargetWorldPosB(
        posAFallback,
        distFallback,
        yawDeg,
        pitchDeg,
      );

      this.ropeBallB.setAbsolutePosition(posBFallback);
      this.ropePrevBPos.copyFrom(posBFallback);

      const lengthFallback = Vector3.Distance(posAFallback, posBFallback);
      this.applyFlexibleRopeTubeTextureScale(
        this.ropeTexture,
        lengthFallback,
        this.ropeTextureWidthPx,
        this.ropeTextureHeightPx,
        this.ropeRadiusCurrent,
      );

      if (this.ropeTube) {
        this.ropeTube.dispose();
        this.ropeTube = null;
      }

      const pathFallback = [posAFallback.clone(), posBFallback.clone()];
      const ropeTubeFallback = MeshBuilder.CreateTube(
        'ropeTube',
        {
          path: pathFallback,
          radius: this.ropeRadiusCurrent,
          tessellation: 8,
          cap: Mesh.CAP_ALL,
        },
        this.scene,
      );
      ropeTubeFallback.material = this.ropeMaterial;
      ropeTubeFallback.isPickable = false;
      this.ropeTube = ropeTubeFallback;
      return;
    }

    // 记录控制参数，并启用每帧同步，避免 B 被动画/父节点联动拉离绳子末端。
    if (state.shapeType === 'box') {
      if (typeof boxSelfRotationDeg === 'number' && Number.isFinite(boxSelfRotationDeg)) {
        state.boxSelfRotationDeg = boxSelfRotationDeg;
      }
    }
    state.liveControl = {
      distance,
      yawDeg,
      pitchDeg,
      ...(state.shapeType === 'box' ? { boxSelfRotationDeg: state.boxSelfRotationDeg } : {}),
    };
    this.ensureRopeDemoLiveSyncObserver();

    const dist = Math.max(0.01, distance);

    // 若 A/B 存在父子链联动，单次修正会在 distance 变大时累积误差。
    // 这里做少量迭代收敛，确保 B 的最终世界坐标与由“当前 A + 参数”计算的目标一致。
    let targetPosB = Vector3.Zero();
    const maxIter = 4;
    for (let i = 0; i < maxIter; i++) {
      const posACurrent = state.meshA.getAbsolutePosition().clone();
      targetPosB = this.computeRopeDemoTargetWorldPosB(
        posACurrent,
        dist,
        yawDeg,
        pitchDeg,
      );
      // 注意：targetPosB 是世界坐标；若 meshB 有 parent（group），直接写 position 会当成局部坐标导致偏移。
      state.meshB.setAbsolutePosition(targetPosB);
      // 强制刷新父链世界矩阵，避免下一轮读取到脏的 absolutePosition。
      state.meshB.computeWorldMatrix(true);
      state.meshA.computeWorldMatrix(true);

      const posANext = state.meshA.getAbsolutePosition().clone();
      const targetNext = this.computeRopeDemoTargetWorldPosB(
        posANext,
        dist,
        yawDeg,
        pitchDeg,
      );
      if (Vector3.Distance(targetNext, targetPosB) <= 1e-4) {
        targetPosB = targetNext;
        state.meshB.setAbsolutePosition(targetPosB);
        state.meshB.computeWorldMatrix(true);
        break;
      }
    }

    // 兜底：确保 B 在本次更新结束时精确落到最终目标点。
    state.meshB.setAbsolutePosition(targetPosB);
    state.meshB.computeWorldMatrix(true);
    // B 移动后父链/子节点世界矩阵会失效；必须重新 compute 后再读 A/B，否则 A 端可能仍为脏数据，
    // box 会用错误的 posA 算中点/朝向，伸缩时出现整根绳子上下漂移。
    const posA = state.meshA.getAbsolutePosition().clone();
    // 使用 meshB 的实时世界坐标作为绳子末端，确保模型与末端绝对一致。
    const posB = state.meshB.getAbsolutePosition().clone();
    this.ropePrevBPos.copyFrom(posB);

    const length = Vector3.Distance(posA, posB);
    if (state.shapeType === 'box') {
      const boxRoot = state.boxRoot;
      const depthRef = Math.max(1e-6, state.boxDepthRef);
      const depthRatio = length / depthRef;

      // 更新 boxRoot：本地 +Z 对齐 A->B
      const forward = posB.subtract(posA);

      // 与 create 一致：根节点在 A，仅向 +Z（B）方向延伸，拉远时不再随中点漂移
      boxRoot.position.copyFrom(posA);
      boxRoot.rotationQuaternion = this.computeRopeBoxRotationQuaternion(forward, state.boxSelfRotationDeg);

      // 前后端面 + 侧面/顶底 的 z（原点= A）
      state.boxFaces.front.plane.position.z = length;
      state.boxFaces.back.plane.position.z = 0;
      const hz = length / 2;
      state.boxFaces.right.plane.position.z = hz;
      state.boxFaces.left.plane.position.z = hz;
      state.boxFaces.top.plane.position.z = hz;
      state.boxFaces.bottom.plane.position.z = hz;

      // 更新侧面：通过缩放长度方向实现“伸缩不形变”
      state.boxFaces.right.plane.scaling.x = depthRatio;
      state.boxFaces.right.plane.scaling.y = 1;
      state.boxFaces.right.plane.scaling.z = 1;
      state.boxFaces.left.plane.scaling.x = depthRatio;
      state.boxFaces.left.plane.scaling.y = 1;
      state.boxFaces.left.plane.scaling.z = 1;

      state.boxFaces.top.plane.scaling.y = depthRatio;
      state.boxFaces.top.plane.scaling.x = 1;
      state.boxFaces.top.plane.scaling.z = 1;
      state.boxFaces.bottom.plane.scaling.y = depthRatio;
      state.boxFaces.bottom.plane.scaling.x = 1;
      state.boxFaces.bottom.plane.scaling.z = 1;

      // 更新每个面的纹理 u/v：长度方向使用 clamp，确保不缩小导致纹理被“拉伸”
      for (const faceName of Object.keys(state.boxFaces) as RopeBoxFaceName[]) {
        const face = state.boxFaces[faceName];
        const worldU = face.uDependsOnLength ? length : state.boxWidth;
        const worldV = face.vDependsOnLength ? length : state.boxHeight;

        // 按“当前面世界宽高 + 配置纹理像素尺寸”计算 u/v 平铺次数
        // 这样随绳子伸缩变化时，纹理只会重复，不会出现非等比拉伸观感。
        const uScale = (face.pixelsPerWorld * worldU) / Math.max(1, face.textureWidthPx);
        const vScale = (face.pixelsPerWorld * worldV) / Math.max(1, face.textureHeightPx);

        face.texture.uScale = uScale;
        face.texture.vScale = vScale;
        face.texture.vOffset = 0;
      }

      // 以 box 几何自身的末端点为准，反向吸附 B，确保 modelBName 始终锁在绳子末端。
      // 这一步可消除“box 伸缩时 B 端模型逐渐漂离末端”的误差累积。
      boxRoot.computeWorldMatrix(true);
      const boxEndWorld = new Vector3(0, 0, length);
      Vector3.TransformCoordinatesToRef(boxEndWorld, boxRoot.getWorldMatrix(), boxEndWorld);
      state.meshB.setAbsolutePosition(boxEndWorld);
      state.meshB.computeWorldMatrix(true);

      return;
    }

    // tube：与柔性绳相同的管状纹理缩放（textureWidthPx / textureHeightPx / radius / 绳长）
    // 重建 Tube
    state.tube.dispose();
    const path = [posA.clone(), posB.clone()];
    const ropeTube = MeshBuilder.CreateTube(
      state.tube.name,
      {
        path,
        radius: state.radius ?? this.ropeRadiusCurrent,
        tessellation: 8,
        cap: Mesh.CAP_ALL,
      },
      this.scene,
    );
    ropeTube.material = state.material;
    ropeTube.isPickable = false;
    (state as { tube: Mesh }).tube = ropeTube;

    this.applyFlexibleRopeTubeTextureScale(
      state.texture,
      length,
      state.textureWidthPx,
      state.textureHeightPx,
      state.radius ?? this.ropeRadiusCurrent,
    );
  }

  /**
   * 创建多根柔性绳子。数据格式见 FlexibleRopeCreateItem，支持 message 通信时 type: 'flexibleRopeCreate', data: items。
   */
  createFlexibleRopes(items: FlexibleRopeCreateItem[]): void {
    if (!this.scene || !Array.isArray(items)) return;
    const textureUrlDefault = '/1712285623239_7670.jpeg';
    const textureWidthDefault = 1600;
    const textureHeightDefault = 1200;

    for (const item of items) {
      const id = item?.id;
      if (id == null || typeof id !== 'string') continue;

      const ropeRadiusRaw = item?.ropeRadius;
      const ropeRadius =
        (typeof ropeRadiusRaw === 'number' && Number.isFinite(ropeRadiusRaw) ? ropeRadiusRaw : undefined) ||
        (typeof ropeRadiusRaw === 'string' &&
          ropeRadiusRaw.trim().length > 0 &&
          Number.isFinite(Number(ropeRadiusRaw))
          ? Number(ropeRadiusRaw)
          : undefined) ||
        this.flexibleRopeRadius;

      const textureUrl =
        typeof item?.textureUrl === 'string' && item.textureUrl.trim().length > 0
          ? item.textureUrl
          : textureUrlDefault;

      const textureWidthRaw = item?.textureWidthPx;
      const textureWidthPx =
        (typeof textureWidthRaw === 'number' && Number.isFinite(textureWidthRaw)
          ? textureWidthRaw
          : undefined) ?? textureWidthDefault;

      const textureHeightRaw = item?.textureHeightPx;
      const textureHeightPx =
        (typeof textureHeightRaw === 'number' && Number.isFinite(textureHeightRaw)
          ? textureHeightRaw
          : undefined) ?? textureHeightDefault;

      const startRaw = item.start;
      const endRaw = item.end;
      const lengthArr = Array.isArray(item.length) ? item.length : [];
      const distancesRaw = lengthArr.map((l) =>
        Math.max(0, Number.isFinite(l?.distance) ? Number(l!.distance) : 0),
      );
      const pointIds = lengthArr.map((l) => (l?.id != null ? String(l.id) : ''));
      const pointCount = distancesRaw.length;
      if (pointCount === 0) continue;

      const maxDistance = Math.max(0.1, ...distancesRaw);
      const hasAngle = typeof item.angle === 'number' && Number.isFinite(item.angle);
      const angleDeg = hasAngle ? Number(item.angle) : 0;
      const hasPitch = typeof item.pitch === 'number' && Number.isFinite(item.pitch);
      const pitchDeg = hasPitch ? Number(item.pitch) : 0;

      let startNode: TransformNode | null = null;
      let start = new Vector3(0, 0, 0);
      let end = new Vector3(0, 0, 0);

      const dirFromYawPitch = (yaw: number, pitch: number) => {
        const yawRad = (yaw * Math.PI) / 180;
        const pitchRad = (pitch * Math.PI) / 180;
        const cosPitch = Math.cos(pitchRad);
        return new Vector3(
          cosPitch * Math.cos(yawRad),
          Math.sin(pitchRad),
          cosPitch * Math.sin(yawRad),
        );
      };

      // start 为“模型名称”：通过名称查找模型节点作为起点，并根据 angle+pitch 推导终点
      if (typeof startRaw === 'string') {
        const node = this.getNodeByModelAndName(startRaw);
        if (node && node instanceof TransformNode) {
          startNode = node;
          start.copyFrom(node.getAbsolutePosition());
        } else {
          start.set(0, 0, 0);
        }
        const dir = dirFromYawPitch(angleDeg, pitchDeg);
        end = start.add(dir.scale(maxDistance));
      } else if (
        startRaw &&
        typeof (startRaw as any).x === 'number' &&
        typeof (startRaw as any).y === 'number' &&
        typeof (startRaw as any).z === 'number' &&
        endRaw &&
        typeof (endRaw as any).x === 'number' &&
        typeof (endRaw as any).y === 'number' &&
        typeof (endRaw as any).z === 'number'
      ) {
        // 兼容旧数据：start/end 均为显式坐标
        start = new Vector3((startRaw as any).x, (startRaw as any).y, (startRaw as any).z);
        end = new Vector3((endRaw as any).x, (endRaw as any).y, (endRaw as any).z);
        if (hasAngle) {
          // 旧语义：绕起点终点中点做整体旋转
          const center = start.add(end).scale(0.5);
          const angleRad = (angleDeg * Math.PI) / 180;
          const c = Math.cos(angleRad);
          const s = Math.sin(angleRad);
          const toStart = start.subtract(center);
          const toEnd = end.subtract(center);
          start = center.add(
            new Vector3(
              toStart.x * c - toStart.z * s,
              toStart.y,
              toStart.x * s + toStart.z * c,
            ),
          );
          end = center.add(
            new Vector3(toEnd.x * c - toEnd.z * s, toEnd.y, toEnd.x * s + toEnd.z * c),
          );
        }
      } else {
        // 数据不完整
        continue;
      }

      const baseLength = Vector3.Distance(start, end);
      const distances = distancesRaw.map((d) => Math.max(0, Math.min(baseLength, d)));

      // 若已存在同 id 绳子，先销毁
      const existing = this.flexibleRopesMap.get(id);
      if (existing) {
        if ((existing as any).followObserver && this.scene) {
          this.scene.onBeforeRenderObservable.remove((existing as any).followObserver);
        }
        existing.pointMeshes.forEach((m) => m.dispose());
        existing.tube.dispose();
        existing.material.dispose();
        existing.texture.dispose();
        this.flexibleRopesMap.delete(id);
      }

      const ropeTex = new Texture(textureUrl, this.scene, false, false);
      ropeTex.wrapU = Texture.WRAP_ADDRESSMODE;
      ropeTex.wrapV = Texture.WRAP_ADDRESSMODE;
      const ropeMat = new PBRMaterial(`flexRopeMat_${id}`, this.scene);
      ropeMat.albedoTexture = ropeTex;
      ropeMat.roughness = 1;
      ropeMat.metallic = 0;

      const dirBase = end.subtract(start);
      const len = dirBase.length();
      const tangent = len > 1e-4 ? dirBase.normalize() : new Vector3(1, 0, 0);
      const up = Vector3.Up();
      let normal = Vector3.Cross(up, tangent);
      if (normal.lengthSquared() < 1e-4) normal = new Vector3(0, 0, 1);
      normal.normalize();

      const pointMeshes: Mesh[] = [];
      const midPoints: Vector3[] = [];
      for (let i = 0; i < pointCount; i++) {
        const d = Math.max(0, Math.min(len, distances[i]));
        const basePos = start.add(tangent.scale(d));
        midPoints.push(basePos.clone());
        const pid = pointIds[i] || `point_${i}`;
        const sphere = MeshBuilder.CreateSphere(
          `flexRope_${id}_${pid}`,
          { diameter: 0.5, segments: 12 },
          this.scene,
        );
        sphere.id = pid;
        sphere.position.copyFrom(basePos);
        sphere.isPickable = false;
        const matPoint = new PBRMaterial(`flexRopePointMat_${id}_${i}`, this.scene);
        matPoint.albedoColor = new Color3(0.9, 0.8, 0.3);
        matPoint.emissiveColor = new Color3(0.2, 0.18, 0.06);
        matPoint.roughness = 0.3;
        matPoint.metallic = 0.1;
        sphere.material = matPoint;
        sphere.setEnabled(false); // 控制点小球默认隐藏，可通过 setFlexibleRopePointsVisible 切换
        pointMeshes.push(sphere);
      }

      const controlPoints = [start.clone(), ...midPoints.map((p) => p.clone()), end.clone()];
      const curve = Curve3.CreateCatmullRomSpline(controlPoints, 20, false);
      const path = curve.getPoints();
      let totalLen = 0;
      for (let i = 1; i < path.length; i++) {
        totalLen += Vector3.Distance(path[i - 1], path[i]);
      }
      const refLength = Math.max(0.1, totalLen);
      const tube = MeshBuilder.CreateTube(
        `flexRopeTube_${id}`,
        {
          path,
          radius: ropeRadius,
          tessellation: 8,
          cap: Mesh.CAP_ALL,
          updatable: true,
        } as any,
        this.scene,
      );
      tube.material = ropeMat;
      tube.isPickable = false;

      // 与 updateSingleFlexibleRope 中一致：按 textureWidthPx / textureHeightPx / ropeRadius / 绳长 保持表面 texel 不拉伸
      this.applyFlexibleRopeTubeTextureScale(
        ropeTex,
        totalLen,
        textureWidthPx,
        textureHeightPx,
        ropeRadius,
      );

      this.flexibleRopesMap.set(id, {
        id,
        start: start.clone(),
        end: end.clone(),
        distances,
        pointIds,
        pointMeshes,
        tube,
        refLength,
        pointYawDegs: new Array(pointCount).fill(0),
        pointPitchDegs: new Array(pointCount).fill(0),
        textureWidthPx,
        textureHeightPx,
        radius: ropeRadius,
        material: ropeMat,
        texture: ropeTex,
        // 跟随模式（start 为模型名称时启用）
        startModelName: typeof startRaw === 'string' ? startRaw : undefined,
        angleDeg,
        pitchDeg,
        startNode,
        followObserver: null,
      });

      // 若配置为“跟随模型起点”，则每帧根据模型位置与 angle 更新 start/end 并刷新绳子
      const state = this.flexibleRopesMap.get(id) as any;
      if (state?.startModelName && this.scene) {
        state.followObserver = this.scene.onBeforeRenderObservable.add(() => {
          if (!this.scene) return;
          if (!state.startNode) {
            const n = this.getNodeByModelAndName(state.startModelName);
            if (n && n instanceof TransformNode) state.startNode = n;
          }
          const nodePos = state.startNode
            ? (state.startNode as TransformNode).getAbsolutePosition()
            : null;
          if (!nodePos) return;

          const yaw = Number(state.angleDeg ?? 0);
          const pitch = Number(state.pitchDeg ?? 0);
          const yawRad = (yaw * Math.PI) / 180;
          const pitchRad = (pitch * Math.PI) / 180;
          const cosPitch = Math.cos(pitchRad);
          const dir = new Vector3(
            cosPitch * Math.cos(yawRad),
            Math.sin(pitchRad),
            cosPitch * Math.sin(yawRad),
          );
          const ropeLen = Math.max(0.1, ...state.distances);
          const nextStart = nodePos.clone();
          const nextEnd = nextStart.add(dir.scale(ropeLen));

          // 只有起点/终点发生变化时才更新，避免每帧重建
          const eps = 1e-6;
          const ds = Vector3.DistanceSquared(state.start, nextStart);
          const de = Vector3.DistanceSquared(state.end, nextEnd);
          if (ds > eps || de > eps) {
            state.start.copyFrom(nextStart);
            state.end.copyFrom(nextEnd);
            this.updateSingleFlexibleRope(state);
          }
        });
      }
    }

    this.refreshAllFlexibleRopeInfoBoards();
  }

  /**
   * 更新指定绳子的连接点角度。数据格式见 FlexibleRopeUpdatePayload，支持 message 时 type: 'flexibleRopeUpdate', data: payload。
   */
  updateFlexibleRopePoints(payload: FlexibleRopeUpdatePayload): void {
    if (!this.scene || !payload?.parentId) return;
    const state = this.flexibleRopesMap.get(payload.parentId);
    if (!state) return;
    const lengthArr = Array.isArray(payload.length) ? payload.length : [];
    const idToIndex = new Map(state.pointIds.map((pid, i) => [pid, i]));
    for (const item of lengthArr) {
      const idx = item?.id != null ? idToIndex.get(String(item.id)) : undefined;
      if (idx === undefined) continue;

      const yaw = typeof item?.yaw === 'number' && Number.isFinite(item.yaw) ? item.yaw : undefined;
      const pitch =
        typeof item?.pitch === 'number' && Number.isFinite(item.pitch) ? item.pitch : undefined;
      const legacyAngle =
        typeof item?.angle === 'number' && Number.isFinite(item.angle) ? item.angle : undefined;

      // 兼容：仅传 angle 时映射成 pitch=angle、yaw=0
      if (yaw === undefined && pitch === undefined && legacyAngle !== undefined) {
        state.pointYawDegs[idx] = 0;
        state.pointPitchDegs[idx] = legacyAngle;
        continue;
      }

      if (yaw !== undefined) state.pointYawDegs[idx] = yaw;
      if (pitch !== undefined) state.pointPitchDegs[idx] = pitch;
    }
    this.updateSingleFlexibleRope(state);
    this.refreshAllFlexibleRopeInfoBoards();
  }

  /**
   * 更新指定柔性绳子的整体方向（水平角 yaw + 俯仰角 pitch）。
   * 仅当绳子为“跟随模型”模式时生效，会据此重算终点并刷新形状。
   */
  updateFlexibleRopeDirection(ropeId: string, yawDeg: number, pitchDeg: number): void {
    if (!this.scene) return;
    const state = this.flexibleRopesMap.get(ropeId);
    if (!state || !state.startModelName) return;
    state.angleDeg = yawDeg;
    state.pitchDeg = pitchDeg;
    const ropeLen = Math.max(0.1, ...state.distances);
    const yawRad = (yawDeg * Math.PI) / 180;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const cosPitch = Math.cos(pitchRad);
    const dir = new Vector3(
      cosPitch * Math.cos(yawRad),
      Math.sin(pitchRad),
      cosPitch * Math.sin(yawRad),
    );
    state.end.copyFrom(state.start).addInPlace(dir.scale(ropeLen));
    this.updateSingleFlexibleRope(state);
    this.refreshAllFlexibleRopeInfoBoards();
  }

  /** 获取指定绳子当前整体方向（yaw / pitch，度） */
  getFlexibleRopeDirection(ropeId: string): { yaw: number; pitch: number } | null {
    const state = this.flexibleRopesMap.get(ropeId);
    if (!state) return null;
    return {
      yaw: state.angleDeg ?? 0,
      pitch: state.pitchDeg ?? 0,
    };
  }

  /**
   * 获取指定绳子的每个控制点偏移（度），顺序与创建时 length[].id 一致。
   * - yaw：水平偏移（绕绳子基线的“横向旋转”）
   * - pitch：俯仰偏移（控制偏移幅度与正负）
   */
  getFlexibleRopePointYawPitch(ropeId: string): { yawsDeg: number[]; pitchesDeg: number[] } {
    const state = this.flexibleRopesMap.get(ropeId);
    return state
      ? { yawsDeg: state.pointYawDegs.slice(), pitchesDeg: state.pointPitchDegs.slice() }
      : { yawsDeg: [], pitchesDeg: [] };
  }

  /**
   * 兼容旧接口：返回 pitch 偏移（把旧 angle 语义映射成 pitch）。
   * 若需要 yaw/pitch，请使用 getFlexibleRopePointYawPitch。
   */
  getFlexibleRopePointAngles(ropeId: string): number[] {
    const state = this.flexibleRopesMap.get(ropeId);
    return state ? state.pointPitchDegs.slice() : [];
  }

  /**
   * Tube 上 u 绕截面一周、v 沿绳长（0–1）。设 uScale=1 时截面周长映射一整张纹理宽度，
   * 则方格 texel 要求：2πr/textureWidthPx = (totalLen/vScale)/textureHeightPx
   * ⇒ vScale = totalLen * textureWidthPx / (textureHeightPx * 2πr)
   */
  private applyFlexibleRopeTubeTextureScale(
    tex: Texture,
    totalLenWorld: number,
    textureWidthPx: number,
    textureHeightPx: number,
    ropeRadius: number,
  ): void {
    const tw = Math.max(1, textureWidthPx);
    const th = Math.max(1, textureHeightPx);
    const circumference = 2 * Math.PI * Math.max(1e-6, ropeRadius);
    tex.uScale = 1;
    tex.vScale = Math.max(0.01, (totalLenWorld * tw) / (th * circumference));
    tex.vOffset = 0;
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
  }

  /** 根据当前角度与距离重建单根绳子的曲线与 Tube，并更新控制点位置 */
  private updateSingleFlexibleRope(state: {
    start: Vector3;
    end: Vector3;
    distances: number[];
    pointIds: string[];
    pointMeshes: Mesh[];
    tube: Mesh;
    refLength: number;
    pointYawDegs: number[];
    pointPitchDegs: number[];
    textureWidthPx: number;
    textureHeightPx: number;
    radius: number;
    material: PBRMaterial;
    texture: Texture;
  }): void {
    const { start, end, pointMeshes } = state;
    const dirBase = end.subtract(start);
    const length = dirBase.length();
    const tangent = length > 1e-4 ? dirBase.normalize() : new Vector3(1, 0, 0);
    const up = Vector3.Up();
    // 用与 tangent 垂直的一对基向量表示“偏移平面”
    let right = Vector3.Cross(up, tangent);
    if (right.lengthSquared() < 1e-4) right = new Vector3(0, 0, 1);
    right.normalize();
    const upLocal = Vector3.Cross(tangent, right).normalize();
    const amplitude = Math.max(0.1, length * 0.08);
    const midPositions: Vector3[] = [];
    const pointCount = pointMeshes.length;

    for (let i = 0; i < pointCount; i++) {
      const d = state.distances[i] ?? (length * (i + 1)) / (pointCount + 1);
      const clampedD = Math.max(0, Math.min(length, d));
      const basePos = start.add(tangent.scale(clampedD));
      const yawDeg = state.pointYawDegs[i] ?? 0;
      const pitchDeg = state.pointPitchDegs[i] ?? 0;
      const yawRad = (yawDeg * Math.PI) / 180;
      const pitchRad = (pitchDeg * Math.PI) / 180;

      const offsetMagnitude = amplitude * Math.sin(pitchRad);
      const offsetDir = right
        .scale(Math.cos(yawRad))
        .add(upLocal.scale(Math.sin(yawRad)));
      const pos = basePos.add(offsetDir.scale(offsetMagnitude));
      midPositions.push(pos);
      pointMeshes[i].position.copyFrom(pos);
    }

    const controlPoints = [start.clone(), ...midPositions.map((p) => p.clone()), end.clone()];
    const curve = Curve3.CreateCatmullRomSpline(controlPoints, 20, false);
    const path = curve.getPoints();
    let totalLen = 0;
    for (let i = 1; i < path.length; i++) {
      totalLen += Vector3.Distance(path[i - 1], path[i]);
    }
    // 使用 instance 更新 Tube，避免每次 dispose/recreate（便于跟随移动时每帧更新）
    const tube = MeshBuilder.CreateTube(
      state.tube.name,
      {
        path,
        radius: state.radius,
        tessellation: 8,
        cap: Mesh.CAP_ALL,
        updatable: true,
        instance: state.tube,
      } as any,
      this.scene,
    );
    tube.material = state.material;
    tube.isPickable = false;
    (state as { tube: Mesh }).tube = tube;

    this.applyFlexibleRopeTubeTextureScale(
      state.texture,
      totalLen,
      state.textureWidthPx,
      state.textureHeightPx,
      state.radius,
    );
  }

  /** 汇总所有柔性绳子的控制点信息牌并调用 setInfoBoards */
  private refreshAllFlexibleRopeInfoBoards(): void {
    const items: InfoBoardItem[] = [];
    for (const state of this.flexibleRopesMap.values()) {
      for (let i = 0; i < state.pointMeshes.length; i++) {
        const mesh = state.pointMeshes[i];
        const yaw = state.pointYawDegs[i] ?? 0;
        const pitch = state.pointPitchDegs[i] ?? 0;
        items.push({
          id: mesh.id,
          title: `洋流点 ${state.pointIds[i] ?? i + 1}`,
          attribute: [
            { '水平偏移 yaw': `${yaw.toFixed(1)}°` },
            { '俯仰偏移 pitch': `${pitch.toFixed(1)}°` },
          ],
        });
      }
    }
    if (items.length) this.setInfoBoards(items);
  }

  /** 获取已创建的柔性绳子 id 列表 */
  getFlexibleRopeIds(): string[] {
    return Array.from(this.flexibleRopesMap.keys());
  }

  /** 获取指定绳子的中间控制点 id 列表（与创建时 length[].id 顺序一致） */
  getFlexibleRopePointIds(ropeId: string): string[] {
    const state = this.flexibleRopesMap.get(ropeId);
    return state ? state.pointIds.slice() : [];
  }

  /** 获取所有柔性绳子“控制点小球 mesh.id”（用于信息牌挂接与显隐控制） */
  getAllFlexibleRopePointMeshIds(): string[] {
    const ids: string[] = [];
    for (const state of this.flexibleRopesMap.values()) {
      state.pointMeshes.forEach((m) => ids.push(m.id));
    }
    return ids;
  }

  /**
   * 切换所有柔性绳子上控制点小球的显示/隐藏。
   * 创建时小球默认隐藏，调用 setFlexibleRopePointsVisible(true) 可显示。
   */
  setFlexibleRopePointsVisible(visible: boolean): void {
    for (const state of this.flexibleRopesMap.values()) {
      state.pointMeshes.forEach((m) => m.setEnabled(visible));
    }
  }

  /**
   * 设置绳子 Demo 中小球 B 的移动速度（世界单位/秒），仅当已创建绳子 Demo 时生效。
   */
  setRopeDemoBallSpeed(speed: number): void {
    this.ropeBallSpeed = Math.max(0.1, speed);
  }

  /**
   * 启用/关闭“海水下”效果：通过给当前相机添加一个简单的后处理着色器，
   * 模拟略微发蓝、去饱和、带轻微波动的水下观感。
   */
  setUnderwaterEffectEnabled(enabled: boolean, strength = 1): void {
    if (!this.scene || !this.scene.activeCamera) return;
    const camera = this.scene.activeCamera;
    const engine = this.scene.getEngine();

    if (!enabled) {
      if (this.underwaterPostProcess) {
        this.underwaterPostProcess.dispose();
        this.underwaterPostProcess = null;
      }
      this.isUnderwaterAuto = false;
      return;
    }

    if (this.underwaterPostProcess) {
      // 已存在时仅更新强度
      this.underwaterPostProcess.onApply = (effect) => {
        this.underwaterTime += engine.getDeltaTime() / 1000;
        effect.setFloat('time', this.underwaterTime);
        effect.setFloat('strength', strength);
      };
      this.isUnderwaterAuto = true;
      return;
    }

    // 注册简单的水下片段着色器
    if (!Effect.ShadersStore['underwaterFragmentShader']) {
      Effect.ShadersStore['underwaterFragmentShader'] = `
        precision highp float;
        varying vec2 vUV;
        uniform sampler2D textureSampler;
        uniform float time;
        uniform float strength;

        void main(void) {
          // 轻微波纹偏移
          float wave = sin(vUV.x * 30.0 + time * 3.0) * 0.004 * strength;
          vec2 uv = vUV + vec2(0.0, wave);
          vec4 c = texture2D(textureSampler, uv);

          // 去饱和 + 偏蓝绿色
          float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          vec3 desat = mix(c.rgb, vec3(g), 0.35 * strength);
          vec3 tint = mix(desat, vec3(0.0, 0.45, 0.65), 0.45 * strength);

          // 轻微暗角
          float d = distance(vUV, vec2(0.5));
          float vignette = smoothstep(0.9, 0.4, d);

          gl_FragColor = vec4(tint * vignette, c.a);
        }
      `;
    }

    this.underwaterTime = 0;
    const pp = new PostProcess(
      'UnderwaterPostProcess',
      'underwater',
      ['time', 'strength'],
      null,
      1.0,
      camera,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
      false,
    );

    pp.onApply = (effect) => {
      this.underwaterTime += engine.getDeltaTime() / 1000;
      effect.setFloat('time', this.underwaterTime);
      effect.setFloat('strength', strength);
    };

    this.underwaterPostProcess = pp;
    this.isUnderwaterAuto = true;
  }

  /** 设置当前激活模型（供外部 UI 切换使用） */
  setCurrentModel(modelName: string) {
    if (!this.modelAnimationsMap.has(modelName)) return;
    this.currentModelName = modelName;
    this.modelAnimationGroups = this.modelAnimationsMap.get(modelName) ?? [];
  }

  /** 获取当前激活模型名称 */
  getCurrentModelName(): string | null {
    return this.currentModelName;
  }

  /**
   * 注册动画结束回调。每次有动画（正放或倒放）播放完成时触发一次。
   */
  onAnimationEnd(
    handler: (info: {
      modelName: string;
      animationName: string;
      direction: 'forward' | 'backward';
    }) => void,
  ) {
    this.animationEndHandler = handler;
  }

  /**
   * 获取指定动画的原始帧范围（用于裁剪设置）。未传或传 -1 表示第一个动画。
   */
  getAnimationFrameRange(
    modelName?: string,
    nameOrIndex?: string | number,
  ): { from: number; to: number } | null {
    const name = modelName ?? this.currentModelName;
    if (!name) return null;
    const groups = this.modelAnimationsMap.get(name);
    if (!groups || groups.length === 0) return null;
    let group: AnimationGroup;
    if (nameOrIndex === undefined || (typeof nameOrIndex === 'number' && nameOrIndex === -1)) {
      group = groups[0];
    } else if (typeof nameOrIndex === 'number') {
      group = groups[nameOrIndex] ?? groups[0];
    } else {
      group = groups.find((g) => g.name === nameOrIndex) ?? groups[0];
    }
    const from = group.from;
    const to = group.to;
    if (typeof from !== 'number' || typeof to !== 'number') return null;
    return { from, to };
  }

  /**
   * 播放指定模型上的指定动画。不传或传 -1 时播放第一个动画。
   * 支持按起始帧、结束帧裁剪播放区间。
   * @param nameOrIndex 动画名称或索引
   * @param loop 是否循环，默认 false
   * @param modelName 可选：指定模型名称，不传则使用当前激活模型
   * @param direction 播放方向，'forward' 正放，'backward' 倒放
   * @param fromFrame 可选：裁剪起始帧（含），不传则使用动画原始 from
   * @param toFrame 可选：裁剪结束帧（含），不传则使用动画原始 to
   */
  playAnimation(
    nameOrIndex?: string | number,
    loop = false,
    modelName?: string,
    direction: 'forward' | 'backward' = 'forward',
    fromFrame?: number,
    toFrame?: number,
  ) {
    if (this.modelAnimationsMap.size === 0) return;
    const targetModelName = modelName ?? this.currentModelName;
    if (!targetModelName) return;
    const groups = this.modelAnimationsMap.get(targetModelName);
    if (!groups || groups.length === 0) return;

    this.stopAllAnimations(targetModelName);

    let group: AnimationGroup;
    if (nameOrIndex === undefined || (typeof nameOrIndex === 'number' && nameOrIndex === -1)) {
      group = groups[0];
    } else if (typeof nameOrIndex === 'number') {
      group = groups[nameOrIndex] ?? groups[0];
    } else {
      group = groups.find((g) => g.name === nameOrIndex) ?? groups[0];
    }

    group.loopAnimation = loop;

    const from = typeof fromFrame === 'number' ? fromFrame : group.from;
    const to = typeof toFrame === 'number' ? toFrame : group.to;
    const baseSpeed = Math.abs(group.speedRatio || 1);

    if (direction === 'backward') {
      if (typeof to === 'number') {
        group.goToFrame(to);
      }
      group.start(loop, -baseSpeed, from, to);
    } else {
      group.start(loop, baseSpeed, from, to);
    }

    this.currentPlayingGroupByModel.set(targetModelName, group);

    group.onAnimationGroupEndObservable.addOnce(() => {
      if (this.animationEndHandler) {
        this.animationEndHandler({
          modelName: targetModelName,
          animationName: group.name,
          direction,
        });
      }
    });
  }

  /**
   * 以倒放方式播放动画的便捷方法。支持裁剪区间 fromFrame、toFrame。
   */
  playAnimationReverse(
    nameOrIndex?: string | number,
    loop = false,
    modelName?: string,
    fromFrame?: number,
    toFrame?: number,
  ) {
    this.playAnimation(nameOrIndex, loop, modelName, 'backward', fromFrame, toFrame);
  }

  /**
   * 设置当前播放动画是否循环。仅对当前正在播放的动画生效。
   * @param loop 是否循环
   * @param modelName 可选：指定模型名称
   */
  setAnimationLoop(loop: boolean, modelName?: string) {
    const name = modelName ?? this.currentModelName;
    if (!name) return;
    const group = this.currentPlayingGroupByModel.get(name);
    if (group) group.loopAnimation = loop;
  }

  /**
   * 将当前播放的动画跳转到指定百分比位置（0~1）。
   * 若该模型尚未播放过动画，会先启动第一个动画并暂停在目标位置。
   * @param percentage 0~1，0 为开头，1 为结尾
   * @param modelName 可选：指定模型名称
   */
  setAnimationProgress(percentage: number, modelName?: string) {
    const name = modelName ?? this.currentModelName;
    if (!name) return;
    const groups = this.modelAnimationsMap.get(name);
    if (!groups || groups.length === 0) return;

    const p = Math.max(0, Math.min(1, percentage));
    let group = this.currentPlayingGroupByModel.get(name);

    if (!group || (!group.isPlaying && !group.isStarted)) {
      this.stopAllAnimations(name);
      group = groups[0];
      group.start(false);
      this.currentPlayingGroupByModel.set(name, group);
    }

    const from = group.from;
    const to = group.to;
    const frame = from + (to - from) * p;
    group.goToFrame(frame);
  }

  /**
   * 获取当前播放动画的进度百分比（0~1）。未播放或无法获取时返回 0。
   */
  getAnimationProgress(modelName?: string): number {
    const name = modelName ?? this.currentModelName;
    if (!name) return 0;
    const group = this.currentPlayingGroupByModel.get(name);
    if (!group || (!group.isPlaying && !group.isStarted)) return 0;
    const from = group.from;
    const to = group.to;
    if (to <= from) return 0;
    const current = group.getCurrentFrame();
    return Math.max(0, Math.min(1, (current - from) / (to - from)));
  }

  /**
   * 停止动画。
   * 不传 modelName 时停止所有模型动画，传入时仅停止对应模型。
   */
  stopAllAnimations(modelName?: string) {
    if (modelName) {
      this.currentPlayingGroupByModel.delete(modelName);
      const groups = this.modelAnimationsMap.get(modelName);
      groups?.forEach((g) => g.stop());
      return;
    }
    this.currentPlayingGroupByModel.clear();
    this.modelAnimationsMap.forEach((groups) => groups.forEach((g) => g.stop()));
  }

  /**
   * 设置动画播放速率。对指定模型或所有模型生效。
   * @param speed 速率，1 为原速
   */
  setAnimationSpeed(speed: number, modelName?: string) {
    if (modelName) {
      const groups = this.modelAnimationsMap.get(modelName);
      groups?.forEach((g) => (g.speedRatio = speed));
      return;
    }
    this.modelAnimationsMap.forEach((groups) => groups.forEach((g) => (g.speedRatio = speed)));
  }

  async setScene(onProgress?: (progress: number) => void) {
    if (!this.assets) {
      return;
    }
    const sceneNode = this.assets.scene[0];
    const scene = new Scene(this.engine);
    const padding = new Array<Padding>();
    this.assets.deserializeScene(scene, sceneNode, padding);
    this.scene = scene;
    this.scene.fogEnabled = false;
    scene.activeCamera.maxZ = 10000;
    //scene.clearColor = new Color4(1, 1, 1, 1);
    if (scene.activeCamera instanceof ArcRotateCamera) {
      // 保持与默认相机一致的交互体验
      scene.activeCamera.wheelPrecision = 10;
      scene.activeCamera.panningSensibility = 400;
    }
    scene.activeCamera.attachControl(this.canvas, true);
    this.registerCameraClickDebug();
    this.registerAction();
    this.ensureSaturationPipeline();
    const groupCount = Math.ceil(padding.length / 20);
    const group = ArrayUtils.groupArray(padding, groupCount);
    for (let index = 0; index < group.length; index++) {
      await Promise.all(group[index].map((x) => x()));
      onProgress?.(index / (group.length - 1));
    }
    onProgress(1);
    // scene.lights.forEach((light) => {
    //   if (light.shadowGenerator) {
    //     const generator = ShadowGenerator.Parse(light.shadowGenerator, scene);
    //     this.shadow.addShadowGeneratorMap(light.uuid, generator);
    //   }
    //   if (isDirectionalLight(light) || isPointLight(light) || isSpotLight(light)) {
    //     {
    //       const sg = this.shadow.getShadowGenerator(light);
    //       if (!sg) {
    //         return;
    //       }
    //       sg.getLight()
    //         .getScene()
    //         .meshes.forEach((item) => {
    //           if (item.castShadows) {
    //             this.shadow.addMeshToShadowGenerator(item, light);
    //           }
    //         });
    //     }
    //   }
    // });
    this.setGround();
    return scene;
  }

  /**
   * 启用/禁用“场景饱和度”后处理，并设置强度。
   * saturation 采用 Babylon colorCurves.globalSaturation 语义，建议范围 -100~100。
   */
  setSceneSaturationEffectEnabled(enabled: boolean, saturation = 20): void {
    this.saturationEnabled = enabled;
    this.setSceneSaturation(saturation);
  }

  /** 设置场景饱和度强度（建议范围 -100~100）。 */
  setSceneSaturation(saturation: number): void {
    const v = Number.isFinite(saturation) ? saturation : 0;
    this.saturationValue = Math.max(-100, Math.min(100, v));
    this.ensureSaturationPipeline();
  }

  private ensureSaturationPipeline(): void {
    const scene = this.scene;
    if (!scene) return;

    if (this.saturationPipeline && this.saturationPipelineSceneId !== scene.uniqueId) {
      this.saturationPipeline.dispose();
      this.saturationPipeline = null;
      this.saturationPipelineSceneId = null;
    }

    if (!this.saturationPipeline) {
      this.saturationPipeline = new DefaultRenderingPipeline(
        'AppSaturationPipeline',
        true,
        scene,
        scene.cameras,
      );
      this.saturationPipelineSceneId = scene.uniqueId;
      // 与编辑器默认保持一致的采样体验
      this.saturationPipeline.samples = 8;
    }

    const ip = this.saturationPipeline.imageProcessing;
    this.saturationPipeline.imageProcessingEnabled = this.saturationEnabled;
    if (!ip) return;
    ip.colorCurvesEnabled = this.saturationEnabled;
    if (ip.colorCurves) {
      ip.colorCurves.globalSaturation = this.saturationValue;
    }
  }

  /**
   * 加载 HDR 环境贴图并设为场景环境纹理，用于 PBR 反射/环境光。
   * 默认使用 public/Dutch-Sky_0168_4k.hdr；可直接使用 .hdr/.exr，运行时预滤波（需 WebGL2）。
   * 参考：[Using An HDR Environment For PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment/)
   *
   * @param options 可选配置
   * @param options.url HDR 或 EXR 文件 URL，默认 '/Dutch-Sky_0168_4k.hdr'（public 目录下）
   * @param options.size 立方体贴图每面尺寸（如 128/256/512），越大质量越高、加载越慢，默认 512
   * @param options.noMipmap 是否不生成 mipmap，默认 false
   * @param options.generateHarmonics 是否生成球谐用于 IBL，默认 true
   * @param options.useInGammaSpace 是否在 gamma 空间使用，默认 false
   * @param options.usePMREMGenerator 是否使用 PMREM 生成器，默认 true
   * @param options.createSkybox 是否创建基于同一 HDR 的天空盒网格（仅用于可视化，不影响模型反射），默认 true
   * @param options.onProgress 加载进度回调 0~1（HDR 预滤波可能无细分进度）
   * @returns 加载完成后的 HDRCubeTexture，失败时抛出
   */
  async loadHdrEnvironment(options?: {
    url?: string;
    size?: number;
    noMipmap?: boolean;
    generateHarmonics?: boolean;
    useInGammaSpace?: boolean;
    usePMREMGenerator?: boolean;
    createSkybox?: boolean;
    onProgress?: (progress: number) => void;
  }): Promise<HDRCubeTexture> {
    if (!this.scene) {
      throw new Error('loadHdrEnvironment: scene not ready, call after init and scene creation.');
    }
    const {
      url = '/venice_sunset_1k.hdr',
      size = 512,
      noMipmap = false,
      generateHarmonics = true,
      useInGammaSpace = false,
      usePMREMGenerator = true,
      createSkybox = true,
      onProgress,
    } = options ?? {};

    onProgress?.(0);
    const hdr = new HDRCubeTexture(
      url,
      this.scene,
      size,
      noMipmap,
      generateHarmonics,
      useInGammaSpace,
      usePMREMGenerator,
    );
    return new Promise<HDRCubeTexture>((resolve, reject) => {
      hdr.onLoadObservable.addOnce(() => {
        this.scene.environmentTexture = hdr;
        this.scene.environmentIntensity = this.scene.environmentIntensity ?? 1;
        this.ensureEnvironmentRotationObserver();
        onProgress?.(1);
        resolve(hdr);
      });
    });
  }

  /** 启用/禁用 HDR 环境贴图旋转（用于逐渐照亮不同方向的效果）。 */
  setEnvironmentRotationEnabled(enabled: boolean): void {
    this.environmentRotationEnabled = !!enabled;
    this.ensureEnvironmentRotationObserver();
  }

  /** 设置 HDR 环境贴图旋转速度（弧度/秒）。 */
  setEnvironmentRotationSpeedRadPerSec(speed: number): void {
    const v = Number.isFinite(speed) ? speed : 0;
    this.environmentRotationSpeedRadPerSec = Math.max(0, v);
    this.ensureEnvironmentRotationObserver();
  }

  private ensureEnvironmentRotationObserver(): void {
    const scene = this.scene;
    if (!scene) return;

    const tex: any = scene.environmentTexture as any;
    const hasRotY = tex && typeof tex === 'object' && 'rotationY' in tex;
    const shouldRun =
      this.environmentRotationEnabled && this.environmentRotationSpeedRadPerSec > 0 && hasRotY;

    if (!shouldRun) {
      if (this.environmentRotationObserver) {
        scene.onBeforeRenderObservable.remove(this.environmentRotationObserver);
        this.environmentRotationObserver = null;
      }
      this.environmentRotationLastTimeMs = null;
      return;
    }

    if (this.environmentRotationObserver) return;

    this.environmentRotationLastTimeMs = null;
    this.environmentRotationObserver = scene.onBeforeRenderObservable.add(() => {
      const t: any = scene.environmentTexture as any;
      if (!t || !('rotationY' in t)) return;

      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      const last = this.environmentRotationLastTimeMs ?? now;
      const dt = Math.max(0, (now - last) / 1000);
      this.environmentRotationLastTimeMs = now;

      // rotationY 单位为弧度
      t.rotationY = (t.rotationY ?? 0) + this.environmentRotationSpeedRadPerSec * dt;
    });
  }

  /**
   * 使用单独的纹理创建天空盒，仅用于背景显示和水面反射，不影响模型的 HDR 环境反射。
   * - 可传入 HDR / EXR / env / 立方体前缀 等 URL。
   * - 会移除之前创建的天空盒（名为 waterSkyBox），并将新的天空盒加入水面 render list。
   */
  async setSkyboxForWater(options: {
    url: string;
    size?: number;
    isHdr?: boolean;
    onProgress?: (progress: number) => void;
  }): Promise<void> {
    if (!this.scene) return;
    const { url, size = 512, isHdr, onProgress } = options;
    onProgress?.(0);

    // 移除旧的天空盒（仅管理本方法创建的 waterSkyBox）
    const old = this.scene.getMeshByName('waterSkyBox');
    if (old) {
      old.dispose();
    }

    const lower = url.toLowerCase();
    const useHdr = typeof isHdr === 'boolean' ? isHdr : lower.endsWith('.hdr') || lower.endsWith('.exr');
    let skyTex: CubeTexture | HDRCubeTexture;

    await new Promise<void>((resolve) => {
      if (useHdr) {
        skyTex = new HDRCubeTexture(
          url,
          this.scene,
          size,
          false,
          true,
          false,
          true,
          () => {
            onProgress?.(0.7);
            const scale = 1000;
            const skyBox = MeshBuilder.CreateBox(
              'waterSkyBox',
              { width: scale, height: scale, depth: scale },
              this.scene,
            );
            const mat = new PBRMaterial('waterSkyBoxMat', this.scene);
            mat.backFaceCulling = false;
            mat.reflectionTexture = skyTex;
            if (mat.reflectionTexture) {
              mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
            }
            mat.microSurface = 1;
            mat.disableLighting = true;
            mat.twoSidedLighting = true;
            mat.disableDepthWrite = true;
            skyBox.material = mat;
            skyBox.isPickable = false;
            skyBox.infiniteDistance = true;
            skyBox.ignoreCameraMaxZ = true;
            if (this.waterMaterial) {
              this.waterMaterial.addToRenderList(skyBox);
            }
            onProgress?.(1);
            resolve();
          },
        );
        return;
      }

      if (lower.endsWith('.env')) {
        skyTex = CubeTexture.CreateFromPrefilteredData(url, this.scene, '.env');
      } else {
        // 立方体前缀，如 environment/512/TropicalSunnyDay
        skyTex = new CubeTexture(url, this.scene);
      }

      skyTex.onLoadObservable.addOnce(() => {
        onProgress?.(0.7);
        const scale = 1000;
        const skyBox = MeshBuilder.CreateBox(
          'waterSkyBox',
          { width: scale, height: scale, depth: scale },
          this.scene,
        );
        const mat = new PBRMaterial('waterSkyBoxMat', this.scene);
        mat.backFaceCulling = false;
        mat.reflectionTexture = skyTex;
        if (mat.reflectionTexture) {
          mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        }
        mat.microSurface = 1;
        mat.disableLighting = true;
        mat.twoSidedLighting = true;
        mat.disableDepthWrite = true;
        skyBox.material = mat;
        skyBox.isPickable = false;
        skyBox.infiniteDistance = true;
        skyBox.ignoreCameraMaxZ = true;
        if (this.waterMaterial) {
          this.waterMaterial.addToRenderList(skyBox);
        }
        onProgress?.(1);
        resolve();
      });
    });
  }

  /**
   * 设置场景环境强度，影响所有使用 scene.environmentTexture 的 PBR 材质及反射（含模型与水面）。
   */
  setEnvironmentIntensity(intensity: number) {
    if (this.scene) this.scene.environmentIntensity = intensity;
  }

  /** 获取当前场景环境强度 */
  getEnvironmentIntensity(): number {
    return this.scene?.environmentIntensity ?? 1;
  }

  /**
   * 注册一个场景级别的鼠标点击监听，用于调试当前相机位置和目标点。
   * 点击画布时在控制台输出 activeCamera 的 position 和 target。
   */
  private registerCameraClickDebug(): void {
    if (!this.scene || this.cameraClickDebugRegistered) return;
    this.cameraClickDebugRegistered = true;

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
      const cam = this.scene?.activeCamera;
      if (!cam) return;

      const pos = cam.position;
      let target: Vector3 | null = null;

      if (cam instanceof ArcRotateCamera) {
        target = cam.target;
      } else if ((cam as any).getTarget) {
        try {
          target = (cam as any).getTarget();
        } catch {
          target = null;
        }
      }

      const positionData = { x: pos.x, y: pos.y, z: pos.z };
      const targetData = target ? { x: target.x, y: target.y, z: target.z } : null;

      // 简单输出到控制台，方便在浏览器控制台中复制数值
      // eslint-disable-next-line no-console
      console.log('Camera debug click =>', {
        position: positionData,
        target: targetData,
        // 下面这个片段可以直接粘到 demoConfig.ts 的 cameraPresetsConfig 中
        presetSnippet: {
          // label: '自定义相机预设',
          preset: {
            target: targetData ?? positionData,
            position: positionData,
          },
        },
      });
    });
  }
  /**
   * 将当前场景中用于显示环境的天空盒网格加入水面 render list。
   * 仅用于在外部有自定义天空盒（如 setSkyboxForWater 之外创建的）时手动让水面反射该天空盒。
   */
  applyEnvironmentToWater() {
    if (!this.waterMaterial || !this.scene) return;
    const skyMesh = this.scene.getMeshByName('waterSkyBox') ?? this.scene.getMeshByName('hdrSkyBox');
    if (skyMesh) this.waterMaterial!.addToRenderList(skyMesh);
  }

  getNodeById(id: string): Node {
    let node: Node = getSceneNodeByUUid(this.scene, id, this.weakMap);
    return node;
  }

  /** 按 uuid 或 mesh.id 解析节点，供信息牌挂接（GLB 等加载的模型常用 id） */
  private getNodeByIdOrMeshId(identifier: string): Node | null {
    try {
      const byUuid = this.getNodeById(identifier);
      if (byUuid) return byUuid;
    } catch {
      // ignore
    }
    const mesh = this.scene.getMeshById(identifier);
    return mesh ?? null;
  }

  /**
   * 设置 3D 信息牌数据。每个牌子通过 id 匹配场景中的节点，牌子底部连线到该节点，显示 title（设备名称）与 attribute（属性键值对）。
   * @param data 牌子数据数组，格式 [{ id, title?, attribute: [{ key: value }, ...] }]
   */
  setInfoBoards(data: InfoBoardItem[]): void {
    if (!this.scene) return;
    if (!this.infoBoardHelper) {
      this.infoBoardHelper = new InfoBoardHelper(
        this.scene,
        (id) => this.getNodeByIdOrMeshId(id),
      );
    }
    this.infoBoardHelper.update(data);
  }

  /**
   * 设置信息牌样式。会重建牌子辅助并清空当前牌子，需再次调用 setInfoBoards 以显示牌子并应用新样式。
   */
  setInfoBoardStyle(options: InfoBoardStyleOptions): void {
    if (!this.scene) return;
    this.infoBoardHelper?.dispose();
    this.infoBoardHelper = null;
    this.infoBoardHelper = new InfoBoardHelper(
      this.scene,
      (id) => this.getNodeByIdOrMeshId(id),
      options,
    );
  }

  /**
   * 清空所有 3D 信息牌。
   */
  clearInfoBoards(): void {
    this.infoBoardHelper?.clear();
  }

  /**
   * 控制信息牌显示/隐藏：传入的 id 数组中的牌子显示，其余隐藏。
   * @param visibleIds 需要显示的牌子 id 数组；空数组表示全部隐藏。
   */
  setInfoBoardsVisible(visibleIds: string[]): void {
    this.infoBoardHelper?.setVisibleIds(visibleIds ?? []);
  }

  /**
   * 根据相机距离控制信息牌显隐。
   * 默认关闭；开启后，仅当相机到目标 mesh 的距离在 [min, max] 范围内时牌子才会显示。
   * @param enabled 是否启用
   * @param min 最小可见距离（可选，默认 0）
   * @param max 最大可见距离（可选，默认无限大）
   */
  setInfoBoardsCameraDistanceVisibility(
    enabled: boolean,
    min?: number,
    max?: number,
  ): void {
    this.infoBoardHelper?.setCameraDistanceVisibility(enabled, { min, max });
  }

  registerAction() {
    this.scene.rootNodes.forEach((node) => {
      const children = node.getChildren(null, false);
      children.forEach((child) => {
        function getTriggerType(x: string) {
          console.log(x);
        }

        if (child.metadata?.events?.length > 0) {
          const events = new Set<string>(
            child.metadata?.events.map((x: { triggerType: string }) => x.triggerType),
          );
          const actions = [...events]
            .map((x) => {
              if (x === 'onClick') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPickTrigger,
                  },
                  function () {
                    getTriggerType('onClick');
                  },
                );
              } else if (x === 'onDoubleClick') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnDoublePickTrigger,
                  },
                  function () {
                    getTriggerType('onDoubleClick');
                  },
                );
              } else if (x === 'onMouseEnter') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPointerOverTrigger,
                  },
                  function () {
                    getTriggerType('onMouseEnter');
                  },
                );
              } else if (x === 'onMouseLeave') {
                return new ExecuteCodeAction(
                  {
                    trigger: ActionManager.OnPointerOutTrigger,
                  },
                  function () {
                    getTriggerType('onMouseLeave');
                  },
                );
              } else {
                console.log(x);
              }
            })
            .filter((x) => x);
          if (child instanceof Mesh) {
            child.actionManager = new ActionManager();
            actions.forEach((action) => {
              child.actionManager.registerAction(action);
            });
          } else {
            child.getChildMeshes().forEach((mesh) => {
              mesh.actionManager = new ActionManager();
              actions.forEach((action) => {
                mesh.actionManager.registerAction(action);
              });
            });
          }
        }
      });
    });
  }

  /** 创建环境光与天空盒 */
  private setupLightingAndSkybox(): void {
    new HemisphericLight('light', new Vector3(0, -1, 0), this.scene);
    const box = MeshBuilder.CreateBox(
      'box',
      { width: 1000, height: 1000, depth: 1000 },
      this.scene,
    );
    box.position.y = 5;
    const skyBox = new PBRMaterial('skyBox', this.scene);
    skyBox.backFaceCulling = false;
    box.material = skyBox;
    const tex = new CubeTexture('environment/512/TropicalSunnyDay', this.scene);
    tex.coordinatesMode = Texture.SKYBOX_MODE;
    skyBox.reflectionTexture = tex;
  }

  /** 创建/获取平行光，并创建方向光/相机辅助线 */
  private setupSunAndHelpers(): void {
    let sun = this.scene.lights.find((l) => l instanceof DirectionalLight) as DirectionalLight;
    if (!sun) {
      sun = new DirectionalLight('sunLight', new Vector3(0, -1, 0), this.scene);
      sun.intensity = 1.0;
    }
    this.sunLight = sun;
    this.directionalLightHelper = new DirectionalLightHelper(this.scene);
    this.directionalLightHelper.setLight(sun);
    this.directionalLightHelper.setEnabled(this.directionalLightHelperEnabledByDefault);

    const cam = this.scene.activeCamera;
    if (cam) {
      this.cameraHelper = new CameraHelper(this.scene);
      this.cameraHelper.setCamera(cam);
      this.cameraHelper.setEnabled(this.cameraHelperEnabledByDefault);
      if (cam instanceof ArcRotateCamera) {
        this.cameraTargetHelper = new CameraTargetHelper(this.scene);
        this.cameraTargetHelper.setCamera(cam);
        this.cameraTargetHelper.setEnabled(this.cameraTargetHelperEnabledByDefault);
      }
    }
  }

  /** 注册每帧更新：天空、方向光/相机辅助线 */
  private setupSkyRenderObserver(): void {
    this.skyObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.updateSkyByTime();
      this.directionalLightHelper?.update();
      this.cameraHelper?.update();
      this.cameraTargetHelper?.update();
    });
  }

  /** 创建陆地地面网格（贴图 + 位置） */
  private createGroundMesh(): Mesh {
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 3000, height: 3000, subdivisions: 1 },
      this.scene,
    );
    const groundMaterial = new PBRMaterial('groundMaterial', this.scene);
    groundMaterial.roughness = 1;
    const p = new Texture('OIP-C.webp', this.scene, true, false);
    p.uScale = 100;
    p.vScale = 100;
    groundMaterial.albedoTexture = p;
    ground.material = groundMaterial;
    ground.position.y = -84;
    ground.doNotSyncBoundingInfo = true;
    return ground;
  }

  /** 创建水面地面网格与 WaterMaterial，并初始化螺旋桨波浪效果；返回水面网格 */
  private createWaterGroundAndMaterial(): Mesh {
    const waterGround = MeshBuilder.CreateGround(
      'waterGround',
      { width: 3000, height: 3000, subdivisions: 1 },
      this.scene,
    );
    const waterMaterial = new WaterMaterial('water', this.scene, new Vector2(1024, 1024));
    const normal = new Texture('waterbump.png', this.scene, true, false);
    waterMaterial.bumpTexture = normal;

    // 海面参数默认值：由 seaDemoDefaults（demoConfig）统一驱动
    // - 先设置 bumpTexture 平铺兜底，再通过 setSeaParams 覆盖（setSeaParams 依赖 bumpTexture 已存在）
    normal.uScale = seaDemoDefaults.params.bumpTextureScale?.u ?? 6;
    normal.vScale = seaDemoDefaults.params.bumpTextureScale?.v ?? 6;
    waterMaterial.sideOrientation = seaDemoDefaults.params.sideOrientation ?? 1;
    this.waterMaterial = waterMaterial;
    // 将默认参数真正应用到材质上（否则只改 UI 不会影响海面初始效果）
    this.setSeaParams(seaDemoDefaults.params);
    // 保存默认快照用于 reset
    this.seaParamsDefaults = this.getSeaParams();

    waterGround.material = waterMaterial;
    waterGround.position.y = -4;
    waterGround.rotation.y = -Math.PI / 2; 

    this.createPropellerWaveEffectShader();
    this.setPropellerWaveEffectEnabled(this.propellerWaveEnabled);
    this.setPropellerWaveParticlesEnabled(this.propellerWaveParticlesEnabled);
    return waterGround;
  }

  /** 创建路径曲线、路径线及沿路径的圆柱体，并写入 this.path3D / this.meshArray */
  private createPathAndCylinderMeshes(): void {
    const points = [
      new Vector3(35, 10, 0),
      new Vector3(50, 10, 0),
      new Vector3(50, 0, 0),
      new Vector3(50, -5, 0),
      new Vector3(50, -50, 0),
    ];
    const path = Curve3.CreateCatmullRomSpline(points, 20, false);
    const pathPoints = path.getPoints();
    const line = MeshBuilder.CreateLines('line', { points: pathPoints }, this.scene);
    const line2 = MeshBuilder.CreateLines('line', { points: pathPoints }, this.scene);
    line2.position.z = 3;
    line.position.z = -3;

    const path3D = new Path3D(pathPoints);
    const boxArray: Mesh[] = [];
    const mat = new PBRMaterial('boxMaterial', this.scene);
    mat.roughness = 1;
    mat.metallic = 0.5;
    mat.albedoColor = new Color3(0.8, 0.8, 0.8);
    for (let i = 0; i < this.allCount; i++) {
      const box = MeshBuilder.CreateCylinder(
        'box',
        { height: 6, diameterTop: 2, diameterBottom: 2 },
        this.scene,
      );
      box.material = mat;
      box.rotate(new Vector3(1, 0, 0), Math.PI / 2);
      boxArray.push(box);
    }
    this.path3D = path3D;
    this.meshArray = boxArray;
  }

  /** 将场景中除水面以外的网格加入水面材质的反射/折射渲染列表 */
  private addMeshesToWaterRenderList(waterGround: Mesh): void {
    const waterMaterial = this.waterMaterial;
    if (!waterMaterial) return;
    this.scene.meshes.forEach((m) => {
      if (m !== waterGround) {
        waterMaterial.addToRenderList(m);
      }
    });
  }

  /** 根据相机相对水面高度自动开关水下效果（带滞后避免抖动） */
  private setupUnderwaterAutoObserver(waterY: number): void {
    const hysteresis = 0.5;
    if (this.underwaterAutoObserver) {
      this.scene.onBeforeRenderObservable.remove(this.underwaterAutoObserver);
      this.underwaterAutoObserver = null;
    }
    this.underwaterAutoObserver = this.scene.onBeforeRenderObservable.add(() => {
      const cam = this.scene.activeCamera;
      if (!cam) return;
      const y = cam.position.y;
      if (!this.isUnderwaterAuto && y < waterY - hysteresis) {
        this.isUnderwaterAuto = true;
        this.setUnderwaterEffectEnabled(true, 1);
      } else if (this.isUnderwaterAuto && y > waterY + hysteresis) {
        this.isUnderwaterAuto = false;
        this.setUnderwaterEffectEnabled(false, 1);
      }
    });
  }

  setGround() {
    this.setupLightingAndSkybox();
    // this.setupSunAndHelpers();
    this.setupSkyRenderObserver();
    this.updateSkyByTime();

    this.createGroundMesh();
    const waterGround = this.createWaterGroundAndMaterial();

    // this.createPathAndCylinderMeshes();
    this.addMeshesToWaterRenderList(waterGround);
    this.setupUnderwaterAutoObserver(waterGround.position.y);
  }

  /**
   * 使用面片 + 着色器创建螺旋桨波浪效果（基于 docs/水面波浪2.glsl，仅流动条带 + iChannel0 噪声）。
   *
   * 流程说明：
   * 1. 使用 ShaderMaterialHelper.createTimedShaderMaterial 注册并创建材质（vertex/fragment 见顶部 PROPELLER_WAVE_*）。
   * 2. 绑定噪声贴图 iChannel0.png（平铺），着色器内用 fbm 采样做流动纹理。
   * 3. 创建平面并摆放到船尾位置，设置 renderingGroupId=0、forceDepthWrite/needDepthPrePass 使面片被前景遮挡。
   * 4. 使用 startShaderTimeObserver 每帧更新 iTime（时间缩放 1/3200），仅在 mesh 启用时累加。
   */
  private createPropellerWaveEffectShader() {
    const shaderKey = 'propellerWave';
    const mat = createTimedShaderMaterial(
      this.scene,
      shaderKey,
      PROPELLER_WAVE_VERTEX,
      PROPELLER_WAVE_FRAGMENT,
      ['iChannel0'],
    );

    const noiseTex = createTiledTexture(this.scene, 'iChannel0.png');
    mat.setTexture('iChannel0', noiseTex);

    const plane = MeshBuilder.CreatePlane(
      'propellerWavePlane',
      { size: 60, width: 140, height: 160 },
      this.scene,
    );
    plane.position.set(-3.2, -1, -48);
    plane.rotation.y = 0;
    plane.rotate(new Vector3(1, 0, 0), Math.PI / 2);
    // plane.rotate(new Vector3(0, 0, 1), Math.PI / 2);
    plane.material = mat;
    plane.setEnabled(this.propellerWaveEnabled);
    plane.isPickable = false;
    plane.renderingGroupId = 0;

    this.propellerWaveMesh = plane;
    this.propellerWaveShaderMaterial = mat;
    this.propellerWaveRemoveTimeObserver = startShaderTimeObserver(
      this.scene,
      mat,
      () => !!this.propellerWaveMesh?.isEnabled(),
      1 / 3200,
    );
  }

  /**
   * 创建螺旋桨推动的波浪粒子效果（船尾两侧），独立效果可切换显示
   */
  private createPropellerWaveEffect() {
    if (!this.propellerWaveParticlesEnabled) return;
    const capacity = 6000;

    const tex = new Texture('particle/smoke.png', this.scene, true, false, null);
    tex.hasAlpha = true;

    const systems: ParticleSystem[] = [];
    const emitters = propellerWaveParticleEmitters.length
      ? propellerWaveParticleEmitters
      : [{ x: 15.7, y: 2, z: 0 }];
    emitters.forEach((e, i) => {
      const ps = new ParticleSystem(`propellerWave_${i}`, capacity, this.scene);
      ps.emitter = new Vector3(e.x, e.y, e.z);
      ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      ps.particleTexture = tex;
      ps.isAnimationSheetEnabled = true;
      ps.spriteCellWidth = 256;
      ps.spriteCellHeight = 256;
      ps.startSpriteCellID = 0;
      ps.endSpriteCellID = 4;
      ps.spriteCellLoop = true;
      ps.spriteCellChangeSpeed = 5;
      ps.minScaleX = 10;
      ps.minScaleY = 10;
      ps.emitRate = App.PROPELLER_WAVE_EMIT_RATE;
      ps.minSize = 0.5;
      ps.maxSize = 1.5;
      ps.minLifeTime = 5;
      ps.maxLifeTime = 6;
      // 发射区域：在水面附近的一个矩形面（扩大范围）；相对原方向绕 Y 轴旋转 90°（x,y,z -> z,y,-x）
      ps.createBoxEmitter(
        new Vector3(-3.5, 0, -30),
        new Vector3(3.5, 0, -30),
        new Vector3(-6, -0.08, 0.6),
        new Vector3(6, 0.08, -0.6),
      );
      // 生命周期内前段就快速缩小，关闭螺旋桨后几乎看不到“浪带向后移”，只看到波浪在船尾处收掉
      ps.addSizeGradient(0, 1);
      ps.addSizeGradient(0.15, 0.4);
      ps.addSizeGradient(0.35, 0.08);
      ps.addSizeGradient(0.6, 0.02);
      ps.addSizeGradient(1, 0);

      ps.start();
      systems.push(ps);
    });

    this.propellerWaveParticles = systems;
  }

  /** 切换螺旋桨浪花粒子是否启用（仅影响粒子版；着色器版不受影响） */
  setPropellerWaveParticlesEnabled(enabled: boolean) {
    this.propellerWaveParticlesEnabled = enabled;
    if (!enabled) {
      if (this.propellerWaveEmitRateTween) {
        this.propellerWaveEmitRateTween.kill();
        this.propellerWaveEmitRateTween = null;
      }
      if (this.propellerWaveClosingObserver) {
        this.scene.onBeforeRenderObservable.remove(this.propellerWaveClosingObserver);
        this.propellerWaveClosingObserver = null;
      }
      this.propellerWaveParticles.forEach((ps) => {
        ps.stop();
        ps.dispose();
      });
      this.propellerWaveParticles = [];
      return;
    }
    if (!this.propellerWaveEnabled) return;
    if (this.propellerWaveParticles.length === 0) this.createPropellerWaveEffect();
  }

  /**
   * 切换螺旋桨波浪效果显示/隐藏。
   * 面片着色器版：直接显隐 mesh；粒子版：关闭时从后往前回收，开启时渐强发射率。
   */
  setPropellerWaveEffectEnabled(enabled: boolean) {
    this.propellerWaveEnabled = enabled;
    if (this.propellerWaveMesh) {
      this.propellerWaveMesh.setEnabled(enabled);
      return;
    }
    if (this.propellerWaveEmitRateTween) {
      this.propellerWaveEmitRateTween.kill();
      this.propellerWaveEmitRateTween = null;
    }
    if (this.propellerWaveClosingObserver) {
      this.scene.onBeforeRenderObservable.remove(this.propellerWaveClosingObserver);
      this.propellerWaveClosingObserver = null;
    }
    if (!enabled) {
      this.propellerWaveParticles.forEach((ps) => {
        ps.emitRate = 0;
      });
      this.startPropellerWaveCloseFromBackToFront();
      return;
    }
    if (this.propellerWaveParticles.length === 0) {
      if (this.propellerWaveParticlesEnabled) this.createPropellerWaveEffect();
    }
    if (!this.propellerWaveParticlesEnabled) return;
    const rate = { value: 0 };
    const applyRate = () => {
      this.propellerWaveParticles.forEach((ps) => {
        ps.emitRate = rate.value;
      });
    };
    applyRate();
    this.propellerWaveParticles.forEach((ps) => ps.start());
    this.propellerWaveEmitRateTween = gsap.to(rate, {
      value: App.PROPELLER_WAVE_EMIT_RATE,
      duration: 1.2,
      onUpdate: applyRate,
      onComplete: () => {
        this.propellerWaveEmitRateTween = null;
      },
    });
  }

  /**
   * 关闭螺旋桨时：每帧按距离发射器从远到近回收粒子，实现波浪从后往前逐渐消失。
   */
  private startPropellerWaveCloseFromBackToFront() {
    const recyclePerFrame = App.PROPELLER_WAVE_RECYCLE_PER_FRAME;
    const emitterPos = (ps: ParticleSystem) => {
      const e = ps.emitter;
      return e instanceof Vector3 ? e : (e as AbstractMesh).getAbsolutePosition();
    };
    const closingStep = () => {
      let anyActive = false;
      for (const ps of this.propellerWaveParticles) {
        const pos = emitterPos(ps);
        const particles = ps.particles;
        if (particles.length === 0) continue;
        anyActive = true;
        const withDist = particles.map((p) => ({
          p,
          d: Vector3.Distance(p.position, pos),
        }));
        withDist.sort((a, b) => b.d - a.d);
        const toRecycle = Math.min(recyclePerFrame, withDist.length);
        for (let i = 0; i < toRecycle; i++) {
          ps.recycleParticle(withDist[i].p);
        }
      }
      if (!anyActive || this.propellerWaveParticles.every((ps) => ps.particles.length === 0)) {
        if (this.propellerWaveClosingObserver !== null) {
          this.scene.onBeforeRenderObservable.remove(this.propellerWaveClosingObserver);
          this.propellerWaveClosingObserver = null;
        }
        this.propellerWaveParticles.forEach((ps) => ps.stop());
      }
    };
    this.propellerWaveClosingObserver = this.scene.onBeforeRenderObservable.add(closingStep);
  }

  /** 当前螺旋桨波浪效果是否开启 */
  get isPropellerWaveEffectEnabled(): boolean {
    return this.propellerWaveEnabled;
  }

  /** 是否启用 DirectionalLight 辅助线（方向线 + 位置球） */
  get isDirectionalLightHelperEnabled(): boolean {
    return this.directionalLightHelper?.enabled ?? false;
  }

  /**
   * 启用或关闭 DirectionalLight 辅助线，便于调试灯光位置、朝向和强度。
   */
  setDirectionalLightHelperEnabled(enabled: boolean): void {
    this.directionalLightHelperEnabledByDefault = enabled;
    this.directionalLightHelper?.setEnabled(enabled);
  }

  /** 是否启用相机辅助（位置球 + 视线方向线） */
  get isCameraHelperEnabled(): boolean {
    return this.cameraHelper?.enabled ?? false;
  }

  /**
   * 启用或关闭相机辅助，便于调试相机位置与朝向。
   */
  setCameraHelperEnabled(enabled: boolean): void {
    this.cameraHelperEnabledByDefault = enabled;
    this.cameraHelper?.setEnabled(enabled);
  }

  /** 是否启用控制器/目标点辅助（ArcRotateCamera 的 target） */
  get isCameraTargetHelperEnabled(): boolean {
    return this.cameraTargetHelper?.enabled ?? false;
  }

  /**
   * 启用或关闭控制器辅助，便于调试环绕目标点（相机 target）位置。
   */
  setCameraTargetHelperEnabled(enabled: boolean): void {
    this.cameraTargetHelperEnabledByDefault = enabled;
    this.cameraTargetHelper?.setEnabled(enabled);
  }

  /** 获取当前相机调试状态（仅 ArcRotateCamera），用于 UI 实时显示 */
  getArcRotateCameraDebugState(): {
    alpha: number;
    beta: number;
    radius: number;
    target: { x: number; y: number; z: number };
  } | null {
    const cam = this.scene?.activeCamera;
    if (!cam || !(cam instanceof ArcRotateCamera)) return null;
    return {
      alpha: cam.alpha,
      beta: cam.beta,
      radius: cam.radius,
      target: { x: cam.target.x, y: cam.target.y, z: cam.target.z },
    };
  }

  /**
   * 封装相机视角限制（仅支持 ArcRotateCamera）。
   * - **水平拖动**：限制 `camera.target` 在 XZ 平面相对中心点的半径（panRadius）
   * - **垂直拖动**：限制 `camera.target.y` 在 [minTargetY, maxTargetY]
   * - **缩放**：限制 `camera.radius` 最大值（maxRadius）
   * - **翻转**：限制 `camera.beta` 不超过 90°（避免上下翻转）
   *
   * @param options 限制参数；center 不传时以调用时的 `camera.target` 作为中心点
   */
  setCameraViewLimits(options: {
    /** 水平拖动范围半径（世界单位，限制 target 在 XZ 平面移动范围） */
    panRadius?: number;
    /** 缩放最大距离（camera.radius 的上限） */
    maxRadius?: number;
    /** 垂直拖动 target.y 最小值 */
    minTargetY?: number;
    /** 垂直拖动 target.y 最大值 */
    maxTargetY?: number;
    /** 限制中心点（不传则使用当前 target） */
    center?: Vector3;
    /** 是否限制翻转（beta）≤ 90°，默认 true */
    limitFlipTo90Deg?: boolean;
  }): void {
    const scene = this.scene;
    const cam = scene?.activeCamera;
    if (!scene || !(cam instanceof ArcRotateCamera)) return;

    // 保存参数与中心点
    this.cameraViewLimitParams = {
      panRadius: options.panRadius,
      maxRadius: options.maxRadius,
      minTargetY: options.minTargetY,
      maxTargetY: options.maxTargetY,
      limitFlipTo90Deg: options.limitFlipTo90Deg ?? true,
    };
    this.cameraViewLimitCenter = (options.center ?? cam.target).clone();

    // 直接设置内置限制（能覆盖大部分输入）
    if (typeof options.maxRadius === 'number' && Number.isFinite(options.maxRadius)) {
      cam.upperRadiusLimit = Math.max(0.1, options.maxRadius);
    }
    if (this.cameraViewLimitParams.limitFlipTo90Deg) {
      // ArcRotateCamera.beta：0~PI；90° = PI/2，限制到略小于 PI/2 避免边界抖动
      cam.lowerBetaLimit = 0.01;
      cam.upperBetaLimit = Math.PI / 2 - 0.01;
    }

    // 替换/复用每帧钳制逻辑
    if (this.cameraViewLimitObserver) {
      scene.onBeforeRenderObservable.remove(this.cameraViewLimitObserver);
      this.cameraViewLimitObserver = null;
    }
    this.cameraViewLimitObserver = scene.onBeforeRenderObservable.add(() => {
      const params = this.cameraViewLimitParams;
      const center = this.cameraViewLimitCenter;
      const active = scene.activeCamera;
      if (!params || !center || !(active instanceof ArcRotateCamera)) return;

      // 半径上限兜底（防止外部直接改 radius）
      if (typeof params.maxRadius === 'number' && Number.isFinite(params.maxRadius)) {
        if (active.radius > params.maxRadius) active.radius = params.maxRadius;
      }

      // 翻转限制兜底（防止外部直接改 beta）
      if (params.limitFlipTo90Deg) {
        const minB = active.lowerBetaLimit ?? 0.01;
        const maxB = active.upperBetaLimit ?? Math.PI / 2 - 0.01;
        if (active.beta < minB) active.beta = minB;
        if (active.beta > maxB) active.beta = maxB;
      }

      // 垂直 target.y 限制
      const ty = active.target.y;
      if (typeof params.minTargetY === 'number' && Number.isFinite(params.minTargetY)) {
        if (active.target.y < params.minTargetY) active.target.y = params.minTargetY;
      }
      if (typeof params.maxTargetY === 'number' && Number.isFinite(params.maxTargetY)) {
        if (active.target.y > params.maxTargetY) active.target.y = params.maxTargetY;
      }
      // 若 y 被钳制，避免后续半径计算用旧值（顺手刷新本地变量）
      void ty;

      // 水平 XZ 半径限制（限制 target 在水平面移动范围）
      if (typeof params.panRadius === 'number' && Number.isFinite(params.panRadius)) {
        const r = Math.max(0, params.panRadius);
        const dx = active.target.x - center.x;
        const dz = active.target.z - center.z;
        const dist = Math.hypot(dx, dz);
        if (dist > r && dist > 1e-6) {
          const k = r / dist;
          active.target.x = center.x + dx * k;
          active.target.z = center.z + dz * k;
        }
      }

      this.cameraHelper?.update();
      this.cameraTargetHelper?.update();
    });
  }

  /**
   * 切换镜头：将相机和控制器（ArcRotateCamera）移动到预设位置。
   * @param preset 镜头预设：
   *  - 方式一：仅传入旋转中心（target）和相机位置（position），直接将 camera.target / camera.position 渐变到目标值；
   *  - 方式二：传入 target + alpha/beta/radius，或 modelName + offset，根据模型包围盒中心点 + 偏移量计算视角参数。
   * @param options.duration 过渡时长（秒），为 0 或不传则瞬间切换
   */
  switchCameraView(
    preset: CameraViewPreset,
    options?: { duration?: number },
  ): void {
    const cam = this.scene?.activeCamera;
    if (!cam || !(cam instanceof ArcRotateCamera)) return;

    const toVec3 = (v: { x: number; y: number; z: number } | Vector3) =>
      v instanceof Vector3 ? v : new Vector3(v.x, v.y, v.z);
    // 1. 计算目标点 target：
    //    - 若显式传入 preset.target，则优先使用；
    //    - 否则若提供了 modelName，则使用该模型包围盒中心点；
    //    - 若都没有，则退回当前相机 target。
    let target: Vector3 | null = null;

    if (preset.target) {
      target = toVec3(preset.target);
    } else if (preset.modelName) {
      const root = this.getNodeByModelAndName(preset.modelName) as any;
      if (root?.getHierarchyBoundingVectors) {
        const { min, max } = root.getHierarchyBoundingVectors();
        target = min.add(max).scale(0.5);
      }
    }

    if (!target) {
      // 最终兜底：使用当前相机的 target
      target = cam.target.clone();
    }

    let alpha: number;
    let beta: number;
    let radius: number;

    // 2. 若“仅传入旋转中心和相机位置”（position 存在，且未显式指定 alpha/beta/radius），
    //    则直接对 camera.target 与 camera.position 做插值，不重新计算角度与半径。
    const isDirectTargetAndPosition =
      preset.position !== undefined &&
      preset.alpha === undefined &&
      preset.beta === undefined &&
      preset.radius === undefined &&
      !preset.offset;

    if (isDirectTargetAndPosition) {
      const finalTarget = target;
      const finalPos = toVec3(preset.position as { x: number; y: number; z: number });
      const duration = options?.duration ?? 0;

      if (duration <= 0) {
        cam.target.copyFrom(finalTarget);
        // 使用 setPosition 以同时更新 alpha/beta/radius，避免下一帧被还原
        cam.setPosition(finalPos);
        this.cameraHelper?.update();
        this.cameraTargetHelper?.update();
        return;
      }

      const from = {
        tx: cam.target.x,
        ty: cam.target.y,
        tz: cam.target.z,
        px: cam.position.x,
        py: cam.position.y,
        pz: cam.position.z,
      };
      gsap.to(from, {
        tx: finalTarget.x,
        ty: finalTarget.y,
        tz: finalTarget.z,
        px: finalPos.x,
        py: finalPos.y,
        pz: finalPos.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          cam.target.set(from.tx, from.ty, from.tz);
          // ArcRotateCamera 的 position 是由 alpha/beta/radius 推导的，
          // 这里用 setPosition 让内部同步更新角度与半径，确保插值生效
          cam.setPosition(new Vector3(from.px, from.py, from.pz));
          this.cameraHelper?.update();
          this.cameraTargetHelper?.update();
        },
      });
      return;
    }

    // 3. 其它情况：按 alpha/beta/radius 视角参数处理。
    //    - 若提供 position 或 offset，则先计算 position，再由 position - target 推导 alpha/beta/radius；
    //    - 否则直接使用 alpha/beta/radius（缺省时保持当前相机参数）。
    let finalPosition: Vector3 | null = null;

    if (preset.position !== undefined) {
      finalPosition = toVec3(preset.position);
    } else if (preset.offset) {
      const offset = toVec3(preset.offset);
      finalPosition = target.add(offset);
    }

    if (finalPosition) {
      const offset = finalPosition.subtract(target);
      radius = offset.length();
      if (radius < 1e-6) {
        radius = cam.radius;
        alpha = cam.alpha;
        beta = cam.beta;
      } else {
        const x = offset.x;
        const y = offset.y;
        const z = offset.z;
        alpha = Math.atan2(x, z);
        beta = Math.asin(Math.max(-1, Math.min(1, y / radius)));
      }
    } else {
      alpha = preset.alpha ?? cam.alpha;
      beta = preset.beta ?? cam.beta;
      radius = preset.radius ?? cam.radius;
    }

    const duration = options?.duration ?? 0;
    if (duration <= 0) {
      cam.target.copyFrom(target);
      cam.alpha = alpha;
      cam.beta = beta;
      cam.radius = radius;
      this.cameraHelper?.update();
      this.cameraTargetHelper?.update();
      return;
    }

    const from = {
      alpha: cam.alpha,
      beta: cam.beta,
      radius: cam.radius,
      tx: cam.target.x,
      ty: cam.target.y,
      tz: cam.target.z,
    };
    gsap.to(from, {
      alpha,
      beta,
      radius,
      tx: target.x,
      ty: target.y,
      tz: target.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        cam.alpha = from.alpha;
        cam.beta = from.beta;
        cam.radius = from.radius;
        cam.target.set(from.tx, from.ty, from.tz);
        this.cameraHelper?.update();
        this.cameraTargetHelper?.update();
      },
    });
  }

  private updateSkyByTime() {
    if (!this.skyMaterial) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const sunrise = 6;
    const sunset = 18;
    const tRaw = (h + m / 60 - sunrise) / (sunset - sunrise);
    const t = Math.max(0, Math.min(1, tRaw));
    const elev = Math.sin(t * Math.PI);
    const yaw = -Math.PI / 2 + t * Math.PI;
    const pitch = elev * (Math.PI / 2) * 0.9;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const radius = 100;
    const sunPos = new Vector3(cp * sy, sp, cp * cy).scale(radius);
    this.skyMaterial.sunPosition = sunPos;
    const lum = 0.2 + 0.8 * elev;
    const turb = 2 + 4 * (1 - elev);
    this.skyMaterial.luminance = lum;
    this.skyMaterial.turbidity = turb;
    this.skyMaterial.rayleigh = 2 + 1 * elev;
    this.skyMaterial.mieCoefficient = 0.005;
    this.skyMaterial.mieDirectionalG = 0.8;
    if (this.sunLight) {
      const dir = sunPos.normalize().scale(-1);
      this.sunLight.direction.copyFrom(dir);
      this.sunLight.intensity = 0.2 + 0.8 * elev;
    }
  }
  setIndex(index: number) {
    const oldIndex = this.currentCount;

    const v = { value: oldIndex / this.allCount };
    gsap.to(v, {
      value: index / this.allCount,
      duration: 1,
      onUpdate: () => {
        this.currentCount = v.value * this.allCount;
        for (let index = 0; index < this.meshArray.length; index++) {
          const vv = v.value - index / (this.meshArray.length - 1);
          const boxMesh = this.meshArray[index];
          if (vv <= 0) {
            boxMesh.setEnabled(false);
          } else {
            boxMesh.setEnabled(true);
          }
          const pos = this.path3D.getPointAt(Math.max(vv, 0));
          boxMesh.position.copyFrom(pos);
        }
        // const normal = path3D.getBinormalAt(v.value);
        // const dir = path3D.getTangentAt(v.value);
        // box2.rotationQuaternion = Quaternion.FromLookDirectionRH(dir, normal);
      },
    });
  }
}

function getSceneNodeByUUid(scene: Scene, uuid: string, weakMap?: Map<string, Node>) {
  if (weakMap) {
    const ret = weakMap.get(uuid);
    if (ret) {
      return ret;
    }
  }
  for (const item of scene.rootNodes) {
    const ret = getNodeByUUid(item, uuid, weakMap);
    if (ret) {
      return ret;
    }
  }
}
function getNodeByUUid(node: Node, uuid: string, weakMap?: Map<string, Node>): Node | null {
  if (weakMap) {
    weakMap.set(node.uuid, node);
  }
  if (node.uuid === uuid) {
    if (node.isDeleted) return null;
    return node;
  }
  const children = node.getChildren();
  if (children?.length > 0) {
    for (let index = 0; index < children.length; index++) {
      const ret = getNodeByUUid(children[index], uuid, weakMap);
      if (ret) {
        if (node.isDeleted) return null;
        return ret;
      }
    }
  }
}
