import { ControlMode, ViewFlagsMode, useScene } from '@/store/useScene';
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
  Matrix,
  Light,
  PointLight,
  SpotLight,
  PointerInfo,
  PointerEventTypes,
  TransformNode,
  WebGPUEngine,
  RenderTargetTexture,
  AbstractEngine,
  Plane,
  DefaultRenderingPipeline,
  SSAO2RenderingPipeline,
  SSRRenderingPipeline,
  MotionBlurPostProcess,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';
import '@babylonjs/materials';
import { watch, type WatchHandle } from 'vue';
// import '@babylonjs/inspector';
import { hasViewFlag } from '@/3d/core/utils/viewFlagsMode';
import { Dispatch } from '@/utils/dispatch';
import { ID } from '@/utils/id';
import { Utils } from '@/utils';
import { createDefaultRenderingPipeline } from './rendering/default-pipeline';
import { createSSAO2RenderingPipeline } from './rendering/ssao';
import { createSSRRenderingPipeline } from './rendering/ssr';
import { createMotionBlurPostProcess } from './rendering/motion-blur';

interface EditorEvent {
  nameChanged: { newName: string; id: string };
  numberChanged: { newNumber: number; id: string };
  textureChanged: { newTexture: string; id: string };
  onPositionChanged: { object: TransformNode };
  onPositionStartChanged: { object: TransformNode };
  onRotationChanged: { object: TransformNode };
  onRotationStartChanged: { object: TransformNode };
  onScaleStartChanged: { object: TransformNode };
  onScaleChanged: { object: TransformNode };
  onSceneChanged: { scene: Scene };
}

export class Editor extends Dispatch<EditorEvent> {
  private scene: Scene;
  private engine: AbstractEngine;
  private gizmoManager: GizmoManager;

  private static instance: Editor;
  private downX = 0;
  private downY = 0;
  private isDown = false;
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

  private enableMask: boolean = true;
  private weakMap = new Map<string, Node>();

