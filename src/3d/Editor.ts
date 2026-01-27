import { ViewFlagsMode, useScene } from '@/store/useScene';
import {
  ArcRotateCamera,
  CubeTexture,
  GizmoManager,
  AbstractMesh,
  PBRMaterial,
  Scene,
  Vector3,
  Node,
  Color3,
  Mesh,
  DirectionalLight,
  LightGizmo,
  Light,
  PointLight,
  SpotLight,
  PointerInfo,
  PointerEventTypes,
  TransformNode,
  WebGPUEngine,
  AbstractEngine,
  Plane,
  Texture,
  DefaultRenderingPipeline,
  SSAO2RenderingPipeline,
  SSRRenderingPipeline,
  MotionBlurPostProcess,
  Camera,
  UniversalCamera,
  UtilityLayerRenderer,
  Engine,
  Quaternion,
  ParticleHelper,
  AreaLight,
  RectAreaLight,
  HDRCubeTexture,
  CascadedShadowGenerator,
  ShadowGenerator,
  HavokPlugin,
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsShapeBox,
  PhysicsBody,
  PhysicsMotionType,
  MeshBuilder,
  Tools,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';
import '@babylonjs/materials';
import { nextTick, watch, type WatchHandle } from 'vue';
// import '@babylonjs/inspector';
import { hasViewFlag } from '@/3d/core/utils/viewFlagsMode';
import { Dispatch } from '@/utils/dispatch';
import { ID } from '@/utils/id';
import { Utils } from '@/utils';
import { createDefaultRenderingPipeline } from './rendering/default-pipeline';
import { createSSAO2RenderingPipeline } from './rendering/ssao';
import { createSSRRenderingPipeline } from './rendering/ssr';
import { createMotionBlurPostProcess } from './rendering/motion-blur';
import { registerKeyDown } from '@/utils/ShortcutKey';
import { registerPropertyUndoRedo, registerUndoRedo } from '@/tools/undoredo';
import {
  isAbstractMesh,
  isDirectionalLight,
  isPointLight,
  isSpotLight,
} from '@/tools/guards/nodes';
import { isVector3 } from '@/tools/guards/math';
import { ParticleContainer } from './core/Extension/ParticleContainer';
import { ControlMode } from '@/store/useSceneModule/useControl';
import { Shadow } from './Shadow';
import { OutlinePass } from './rendering/OutlinePass';
import { UniqueNumber } from '@/tools/tools';
import './Extension';

interface EditorEvent {
  nameChanged: { newName: string; id: string };
  numberChanged: { newNumber: number; id: string };
  textureChanged: { newTexture: string; id: string };
  onPositionChanged: { object: TransformNode; newPosition: number[]; oldPosition: number[] };
  onRotationChanged: { object: TransformNode; newRotation: number[]; oldRotation: number[] };
  onScaleChanged: { object: TransformNode; newScale: number[]; oldScale: number[] };
  onSceneChanged: { scene: Scene };
  onSceneChangeBefore: { scene: Scene };
  animationChange: void;
  onActiveCameraChanged: { newUuid: string; oldUuid: string };
  onNodeActiveChanged: { nodeUuid: string; isVisiable: boolean };
}

export class Editor extends Dispatch<EditorEvent> {
  requestId: number;
  async createParticleSystem(arg0: string) {
    const particleSystem = await ParticleHelper.CreateAsync(arg0, this.scene);
    const transformNode = new TransformNode(arg0 + '-particle', this.scene);
    particleSystem.emitterNode = transformNode.position;
    particleSystem.start();
    useScene().setHierarchy(this.scene.rootNodes);
  }
  private scene: Scene;
  private engine: AbstractEngine;
  private gizmoManager: GizmoManager;

  private static instance: Editor;
  private downX = 0;
  private downY = 0;
  private isDown = false;
  shadow: Shadow;
  static get Instance() {
    if (Editor.instance == null) {
      Editor.instance = new Editor();
    }
    return Editor.instance;
  }
  private resScene: Scene;
  get ResScene() {
    if (this.resScene == null) {
      this.resScene = new Scene(this.engine);
    }
    return this.resScene;
  }

  get Scene() {
    return this.scene;
  }

  get Engine() {
    return this.engine;
  }

  private resizeObserver: ResizeObserver;

  private watcher: WatchHandle[] = [];

  private _selectNodes: Node[];

  private enableGizmo: boolean = true;

  private weakMap = new Map<string, Node>();

  private outlinePass: OutlinePass;

  private shadowGenerator: ShadowGenerator;
  get selectNodes() {
    return this._selectNodes;
  }
  set selectNodes(v: Node[]) {
    if (this._selectNodes?.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          this.toggleMeshMask(item, false);
        } else if (item instanceof Light) {
          item.gizmo.scaleRatio = 0; // 关掉灯的gizmo
        }
      });
    }
    this._selectNodes = v;
    if (v.length <= 0) {
      this.gizmoManager.attachToMesh(undefined);
      // this.gizmoManager.boundingBoxGizmoEnabled = false;
      return;
    }
    if (v[0] instanceof AbstractMesh) {
      this.gizmoManager.attachToMesh(v[0]);
    } else if (v[0] instanceof Light) {
      //this.gizmoManager.attachToMesh(v[0]);
      this.gizmoManager.attachToMesh(v[0].gizmo.attachedMesh);
      v[0].gizmo.scaleRatio = 2;
    } else {
      // 如果子节点没有 mesh，则不显示 gizmo
      if (v[0].getChildMeshes()?.length > 0) this.gizmoManager.attachToNode(v[0]);
      else {
        this.gizmoManager.attachToNode(v[0]);
      }
    }
    if (this._selectNodes.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          this.toggleMeshMask(item, true);
        }
      });
    }
  }

  async init(canvas: HTMLCanvasElement, gpu: boolean = false) {
    if (gpu) {
      this.engine = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
      if (this.engine instanceof WebGPUEngine) {
        await this.engine.initAsync();
      }
    } else {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
        limitDeviceRatio: 2,
      });
    }
    this.shadow = new Shadow();
    registerKeyDown((event) => {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'f': {
          this.focusTransformNode();
          break;
        }
        case '1': {
          useScene().currentControlMode = ControlMode.Select;
          break;
        }
        case '2': {
          useScene().currentControlMode = ControlMode.Move;
          break;
        }
        case '3': {
          useScene().currentControlMode = ControlMode.Rotate;
          break;
        }
        case '4': {
          useScene().currentControlMode = ControlMode.Scale;
          break;
        }
        case 'f3': {
          useScene().setHierarchy(this.scene.rootNodes);
          break;
        }
      }
    });
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
    window.addEventListener('resize', this.resize);
    const resizeObserver = new ResizeObserver((entries) => {
      this.resize();
    });
    resizeObserver.observe(canvas);
    useScene().setCurrentControlMode(ControlMode.Move);
    this.initWatch();
  }

  async setCurrentScene(uuid: string, loading?: (v: number) => void) {
    this.weakMap.clear();
    if (this.scene) {
      this.scene.onPointerObservable.removeCallback(this.onPointerDonw);
      this.scene.activeCamera.detachControl();
      Editor.Instance.dispatch('onSceneChangeBefore', { scene: this.scene });
      await useScene().saveScene(this.scene);
      this.scene.dispose();
      // 清理旧的轮廓渲染器
      if (this.outlinePass) {
        this.outlinePass.dispose();
        this.outlinePass = null;
      }
    }
    // 清理旧的阴影生成器
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
      this.shadowGenerator = null;
    }

    const scene = new Scene(this.engine);
    // 等待场景完全加载完成
    useScene().getScene(
      uuid,
      (percent) => {
        loading?.(percent);
      },
      scene,
    );

    if (scene) {
      this.initGizmos(scene);
      scene.activeCamera.attachControl();
      scene.onPointerObservable.add(this.onPointerDonw);
      useScene().currentScene = uuid;
      scene.lights.forEach((light) => {
        const lightGizmo = new LightGizmo();
        lightGizmo.light = light;
        lightGizmo.scaleRatio = 0;
        light.gizmo = lightGizmo;
        //阴影只能场景加载完创建
        if (isDirectionalLight(light) || isPointLight(light) || isSpotLight(light)) {
          {
            const sg = Editor.Instance.shadow.getShadowGenerator(light);
            if (sg) {
              sg.getLight()
                .getScene()
                .meshes.forEach((item) => {
                  if (item.castShadows) {
                    Editor.Instance.shadow.addMeshToShadowGenerator(item, light);
                  }
                });
            }
          }
        }

        // const generator = new CascadedShadowGenerator(4096, light as DirectionalLight);
        // generator.bias = 0.00268;
        // generator.lambda = 1;
        // generator.depthClamp = true;
        // generator.autoCalcDepthBounds = true;
        // generator.autoCalcDepthBoundsRefreshRate = 60;
        // generator.transparencyShadow = true;
        // generator.enableSoftTransparentShadow = true;
        // generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
        // console.log(generator.getClassName?.());
      });
      // scene.meshes.forEach((item) => {
      //   item.receiveShadows = true;
      // });
    }
    this.scene = scene;
    this.outlinePass = new OutlinePass(0.003, new Vector3(1, 64 / 255, 0), this.scene.activeCamera);
    useScene().setCurrentViewFlagsMode(ViewFlagsMode.Gizmos, ViewFlagsMode.Mask);
    this.dispatch('onSceneChanged', { scene });
    useScene().setHierarchy(scene.rootNodes);
  }
  getRaycastPoint(x?: number, y?: number) {
    // 1. 创建拾取射线
    const ray = this.scene.createPickingRay(
      x ?? this.scene.pointerX,
      y ?? this.scene.pointerY,
      null, // 推荐写法
      this.scene.activeCamera,
    );

    // 2. 先尝试拾取场景中的网格
    const pickInfo = this.scene.pickWithRay(ray);
    if (pickInfo?.hit && pickInfo.pickedPoint) {
      return pickInfo.pickedPoint;
    }

    const groundPlane = new Plane(0, 1, 0, 0); // 平面方程：y = 0

    const distance = ray.intersectsPlane(groundPlane);

    if (distance !== null) {
      // 根据距离计算交点坐标：origin + direction * distance
      return ray.origin.add(ray.direction.scale(distance));
    }

    // 极少数情况：射线与平面完全平行（几乎不可能在正常视角下发生）
    return null;
  }
  getRaycastMesh(x?: number, y?: number) {
    const ray = this.scene.createPickingRay(
      x ?? this.scene.pointerX,
      y ?? this.scene.pointerY,
      null,
      this.scene.activeCamera,
    );
    const pickInfo = this.scene.pickWithRay(ray);
    return pickInfo;
  }

  async createNewScene(arg0: string) {
    //  const scene = await this.createScene();
    const scene = await this.createNewDefaultScene();
    scene.name = arg0;
    scene.uuid = ID.generateUUID();
    return scene;
  }

  initWatch() {
    const selectWatcher = watch(
      () => useScene().currentSelected,
      (v) => {
        this.selectNodes = v?.map((x: string) => this.getNodeById(x)) ?? [];
      },
    );
    const controlModeWatcher = watch(
      () => useScene().currentControlMode,
      (v) => {
        this.switchControlType(v);
      },
    );
    const viewFlagsModeWatcher = watch(
      () => useScene().currentViewFlagsMode,
      (v) => {
        this.switchViewFlagsMode(v);
      },
    );
    this.watcher.push(selectWatcher);
    this.watcher.push(controlModeWatcher);
    this.watcher.push(viewFlagsModeWatcher);

    // 监听灯光位置和旋转变化，更新阴影
    this.on('onPositionChanged', this.onLightTransformChanged);
    this.on('onRotationChanged', this.onLightTransformChanged);
  }

  private onLightTransformChanged = (e: { object: TransformNode }) => {
    // 检查移动的是否是灯光的 gizmo
    if (!this.shadowGenerator || !this.scene) {
      return;
    }

    // 检查是否是第一个灯光（有阴影生成器的灯光）的 gizmo
    const light = this.scene.lights[0];
    if (light && light.gizmo && light.gizmo.attachedMesh === e.object) {
      // ShadowGenerator 会自动跟随灯光更新，但我们可以强制刷新一次
      // 确保阴影立即更新
      const shadowMap = this.shadowGenerator.getShadowMap();
      if (shadowMap) {
        // 强制渲染一次阴影贴图
        shadowMap.render();
      }
    }
  };

  newResScene() {
    const scene = new Scene(this.engine);
    const env = new CubeTexture('./abandoned_factory_canteen_01', scene);
    scene.environmentTexture = env;
    scene.useRightHandedSystem = false;
    return scene;
  }

  async createScene() {
    const scene = new Scene(this.engine);
    scene.useRightHandedSystem = false;
    const camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 0, 0), scene);
    camera.setPosition(new Vector3(0, 2, -5));
    camera.minZ = 0.001;
    camera.maxZ = 5000;
    camera.attachControl();
    camera.lowerRadiusLimit = 0.01;
    camera.wheelPrecision = 0;
    camera.pinchDeltaPercentage = 0.1;
    camera.wheelDeltaPercentage = 0.1;
    camera.upperRadiusLimit = 5000;
    camera.inertia = 0.4;
    camera.panningInertia = 0.5;

    const env = new CubeTexture('./abandoned_factory_canteen_01', scene);
    scene.environmentTexture = env;
    this.createLight('directional', scene);
    return scene;
  }
  async createNewDefaultScene() {
    const scene = new Scene(this.engine);
    scene.useRightHandedSystem = false;

    const camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 0, 0), scene);
    camera.setPosition(new Vector3(30, 30, -5));
    camera.minZ = 0.01;
    camera.maxZ = 5000;
    camera.attachControl();
    camera.lowerRadiusLimit = 0.01;
    camera.wheelPrecision = 0;
    camera.pinchDeltaPercentage = 0.1;
    camera.wheelDeltaPercentage = 0.1;
    camera.upperRadiusLimit = 5000;
    camera.inertia = 0.4;
    camera.panningInertia = 0.5;

    const ground = MeshBuilder.CreateGround('New Ground', { width: 100, height: 100 });
    ground.rotationQuaternion = new Quaternion(0, 0, 0);
    // ground.flipFaces();
    this.configureAddedMesh(scene, ground);

    ground.name = 'ground';
    ground.receiveShadows = true;
    const groundMaterial = new PBRMaterial('groundMaterial', scene);
    groundMaterial.metallic = 0;
    groundMaterial.roughness = 1;
    const textureUrl = Tools.GetAssetUrl('/DefaultScene/albedo.png');
    const groundAlbedoTexture = new Texture(textureUrl, scene);
    groundAlbedoTexture.uScale = 50;
    groundAlbedoTexture.vScale = 50;
    groundAlbedoTexture.anisotropicFilteringLevel = 4;
    groundMaterial.albedoTexture = groundAlbedoTexture;

    ground.material = groundMaterial;

    const box = MeshBuilder.CreateBox('New Box', { width: 10, depth: 10, height: 10 });
    box.rotationQuaternion = new Quaternion(0, 0, 0);
    // box.flipFaces();
    this.configureAddedMesh(scene, box);
    box.name = 'box';
    box.position.y = 5;
    box.receiveShadows = true;
    box.castShadows = true;
    const boxMaterial = new PBRMaterial('boxMaterial', scene);
    boxMaterial.directIntensity = 1;
    boxMaterial.emissiveIntensity = 1;
    boxMaterial.environmentIntensity = 1;
    boxMaterial.specularIntensity = 1;
    boxMaterial.albedoColor = new Color3(1, 1, 1);
    boxMaterial.emissiveColor = new Color3(0, 0, 0);
    boxMaterial.metallic = 0;
    boxMaterial.roughness = 1;

    const textureUrl1 = Tools.GetAssetUrl('/DefaultScene/amiga.jpg');
    const albedoTexture = new Texture(textureUrl1, scene);
    albedoTexture.uScale = 1;
    albedoTexture.vScale = 1;
    albedoTexture.anisotropicFilteringLevel = 4;
    boxMaterial.albedoTexture = albedoTexture;

    box.material = boxMaterial;

    const env = new CubeTexture('/DefaultScene/country.env', scene);
    scene.environmentTexture = env;
    scene.ambientColor = new Color3(0, 0, 0);

    const light = this.createLight('directional', scene) as DirectionalLight;
    light.position = new Vector3(10, 20, 10);
    light.direction = new Vector3(-1, -2, -1);
    light.intensity = 3.43;
    light.name = 'sun';
    light.createDefaultShadowGenerator = true;
    // const sg = Editor.Instance.shadow.openShadow(light, "cascaded") as CascadedShadowGenerator;
    // sg.lambda = 1;
    // sg.bias = 0.0005;
    // sg.depthClamp = true;
    // sg.autoCalcDepthBounds = true;
    // sg.autoCalcDepthBoundsRefreshRate = 60;
    // sg.getShadowMap()?.renderList?.push(box);
    // sg.addShadowCaster(box);
    // sg.usePercentageCloserFiltering = true;
    // sg.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    // sg.transparencyShadow = true;
    // sg.enableSoftTransparentShadow = true;
    // sg.getShadowMap()?.renderList?.push(...sg.getLight().getScene().meshes);
    const sg = Editor.Instance.shadow.openShadow(light, 'cascaded') as CascadedShadowGenerator;
    sg.lambda = 1;
    sg.bias = 0.0005;
    sg.depthClamp = true;
    sg.autoCalcDepthBounds = true;
    sg.autoCalcDepthBoundsRefreshRate = 60;
    sg.usePercentageCloserFiltering = true;
    sg.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    sg.transparencyShadow = true;
    sg.enableSoftTransparentShadow = true;
    sg.getShadowMap()?.renderList?.push(...sg.getLight().getScene().meshes);
    Editor.Instance.shadow.addMeshToShadowGenerator(ground, light);
    scene.bgType = 1;
    return scene;
  }

  configureAddedMesh(scene: Scene, mesh: AbstractMesh, parent?: Node) {
    mesh.receiveShadows = true;
    mesh.id = Tools.RandomId();
    mesh.uniqueId = UniqueNumber.Get();
    mesh.parent = parent ?? null;

    if (mesh.geometry) {
      mesh.geometry.id = Tools.RandomId();
      mesh.geometry.uniqueId = UniqueNumber.Get();

      scene.lights.forEach((light) => {
        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(mesh);
      });
    }
    return mesh;
  }

  createLight(type: 'directional' | 'point' | 'spot' | 'area', scene: Scene): Light {
    let light: Light;
    switch (type) {
      case 'directional':
        light = new DirectionalLight('dirLight', new Vector3(0, -1, -1), scene);
        break;
      case 'point':
        light = new PointLight('pointLight', new Vector3(0, 0, 0), scene);
        break;
      case 'area':
        light = new RectAreaLight('areaLight', new Vector3(0, 0, 0), 1, 1, scene);
        break;
      case 'spot':
        light = new SpotLight(
          'spotLight',
          new Vector3(0, 0, 0),
          new Vector3(0, -1, -1),
          Math.PI / 4,
          1,
          scene,
        );
        break;
      default:
        light = new DirectionalLight('dirLight', new Vector3(0, -1, -1), scene);
        break;
    }
    if (light) {
      const layer = new UtilityLayerRenderer(scene);
      const lightGizmo = new LightGizmo(layer);
      lightGizmo.light = light;
      lightGizmo.scaleRatio = 0;
      light.gizmo = lightGizmo;
    }
    light.uuid = ID.generateUUID();
    return light;
  }

  resize = () => {
    this.engine.resize();
  };

  /**
   * 获取场景中指定ID的节点
   * @param id 节点的唯一ID
   * @returns 找到的节点，或null
   */
  getNodeById(id: string): Node {
    let node: Node = getSceneNodeByUUid(this.scene, id, this.weakMap);
    return node;
  }
  gizmoLayer: UtilityLayerRenderer;
  /**
   * 初始化 gizmo
   */
  initGizmos(scene: Scene) {
    if (this.gizmoManager) this.gizmoManager.dispose();
    if (this.gizmoLayer) this.gizmoLayer.dispose();

    this.gizmoLayer = new UtilityLayerRenderer(scene);
    this.gizmoManager = new GizmoManager(scene, 1, this.gizmoLayer);
    this.gizmoManager.enableAutoPicking = false;
    this.gizmoManager.positionGizmoEnabled = true;

    // this.gizmoManager.boundingBoxGizmoEnabled = true;
    // this.gizmoManager.gizmos.boundingBoxGizmo.fixedDragMeshBoundsSize = true;
    // this.gizmoManager.boundingBoxGizmoEnabled = false;

    // 添加灯光 gizmo

    this.gizmoManager.boundingBoxDragBehavior.onDragStartObservable.add(() => {});
    this.gizmoManager.boundingBoxDragBehavior.onDragEndObservable.add(() => {});
    this.gizmoManager.boundingBoxDragBehavior.onPositionChangedObservable.add(() => {});

    this.gizmoManager.rotationGizmoEnabled = true;
    this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
    const startRotation = new Vector3();
    const startRotationQuaternion = new Quaternion();
    const startPosition = new Vector3();
    const startScaling = new Vector3();
    this.gizmoManager.gizmos.rotationGizmo.onDragStartObservable.add(() => {
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);
      if (node.rotationQuaternion) {
        startRotationQuaternion.copyFrom(node.rotationQuaternion);
      }
      if (node.rotation) {
        startRotation.copyFrom(node.rotation);
      }
    });

    this.gizmoManager.gizmos.rotationGizmo.onDragObservable.add(() => {
      //拖拽中
    });
    this.gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(() => {
      // 拖拽结束
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);

      if (node.rotationQuaternion) {
        const oldRotation = startRotationQuaternion.clone();
        const newRotation = node.rotationQuaternion.clone();
        registerUndoRedo({
          undo: () => {
            node.rotationQuaternion.copyFrom(oldRotation);
          },
          redo: () => {
            node.rotationQuaternion.copyFrom(newRotation);
          },
          executeRedo: false,
        });
      } else {
        const oldRotation = startRotation.clone();
        const newRotation = node.rotation.clone();
        registerUndoRedo({
          undo: () => {
            node.rotation.copyFrom(oldRotation);
          },
          redo: () => {
            node.rotation.copyFrom(newRotation);
          },
          executeRedo: false,
        });
      }
    });

    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);
      registerPropertyUndoRedo({
        object: node,
        property: 'position',
        oldValue: startPosition.clone(),
        newValue: node.position.clone(),
        executeRedo: false,
      });
      this.dispatch('onPositionChanged', {
        object: node,
        newPosition: node.position.asArray(),
        oldPosition: startPosition.asArray(),
      });
    });
    this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(() => {
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);
      startPosition.copyFrom(node.position);
    });
    this.gizmoManager.scaleGizmoEnabled = true;
    this.gizmoManager.gizmos.scaleGizmo.onDragEndObservable.add(() => {
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);
      registerPropertyUndoRedo({
        object: node,
        property: 'scaling',
        oldValue: startScaling.clone(),
        newValue: node.scaling.clone(),
        executeRedo: false,
      });
      this.dispatch('onScaleChanged', {
        object: node,
        newScale: node.scaling.asArray(),
        oldScale: startScaling.asArray(),
      });
    });
    this.gizmoManager.gizmos.scaleGizmo.onDragStartObservable.add(() => {
      const node =
        this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode);
      startScaling.copyFrom(node.scaling);
    });
    this.gizmoManager.scaleGizmoEnabled = false;
  }

  focusTransformNode(node?: ParticleContainer) {
    if (!node) {
      node = this._selectNodes[0] instanceof ParticleContainer ? this._selectNodes[0] : null;
    }
    if (!node) {
      return;
    }
    console.log('focusTransformNode', node);
    let min: Vector3, max: Vector3;
    if (node.particleSystems) {
      const firstSystem = node.particleSystems.systems[0];
      if (isAbstractMesh(firstSystem.emitter)) {
        console.log('firstSystem.emitter');
        const boundingInfo = firstSystem.emitter.getBoundingInfo();
        min = boundingInfo.boundingBox.minimumWorld;
        max = boundingInfo.boundingBox.maximumWorld;
      } else if (isVector3(firstSystem.emitter)) {
        const emitterPos = firstSystem.emitter as Vector3;
        min = new Vector3(emitterPos.x - 0.5, emitterPos.y - 0.5, emitterPos.z - 0.5);
        max = new Vector3(emitterPos.x + 0.5, emitterPos.y + 0.5, emitterPos.z + 0.5);
      }
    } else {
      min = node.getHierarchyBoundingVectors(true).min;
      max = node.getHierarchyBoundingVectors(true).max;
    }

    //const { min, max } = node.getHierarchyBoundingVectors(true);
    const center = new Vector3().add(min).add(max).scale(0.5);

    const size = new Vector3().add(max).subtract(min);
    const radius = Math.max(size.x, size.y, size.z) * 2;
    let currentDirectionToCenter = center.subtract(this.scene.activeCamera.globalPosition);
    const currentDistance = currentDirectionToCenter.length();

    // 如果相机正好就在中心点（极少见），用一个默认方向兜底
    if (currentDistance < 0.001) {
      currentDirectionToCenter = new Vector3(1, 1, 1);
    }

    // 归一化得到纯方向
    const directionFromCameraToCenter = currentDirectionToCenter.normalize();

    // 3. 目标距离 = 包围球半径 × multiplier
    const targetDistance = radius * 1;

    // 4. 新相机位置 = 中心 - 方向 × 目标距离
    //    也就是沿着「当前视线」往后退到合适距离
    const newPosition = center.subtract(directionFromCameraToCenter.scale(targetDistance));

    if (this.scene.activeCamera instanceof ArcRotateCamera) {
      Utils.animate((x) => {
        this.scene.activeCamera.position = Vector3.Lerp(
          this.scene.activeCamera.globalPosition,
          newPosition,
          x,
        );
        //@ts-ignore
        this.scene.activeCamera.target = Vector3.Lerp(this.scene.activeCamera.target, center, x);
      }, 0.5);
    }
  }

  /** 射线检测选中的 object */
  raycastSelect(x: number, y: number) {
    const ray = this.scene.createPickingRay(
      x ?? this.scene.pointerX,
      y ?? this.scene.pointerY,
      null,
      this.scene.activeCamera,
    );
    const pickInfo = this.scene.pickWithRay(ray);
    // 赋值当前选中的 Object
    if (pickInfo.hit) {
      useScene().setCurrentSelect([pickInfo.pickedMesh.uuid]);
    } else {
      useScene().setCurrentSelect();
    }
  }

  // 切换控制模式：选择/移动/旋转/缩放
  switchControlType(mode: ControlMode) {
    switch (mode) {
      case ControlMode.Select:
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
        // 选择模式的话把 view 都关掉
        useScene().setCurrentViewFlagsMode(ViewFlagsMode.None);
        break;

      case ControlMode.Move:
        this.gizmoManager.positionGizmoEnabled = true;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
        break;

      case ControlMode.Rotate:
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = true;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
        break;

      case ControlMode.Scale:
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = true;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
        break;
    }
  }

  // 判断是否有对应位的 flag -> 执行对应位的操作
  switchViewFlagsMode(mode: ViewFlagsMode) {
    this.setEnableGizmos(hasViewFlag(mode, ViewFlagsMode.Gizmos));
    this.setEnableMask(hasViewFlag(mode, ViewFlagsMode.Mask));
  }

  setEnableGizmos(flag: boolean) {
    this.enableGizmo = flag;
    // this.gizmoManager.boundingBoxGizmoEnabled = flag;
  }

  setEnableMask(flag: boolean) {
    this.outlinePass.enable(flag);
  }

  toggleMeshMask(mesh: Mesh, isOn: boolean) {
    if (isOn) {
      this.outlinePass.addToRenderList(mesh);
    } else {
      this.outlinePass.removeFromRenderList(mesh);
    }
  }
  onPointerDonw = (pointerInfo: PointerInfo) => {
    const evt = pointerInfo.event;
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        if (evt.button === 0) {
          this.isDown = true;
          this.downX = evt.clientX;
          this.downY = evt.clientY;
        }
        break;

      case PointerEventTypes.POINTERUP:
        if (evt.button === 0 && this.isDown) {
          const dx = evt.clientX - this.downX;
          const dy = evt.clientY - this.downY;
          const isDrag = Math.sqrt(dx * dx + dy * dy) > 3;
          if (!isDrag) {
            const bound = this.engine.getRenderingCanvas().getBoundingClientRect();
            this.raycastSelect(evt.clientX - bound.left, evt.clientY - bound.top);
          }
        }
        this.isDown = false;
        break;
    }
  };

  addUniversalCamera(name: string = null): Camera {
    const camera = new UniversalCamera(
      name ? name : '1stCamera',
      new Vector3(0, 1, -5),
      this.scene,
    );
    camera.speed = 1;
    camera.inertia = 0;
    camera.keysUp.push(87); // W (keyCode 87)
    camera.keysDown.push(83); // S (83)
    camera.keysLeft.push(65); // A (65)
    camera.keysRight.push(68); // D (68)
    this.scene.meshes.forEach((m) => m.createOrUpdateSubmeshesOctree());
    // 设置 QE 为垂直升降（默认没有，需要手动添加）
    camera.keysUpward.push(69); // E 上昇 (69)
    camera.keysDownward.push(81); // Q 下降 (81)

    // 开启场景和摄像机碰撞
    camera.checkCollisions = true;
    camera.ellipsoid = new Vector3(0.4, 1.2, 0.4);
    nextTick(() => {
      this.activeCamera(camera);
    });
    return camera;
  }

  /**
   * 添加相机，会将相机设置为场景的activeCamera
   * @param name 相机名
   */
  addCamera(name: string = null): Camera {
    const camera = new ArcRotateCamera(
      name ? name : 'camera',
      0,
      0,
      0,
      new Vector3(0, 0, 0),
      this.scene,
    );
    camera.minZ = 0.001;
    camera.maxZ = 5000;
    camera.lowerRadiusLimit = 0.01;
    camera.upperRadiusLimit = 5000;
    camera.inertia = 0.4;
    camera.panningInertia = 0.5;
    // 等 tree 更新完成后在更新视图
    nextTick(() => {
      this.activeCamera(camera);
    });
    return camera;
  }

  activeCamera(camera: Camera) {
    const oldUuid = this.scene.activeCamera.uuid;
    this.scene.activeCamera.detachControl();
    this.scene.activeCamera = camera;
    this.scene.activeCamera.attachControl();
    this.dispatch('onActiveCameraChanged', { oldUuid: oldUuid, newUuid: camera.uuid });
  }

  /**
   * 切换节点的 isActive 属性，会通知给 hierarchy 切换对应图标状态
   */
  switchNodeActive(nodeUuid: string, isVisiable: boolean) {
    this.dispatch('onNodeActiveChanged', { nodeUuid: nodeUuid, isVisiable: isVisiable });
  }

  getRenderingPipeline(createNew = true) {
    let renderingPipeline = this.scene.postProcessRenderPipelineManager.supportedPipelines.find(
      (x) => x instanceof DefaultRenderingPipeline,
    );
    if (!renderingPipeline && createNew) {
      renderingPipeline = createDefaultRenderingPipeline(this.scene);
    }
    return renderingPipeline;
  }
  getSSAORenderingPipeline(createNew = true) {
    let ssaoRenderingPipeline = this.scene.postProcessRenderPipelineManager.supportedPipelines.find(
      (x) => x instanceof SSAO2RenderingPipeline,
    );
    if (!ssaoRenderingPipeline && createNew) {
      ssaoRenderingPipeline = createSSAO2RenderingPipeline(this.scene);
    }
    return ssaoRenderingPipeline;
  }
  getSSRRenderingPipeline(createNew = true) {
    let ssrRenderingPipeline = this.scene.postProcessRenderPipelineManager.supportedPipelines.find(
      (x) => x instanceof SSRRenderingPipeline,
    );
    if (!ssrRenderingPipeline && createNew) {
      ssrRenderingPipeline = createSSRRenderingPipeline(this.scene);
    }
    return ssrRenderingPipeline;
  }
  getMotionBlurPostProcess(createNew = true) {
    let motionBlurPostProcess = this.scene.postProcesses.find(
      (x) => x instanceof MotionBlurPostProcess,
    );
    if (!motionBlurPostProcess && createNew) {
      motionBlurPostProcess = createMotionBlurPostProcess(this.scene);
      this.scene.postProcesses.push(motionBlurPostProcess);
    }
    return motionBlurPostProcess;
  }
  UpdateHierarchy() {
    useScene().setHierarchy(this.scene.rootNodes);
  }
}

