import {
  AbstractEngine,
  ActionManager,
  AnimationGroup,
  DirectionalLight,
  CascadedShadowGenerator,
  Engine,
  ExecuteCodeAction,
  ImportMeshAsync,
  Mesh,
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

/** 镜头预设：可将相机与控制器切换到指定位置（仅支持 ArcRotateCamera） */
export interface CameraViewPreset {
  /** 观察目标点（控制器 target） */
  target: { x: number; y: number; z: number } | Vector3;
  /** 相机位置；若提供则根据 target 自动计算 alpha/beta/radius */
  position?: { x: number; y: number; z: number } | Vector3;
  /** 水平角度（弧度），与 position 二选一 */
  alpha?: number;
  /** 垂直角度（弧度） */
  beta?: number;
  /** 相机到目标的距离 */
  radius?: number;
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
  /** 绳子 Demo：固定小球 A、移动小球 B、中间带纹理的绳子 */
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
  /** 海水下效果后处理 */
  private underwaterPostProcess: PostProcess | null = null;
  private underwaterTime = 0;
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
    if (this.scene) {
      for (const { mesh, observer } of this.debugMovingBalls.values()) {
        this.scene.onBeforeRenderObservable.remove(observer);
        mesh.dispose();
      }
    }
    this.debugMovingBalls.clear();
    if (this.ropeObserver && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.ropeObserver);
      this.ropeObserver = null;
    }
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
    } else {
      // 复用已有场景时也确保已注册点击事件
      this.registerCameraClickDebug();
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

    const groups = result.animationGroups ?? [];
    const finalModelName = modelName ?? this.getModelNameFromUrl(modelUrl);
    // 无论是否有动画组，都记录模型名称；没有动画则存空数组，方便在 UI 中按模型选择
    this.modelAnimationsMap.set(finalModelName, groups);
    if (result.meshes?.length) {
      this.modelRootMap.set(finalModelName, result.meshes[0]);
    }
    this.currentModelName = finalModelName;
    this.modelAnimationGroups = groups;
    if (sceneJustCreated) {
      this.setGround();
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
   * 创建绳子 Demo：固定小球 A、不断移动的小球 B、中间带木纹贴图的绳子。
   * B 沿射线方向往复运动，拉远时绳子变长、纹理向 B 流动并增加重复以保证不变形；
   * 拉近时绳子变短、纹理向 A 流动并减少重复；流动速度与 B 移动速度成正比。
   */
  createRopeDemo(options?: {
    /** 绳子纹理 URL，默认 /1712285623239_7670.jpeg（1600×1200） */
    textureUrl?: string;
    /** 小球 A 固定位置 */
    positionA?: Vector3;
    /** B 运动：最小距离、最大距离（相对 A） */
    minDistance?: number;
    maxDistance?: number;
    /** B 运动方向（单位向量，默认 +X） */
    direction?: Vector3;
    /** B 往复周期（秒），若同时提供 ballSpeed 则被忽略 */
    period?: number;
    /** B 移动速度（世界单位/秒），与 period 二选一，优先 ballSpeed */
    ballSpeed?: number;
    /** 绳子半径（场景单位） */
    ropeRadius?: number;
  }): void {
    if (!this.scene) return;
    const textureUrl = options?.textureUrl ?? '/1712285623239_7670.jpeg';
    const positionA = options?.positionA ?? new Vector3(0, 4, 0);
    const minDist = Math.max(0.5, options?.minDistance ?? 2);
    const maxDist = Math.max(minDist + 1, options?.maxDistance ?? 12);
    const direction = (options?.direction ?? new Vector3(1, 0, 0)).normalize();
    this.ropeRange = 2 * (maxDist - minDist);
    const useSpeed = options?.ballSpeed ?? this.ropeBallSpeed;
    this.ropeBallSpeed = useSpeed;
    const period = this.ropeRange / Math.max(0.1, this.ropeBallSpeed);
    const ropeRadius = options?.ropeRadius ?? 0.12;

    // 清理已有
    if (this.ropeObserver) {
      this.scene.onBeforeRenderObservable.remove(this.ropeObserver);
      this.ropeObserver = null;
    }
    this.ropeBallA?.dispose();
    this.ropeBallB?.dispose();
    this.ropeTube?.dispose();
    this.ropeMaterial?.dispose();
    this.ropeMaterial = null;
    this.ropeTexture?.dispose();
    this.ropeTexture = null;

    // 固定小球 A
    const ballA = MeshBuilder.CreateSphere(
      'ropeBallA',
      { diameter: 0.8, segments: 16 },
      this.scene,
    );
    ballA.position.copyFrom(positionA);
    ballA.isPickable = false;
    const matA = new PBRMaterial('ropeBallAMat', this.scene);
    matA.albedoColor = new Color3(0.9, 0.25, 0.2);
    matA.emissiveColor = new Color3(0.15, 0, 0);
    ballA.material = matA;

    // 移动小球 B：沿 direction 方向在 minDist~maxDist 之间往复
    const ballB = MeshBuilder.CreateSphere(
      'ropeBallB',
      { diameter: 0.8, segments: 16 },
      this.scene,
    );
    const startB = positionA.add(direction.scale((minDist + maxDist) * 0.5));
    ballB.position.copyFrom(startB);
    ballB.isPickable = false;
    const matB = new PBRMaterial('ropeBallBMat', this.scene);
    matB.albedoColor = new Color3(0.2, 0.4, 0.9);
    matB.emissiveColor = new Color3(0, 0.1, 0.2);
    ballB.material = matB;

    // 绳子贴图 + PBR 材质（保证在 WebGPU/WebGL 下都能显示）；B 端固定效果需着色器，此处用统一 vOffset 先保证可见
    const ropeTex = new Texture(textureUrl, this.scene, false, false);
    ropeTex.wrapU = Texture.WRAP_ADDRESSMODE;
    ropeTex.wrapV = Texture.WRAP_ADDRESSMODE;
    const ropeMat = new PBRMaterial('ropeMat', this.scene);
    ropeMat.albedoTexture = ropeTex;
    ropeMat.roughness = 1;
    ropeMat.metallic = 0;

    // 初始路径与参考长度
    const pathPoints = [positionA.clone(), startB.clone()];
    const initialLength = Vector3.Distance(positionA, startB);
    this.ropeRefLength = Math.max(0.1, initialLength);
    this.ropeFlowOffset = 0;
    this.ropePhase = 0;
    this.ropePrevBPos.copyFrom(startB);

    let ropeTube: Mesh = MeshBuilder.CreateTube(
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

    this.ropeBallA = ballA;
    this.ropeBallB = ballB;
    this.ropeTube = ropeTube;
    this.ropeMaterial = ropeMat;
    this.ropeTexture = ropeTex;

    const engine = this.scene.getEngine();
    this.ropeObserver = this.scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      const period = this.ropeRange / Math.max(0.1, this.ropeBallSpeed);
      // B 往复：phase 0→1→0（三角波）
      this.ropePhase += dt / period;
      if (this.ropePhase > 2) this.ropePhase -= 2;
      const t = this.ropePhase <= 1 ? this.ropePhase : 2 - this.ropePhase;
      const dist = minDist + (maxDist - minDist) * t;
      const posB = positionA.add(direction.scale(dist));
      ballB.position.copyFrom(posB);

      const posA = positionA.clone();
      const length = Vector3.Distance(posA, posB);
      const dir = posB.subtract(posA).normalize();

      // B 的瞬时速度（与 period = ropeRange/ropeBallSpeed 一致）：单程速率 = ropeBallSpeed
      const speed = this.ropeBallSpeed;
      // 相位 0→1 为远离 A，1→2 为靠近 A
      const towardB = this.ropePhase <= 1 ? 1 : -1;
      this.ropePrevBPos.copyFrom(posB);
      // 纹理流动速度只与 B 的速度有关：用固定参考长度 refLength，避免绳短时 flowSpeed=speed/length 变大导致视觉上变快
      const flowSpeed = (towardB >= 0 ? -1 : 1) * (speed / Math.max(1e-6, this.ropeRefLength));
      this.ropeFlowOffset += flowSpeed * dt;

      // 绳长变化时：vScale = length/refLength，保证纹理不拉伸/压缩
      const vScale = Math.max(0.01, length / this.ropeRefLength);
      ropeTex.vScale = vScale;
      ropeTex.vOffset = this.ropeFlowOffset;

      // 重建 Tube 以更新路径
      ropeTube.dispose();
      const path = [posA, posB];
      ropeTube = MeshBuilder.CreateTube(
        'ropeTube',
        {
          path,
          radius: ropeRadius,
          tessellation: 8,
          cap: Mesh.CAP_ALL,
        },
        this.scene,
      );
      ropeTube.material = ropeMat;
      ropeTube.isPickable = false;
      this.ropeTube = ropeTube;
    });
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
        onProgress?.(1);
        resolve(hdr);
      });
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

      // 简单输出到控制台，方便在浏览器控制台中复制数值
      // 形如：position: { x, y, z }, target: { x, y, z }
      // eslint-disable-next-line no-console
      console.log('Camera debug click =>', {
        position: { x: pos.x, y: pos.y, z: pos.z },
        target: target ? { x: target.x, y: target.y, z: target.z } : null,
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

  setGround() {
    const light = new HemisphericLight('light', new Vector3(0, -1, 0), this.scene);

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

    this.skyObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.updateSkyByTime();
      this.directionalLightHelper?.update();
      this.cameraHelper?.update();
      this.cameraTargetHelper?.update();
    });
    this.updateSkyByTime();

    const waterGround = MeshBuilder.CreateGround(
      'waterGround',
      { width: 3000, height: 3000, subdivisions: 1 },
      this.scene,
    );
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
    ground.position.y = -20;
    const waterMaterial = new WaterMaterial('water', this.scene, new Vector2(1024, 1024));
    const normal = new Texture('waterbump.png', this.scene, true, false);
    normal.uScale = 3;
    normal.vScale = 3;
    waterMaterial.bumpTexture = normal;
    waterMaterial.windForce = 8;
    waterMaterial.waveHeight = 0.1;
    waterMaterial.bumpHeight = 0.5;
    // waterMaterial.windDirection=new Vector2(-1,0);
    waterMaterial.waveLength = 0.15;
    waterMaterial.waveSpeed = 50;
    waterMaterial.colorBlendFactor = 0.25;
    waterMaterial.sideOrientation = 1;
    waterMaterial.waterColor = new Color3(7 / 255, 41 / 255, 30 / 255);
    this.waterMaterial = waterMaterial;
    // 记录一份默认参数快照，供 UI demo reset（不影响现有默认参数本身）
    this.seaParamsDefaults = this.getSeaParams();

    // 反射/折射对象

    ground.doNotSyncBoundingInfo = true;
    waterGround.material = waterMaterial;
    waterGround.position.y = -4;

    this.createPropellerWaveEffectShader();
    // this.createPropellerWaveEffect();
    this.setPropellerWaveEffectEnabled(this.propellerWaveEnabled);
    // this.scene.debugLayer.show();

    const points = [
      new Vector3(35, 10, 0),
      new Vector3(50, 10, 0),
      new Vector3(50, 0, 0),
      new Vector3(50, -5, 0),
      new Vector3(50, -50, 0),
    ];
    const path = Curve3.CreateCatmullRomSpline(points, 20, false);
    const line = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    const line2 = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    line2.position.z = 3;
    line.position.z = -3;
    const path3D = new Path3D(path.getPoints());
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
    this.scene.meshes.forEach((m) => {
      if (m !== waterGround) {
        waterMaterial.addToRenderList(m);
      }
    });

    // 当相机视角切换到水面下方/上方时，自动开关海水下效果
    // 使用一定的滞后区间，避免在水面附近抖动频繁开关
    const waterY = waterGround.position.y;
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
      { size: 60, width: 80, height: 120 },
      this.scene,
    );
    plane.position.set(-3.2, -3, -48);
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
    const capacity = 6000;
    // 用一个“面”（盒状发射区域）代替左右两条尾流
    const emitterCenter = new Vector3(15.7, 2, 0);

    const tex = new Texture('particle/smoke.png', this.scene, true, false, null);
    tex.hasAlpha = true;

    const ps = new ParticleSystem('propellerWave', capacity, this.scene);
    ps.emitter = emitterCenter;
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
    // 发射区域：在水面附近的一个矩形面（扩大范围）
    ps.createBoxEmitter(
      new Vector3(30, 0, -3.5),
      new Vector3(30, 0, 3.5),
      new Vector3(-0.6, -0.08, -6),
      new Vector3(0.6, 0.08, 6),
    );
    // 生命周期内前段就快速缩小，关闭螺旋桨后几乎看不到“浪带向后移”，只看到波浪在船尾处收掉
    ps.addSizeGradient(0, 1);
    ps.addSizeGradient(0.15, 0.4);
    ps.addSizeGradient(0.35, 0.08);
    ps.addSizeGradient(0.6, 0.02);
    ps.addSizeGradient(1, 0);

    ps.start();

    this.propellerWaveParticles = [ps];
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
      this.createPropellerWaveEffect();
    }
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
   * @param preset 镜头预设（target 必填；可填 position 或 alpha/beta/radius）
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
    const target = toVec3(preset.target);

    let alpha: number;
    let beta: number;
    let radius: number;

    if (preset.position !== undefined) {
      const pos = toVec3(preset.position);
      const offset = pos.subtract(target);
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
