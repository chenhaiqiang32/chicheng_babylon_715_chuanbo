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
} from '@babylonjs/core';
import { AppAssets } from '../assets/PublishLibrary';
import { ArrayUtils } from '@/utils/Array';
import { Shadow } from '../Shadow';
import { isDirectionalLight, isPointLight, isSpotLight } from '@/tools/guards/nodes';
import { SkyMaterial, WaterMaterial } from '@babylonjs/materials';
import gsap from 'gsap';

export class App {
  private engine: AbstractEngine;
  private static instance: App;
  private assets: AppAssets;
  scene: Scene;
  private shadow: Shadow;
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

  async init(canvas: HTMLCanvasElement, gpu: boolean) {
    this.canvas = canvas;
    if (gpu) {
      this.engine = new Engine(canvas, true, {
        antialias: true,
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
      // this.engine = new WebGPUEngine(canvas, {
      //   adaptToDeviceRatio: true,
      //   limitDeviceRatio: 2,
      // });
      if (this.engine instanceof WebGPUEngine) {
        await this.engine.initAsync();
      }
    } else {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
    }
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
    this.shadow = new Shadow();
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
    scene.lights.forEach((light) => {
      if (light.shadowGenerator) {
        const generator = light.isShadowGenerator
          ? ShadowGenerator.Parse(light.shadowGenerator, scene)
          : CascadedShadowGenerator.Parse(light.shadowGenerator, scene);
        this.shadow.addShadowGeneratorMap(light.uuid, generator);
      }
      if (isDirectionalLight(light) || isPointLight(light) || isSpotLight(light)) {
        {
          const sg = this.shadow.getShadowGenerator(light);
          if (!sg) {
            return;
          }
          sg.getLight()
            .getScene()
            .meshes.forEach((item) => {
              if (item.castShadows) {
                this.shadow.addMeshToShadowGenerator(item, light);
              }
            });
        }
      }
    });
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
    const box = MeshBuilder.CreateBox(
      'box',
      { width: 1000, height: 1000, depth: 1000 },
      this.scene,
    );
    box.position.y = 5;
    const skyBox = new PBRMaterial('skyBox', this.scene);
    skyBox.backFaceCulling = false;
    box.material = skyBox;
    const tex = new HDRCubeTexture('bell_park_dawn.hdr', this.scene, 512);
    tex.coordinatesMode = Texture.SKYBOX_MODE;
    skyBox.reflectionTexture = tex;

    let sun = this.scene.lights.find((l) => l instanceof DirectionalLight) as DirectionalLight;
    if (!sun) {
      sun = new DirectionalLight('sunLight', new Vector3(0, -1, 0), this.scene);
      sun.intensity = 1.0;
    }

    this.skyObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.updateSkyByTime();
    });
    const waterGround = MeshBuilder.CreateGround(
      'ground',
      { width: 3000, height: 3000 },
      this.scene,
    );
    const waterMaterial = new WaterMaterial('water', this.scene, new Vector2(1024, 1024));
    waterMaterial.bumpTexture = new Texture('waterbump.png', this.scene, true, false);
    waterMaterial.bumpTexture.scale(500);
    waterMaterial.windForce = -8;
    waterMaterial.waveHeight = 0.25;
    waterMaterial.bumpHeight = 0.1;
    waterMaterial.waveLength = 0.15;
    waterMaterial.waveSpeed = 0.15;
    waterMaterial.colorBlendFactor = 0.25;
    waterMaterial.waterColor = new Color3(0.1, 0.1, 0.6);
    const box2 = MeshBuilder.CreateBox('box', { width: 10, height: 10, depth: 10 }, this.scene);
    box2.position.y = -15;
    box2.position.z = 20;

    gsap.to(box2.position, {
      y: 15,
      duration: 2,
      ease: 'power2.inOut',
      repeat: -1,
      yoyo: true,
    });

    // 反射/折射对象
    this.scene.meshes.forEach((m) => {
      if (m !== waterGround) {
        waterMaterial.addToRenderList(m);
      }
    });
    waterGround.material = waterMaterial;
    waterGround.position.y = 5;
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