export function applyEnvironmentToPBR(mat: PBRMaterial, scene: Scene) {
  if (!mat || !(mat instanceof PBRMaterial)) return;
  if (scene.environmentTexture) {
    mat.environmentBRDFTexture = scene.environmentTexture;
  }
}

function preiver() {
  // const sphere = MeshBuilder.CreateSphere('sphere', {
  //   diameter: 1,
  // });
  // sphere.layerMask = 0x20000000;
  // const mat = new PBRMaterial('mat', this.scene);
  // mat.emissiveColor = Color3.Random();
  // sphere.material = mat;
  // const size = 256;
  // // 2. 创建专用预览相机（不影响主相机）
  // if (!this.rt) {
  //   const cam = new ArcRotateCamera(
  //     'previewCam',
  //     Math.PI / 4,
  //     Math.PI / 3.5,
  //     2,
  //     sphere.getBoundingInfo().boundingBox.center,
  //     this.scene,
  //   );
  //   this.rt = new RenderTargetTexture('previewRT', size, this.scene, false, true);
  //   this.scene.customRenderTargets.push(this.rt);
  //   this.rt.activeCamera = cam;
  //   this.rt.clearColor = new Color4(0.1, 0.1, 0.1, 0);
  //   cam.layerMask = 0x20000000;
  // }
  // this.rt.activeCamera.setTarget(sphere.position);
  // this.rt.renderList?.push(sphere);
  // Tools.CreateScreenshotUsingRenderTarget(
  //   this.engine,
  //   this.rt.activeCamera,
  //   size,
  //   (e) => {},
  //   'image/png',
  //   8,
  //   true,
  //   '1.png',
  //   false,
  // );
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
    if(node.isDeleted) return null;
    return node;
  }
  const children = node.getChildren();
  if (children?.length > 0) {
    for (let index = 0; index < children.length; index++) {
      const ret = getNodeByUUid(children[index], uuid, weakMap);
      if (ret) {
        if(node.isDeleted) return null;
        return ret;
      }
    }
  }
}
