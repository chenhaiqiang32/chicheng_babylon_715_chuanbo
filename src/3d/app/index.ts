import {
  AbstractEngine,
  ActionManager,
  DirectionalLight,
  CascadedShadowGenerator,
  Engine,
  ExecuteCodeAction,
  Mesh,
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
} from '@babylonjs/core';
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

export class App {
  private engine: AbstractEngine;
  private static instance: App;
  private assets: AppAssets;
  scene: Scene;
  private canvas: HTMLCanvasElement;
  weakMap: Map<string, Node> = new Map();
  private skyMaterial?: SkyMaterial;
  private sunLight?: DirectionalLight;
  private skyObserver?: any;
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

  private currentCount = 0;
  allCount = 18;

  async init(canvas: HTMLCanvasElement, gpu: boolean) {
    this.canvas = canvas;
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
    this.engine.setHardwareScalingLevel(2);
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
    this.engine.dispose();
    if (this.skyObserver) {
      this.scene.onBeforeRenderObservable.remove(this.skyObserver);
      this.skyObserver = null;
    }
  }

  setAssetsLibrary(assets: AppAssets) {
    this.assets = assets;
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
    scene.activeCamera.attachControl(this.canvas, true);
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
  getNodeById(id: string): Node {
    let node: Node = getSceneNodeByUUid(this.scene, id, this.weakMap);
    return node;
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
    this.skyObserver = this.scene.onBeforeRenderObservable.add(() => {});
    this.updateSkyByTime();

    const waterGround = MeshBuilder.CreateGround(
      'ground',
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
    waterMaterial.windDirection=new Vector2(-1,0);
    waterMaterial.waveLength = 0.15;
    waterMaterial.waveSpeed = 50;
    waterMaterial.colorBlendFactor = 0.25;
    waterMaterial.sideOrientation = 1;
    waterMaterial.waterColor = new Color3(7 / 255, 41 / 255, 30 / 255);

    // 反射/折射对象

    ground.doNotSyncBoundingInfo = true;
    waterGround.material = waterMaterial;
    waterGround.position.y = 2;

    this.createPropellerWaveEffectShader();
    // this.createPropellerWaveEffect();
    this.setPropellerWaveEffectEnabled(this.propellerWaveEnabled);
    this.scene.debugLayer.show();

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
      { size: 120, width: 120, height: 320 },
      this.scene,
    );
    plane.position.set(72, 4, 0);
    plane.rotation.y = 0;
    plane.rotate(new Vector3(1, 0, 0), Math.PI / 2);
    plane.rotate(new Vector3(0, 0, 1), Math.PI / 2);
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