  get selectNodes() {
    return this.selectNodes;
  }
  set selectNodes(v: Node[]) {
    if (this._selectNodes?.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          this.toggleMeshMask(item, false);
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
    } else {
      // 如果子节点没有 mesh，则不显示 gizmo
      if (v[0].getChildMeshes().length > 0) this.gizmoManager.attachToNode(v[0]);
      else {
        this.gizmoManager.attachToNode(v[0]);
      }
    }
    if (this._selectNodes.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          this.toggleMeshMask(item, this.enableMask);
        }
      });
    }
  }

  async init(canvas: HTMLCanvasElement) {
    this.engine = new WebGPUEngine(canvas, {
      adaptToDeviceRatio: true,
      limitDeviceRatio: 2,
    });
    if (this.engine instanceof WebGPUEngine) {
      await this.engine.initAsync();
    }
    this.initFocus();

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

  async setCurrentScene(uuid: string) {
    this.weakMap.clear();
    if (this.scene) {
      this.scene.onPointerObservable.removeCallback(this.onPointerDonw);
      this.scene.activeCamera.detachControl();
      useScene().saveScene(this.scene);
      this.scene.dispose();
    }
    const scene = await useScene().getScene(uuid);
    if (scene) {
      this.initGizmos(scene);
      scene.activeCamera.attachControl();
      scene.onPointerObservable.add(this.onPointerDonw);
      useScene().currentScene = uuid;
    }
    this.scene = scene;
    useScene().setHierarchy(scene.rootNodes);
    useScene().setCurrentViewFlagsMode(ViewFlagsMode.Gizmos, ViewFlagsMode.Mask);
    this.dispatch('onSceneChanged', { scene });
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

    // 3. 没点到任何物体 → 与地面求交
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
    const scene = await this.createScene();
    scene.name = arg0;
    scene.uuid = ID.generateUUID();
    return scene;
  }

  initWatch() {
    const selectWatcher = watch(
      () => useScene().currentSelected,
      (v) => {
        this.selectNodes = v?.map((x) => this.getNodeById(x)) ?? [];
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
  }

  newResScene() {
    const scene = new Scene(this.engine);
    const env = CubeTexture.CreateFromPrefilteredData('./abandoned_factory_canteen_01.env', scene);
    scene.environmentTexture = env;
    scene.useRightHandedSystem = false;
    return scene;
  }

  async createScene() {
    const scene = new Scene(this.engine);
    scene.useRightHandedSystem = false;
    const camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 0, 0), scene);
    // camera.allowUpsideDown = true;
    camera.minZ = 0.001;
    camera.maxZ = 5000;
    camera.attachControl();
    camera.lowerRadiusLimit = 0.01;
    camera.upperRadiusLimit = 5000;
    camera.inertia = 0.4;
    camera.panningInertia = 0.5;

    const env = CubeTexture.CreateFromPrefilteredData('./abandoned_factory_canteen_01.env', scene);
    scene.environmentTexture = env;
    scene.iblIntensity = 0.5;
    this.createLight('directional', scene);

    return scene;
  }

  private createLight(type: 'directional' | 'point' | 'spot', scene: Scene) {
    let light: Light;
    switch (type) {
      case 'directional':
        light = new DirectionalLight('dirLight', new Vector3(0, -1, -1), scene);
        break;
      case 'point':
        light = new PointLight('pointLight', new Vector3(0, 0, 0), scene);
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
    if (!light) {
      const lightGizmo = new LightGizmo();
      lightGizmo.light = light;
      lightGizmo.scaleRatio = 2;
    }
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

  /**
   * 初始化 gizmo
   */
  initGizmos(scene: Scene) {
    this.gizmoManager = new GizmoManager(scene);
    this.gizmoManager.enableAutoPicking = false;
    this.gizmoManager.positionGizmoEnabled = true;

    // this.gizmoManager.boundingBoxGizmoEnabled = true;
    // this.gizmoManager.gizmos.boundingBoxGizmo.fixedDragMeshBoundsSize = true;
    // this.gizmoManager.boundingBoxGizmoEnabled = false;

    // 添加灯光 gizmo

    this.gizmoManager.boundingBoxDragBehavior.onDragStartObservable.add(() => {});

    this.gizmoManager.boundingBoxDragBehavior.onDragEndObservable.add(() => {});
    this.gizmoManager.boundingBoxDragBehavior.onPositionChangedObservable.add(() => {});

    // 非等比例下无法缩放，需要将 update... 设置为 false
    this.gizmoManager.rotationGizmoEnabled = true;
    this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmoManager.gizmos.rotationGizmo.onDragObservable.add(() => {
      this.dispatch('onRotationChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.gizmos.rotationGizmo.onDragStartObservable.add(() => {
      this.dispatch('onRotationStartChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.rotationGizmoEnabled = false;

    this.gizmoManager.gizmos.positionGizmo.onDragObservable.add(() => {
      this.dispatch('onPositionChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(() => {
      this.dispatch('onPositionStartChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.scaleGizmoEnabled = true;
    this.gizmoManager.gizmos.scaleGizmo.onDragObservable.add(() => {
      this.dispatch('onScaleChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.gizmos.scaleGizmo.onDragStartObservable.add(() => {
      this.dispatch('onScaleStartChanged', {
        object: this.gizmoManager.attachedMesh ?? (this.gizmoManager.attachedNode as TransformNode),
      });
    });
    this.gizmoManager.scaleGizmoEnabled = false;
  }

  initFocus() {
    window.addEventListener('keydown', (k) => {
      if (k.key == 'f') {
        if (this._selectNodes[0] instanceof TransformNode) {
          this.focusTransformNode(this._selectNodes[0]);
        }
      }
    });
  }

  focusTransformNode(node: TransformNode) {
    const { min, max } = node.getHierarchyBoundingVectors(true);
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

    // 3. 目标距离 = 包围球半径 × multiplier（你觉得好看的倍数，3~5 都行）
    const targetDistance = radius * 1.5;

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
    this.enableMask = flag;

    if (this._selectNodes == undefined) return;
    this._selectNodes.forEach((item) => {
      if (item instanceof Mesh) {
        this.toggleMeshMask(item, this.enableMask);
      }
    });
  }

  toggleMeshMask(mesh: Mesh, isOn: boolean) {
    if (isOn) {
      mesh.overlayColor = new Color3(1, 0, 0);
      mesh.overlayAlpha = 0.2;
      mesh.renderOverlay = true;
    } else {
      mesh.renderOverlay = false;
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
    return node;
  }
  const children = node.getChildren();
  if (children?.length > 0) {
    for (let index = 0; index < children.length; index++) {
      const ret = getNodeByUUid(children[index], uuid, weakMap);
      if (ret) {
        return ret;
      }
    }
  }
}
