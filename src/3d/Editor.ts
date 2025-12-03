import { ControlMode, ViewFlagsMode, useScene } from '@/store/useScene';
import {
  ArcRotateCamera,
  CubeTexture,
  Engine,
  GizmoManager,
  AbstractMesh,
  PBRMaterial,
  Scene,
  Vector3,
  Node,
  BoundingBoxGizmo,
  Color3,
  HighlightLayer,
  Mesh,
  DirectionalLight,
  MeshBuilder,
  LightGizmo,
  Matrix,
  Camera,
  Texture,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';
import '@babylonjs/materials';
import { watch, type WatchHandle } from 'vue';
import { AssetsManager } from './assets/AssetsManager';
import '@babylonjs/inspector';
import { hasViewFlag } from '@/3d/core/utils/viewFlagsMode';
import { registerLeftClick } from '@/3d/core/utils/registerLeftClick';
import { focusOnNode } from '@/3d/core/utils/focusOnNode';
import { Dispatch } from '@/utils/dispatch';
import { createDefaultRenderingPipeline } from '@/rendering/default-pipeline';

interface EditorEvent {
  nameChanged: { newName: string; id: string };
  numberChanged: { newNumber: number; id: string };
  textureChanged: { newTexture: string; id: string };
  switchChanged: { newSwitch: boolean; id: string };
  sceneSettingChanged: boolean;

}

export class Editor extends Dispatch<EditorEvent> {
  loadScene(arg0: string) { }
  private scene: Scene;
  private engine: Engine;
  private camera: Camera;
  private gizmoManager: GizmoManager;

  private static instance: Editor;
  static get Instance() {
    if (Editor.instance == null) {
      Editor.instance = new Editor();
    }
    return Editor.instance;
  }

  private resScene: Scene;

  get SceneSetting() {
    return this.sceneSetting;
  }
  set SceneSetting(v: boolean) {
    this.sceneSetting = v;
    this.dispatch('sceneSettingChanged', v);
  }
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

  private highLightLayer: HighlightLayer;

  private watcher: WatchHandle[] = [];

  private _selectNodes: Node[];

  private enableGizmo: boolean = true;

  private enableMask: boolean = true;
  private sceneSetting: boolean = false;

  private lightGizmos: LightGizmo;
  private light: DirectionalLight;

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
      this.gizmoManager.boundingBoxGizmoEnabled = false;
      return;
    }
    if (v[0] instanceof AbstractMesh) {
      this.gizmoManager.attachToMesh(v[0]);
      if (this.enableGizmo) this.gizmoManager.boundingBoxGizmoEnabled = true;
    } else {
      // 如果子节点没有 mesh，则不显示 gizmo
      if (v[0]?.getChildMeshes()?.length > 0) this.gizmoManager.attachToNode(v[0]);
      else {
        this.gizmoManager.boundingBoxGizmoEnabled = false;
        this.gizmoManager.attachToNode(v[0]);
        // 灯光 attach 到 mesh 上，否则旋转 gizmos 无效
        this.gizmoManager.attachToMesh(this.lightGizmos.attachedMesh);
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
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      limitDeviceRatio: 2,
      stencil: true,
    });

    this.scene = await this.createScene();

    const env = CubeTexture.CreateFromPrefilteredData(
      './abandoned_factory_canteen_01.env',
      this.scene,
    );

    this.scene.environmentTexture = env;
    this.scene.iblIntensity = 0.5;

    this.initGizmos();
    this.initViewMode();
    this.initPointerObservale();
    this.initFocus();
    this.initPostProcess();
    // const sphere = MeshBuilder.CreateSphere('Sphere');
    // sphere.material = new PBRMaterial('PBR', this.scene);
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    window.addEventListener('resize', this.resize);
    const resizeObserver = new ResizeObserver((entries) => {
      this.resize();
    });

    this.highLightLayer = new HighlightLayer('hl1', this.scene, {});
    this.highLightLayer.needStencil();
    resizeObserver.observe(canvas);
    this.initWatch();
    useScene().setHierarchy(this.scene.rootNodes);

    setTimeout(() => {
      this.resize();
    }, 100);
    this.test();

    // 默认移动模式
    useScene().setCurrentControlMode(ControlMode.Move);
  }

  test() { }

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
  initPostProcess() {
    createDefaultRenderingPipeline();
  }

  newScene() {
    const scene = new Scene(this.engine);
    const env = CubeTexture.CreateFromPrefilteredData('./abandoned_factory_canteen_01.env', scene);
    scene.environmentTexture = env;
    scene.useRightHandedSystem = true;
    return scene;
  }

  async createScene() {
    const scene = new Scene(this.engine);
    scene.useRightHandedSystem = true;
    const camera = new ArcRotateCamera('camera', 0, 0, 10, new Vector3(0, 0, 0), this.scene);
    camera.minZ = 0.001;
    camera.maxZ = 5000;
    camera.attachControl();
    camera.lowerRadiusLimit = 0.01;
    camera.upperRadiusLimit = 5000;
    camera.wheelPrecision = 60; // 鼠标滚轮（传统鼠标）
    camera.wheelDeltaPercentage = 0.08; // 触控板滚轮（Mac/Windows 触控板）
    camera.pinchDeltaPercentage = 0.15; // 手机/平板双指缩放
    camera.inertia = 0;
    camera.panningInertia = 0;

    camera.angularSensibilityX = 200; // 水平拖动速度（越小越快）
    camera.angularSensibilityY = 200; // 垂直拖动速度
    camera.panningSensibility = 500; // 鼠标中键缩放速度（越小越快）
    this.camera = camera;

    const env = CubeTexture.CreateFromPrefilteredData('./abandoned_factory_canteen_01.env', scene);
    scene.environmentTexture = env;
    scene.iblIntensity = 0.5;
    const directionalLight = new DirectionalLight('dirLight', new Vector3(0, -1, -1), scene);
    directionalLight.position = new Vector3(0, 10, 0);
    directionalLight.intensity = 0.5;
    this.light = directionalLight;
    return scene;
  }

  resize = () => {
    this.engine.resize();
  };

  /**
   * 获取场景中指定ID的节点
   * @param id 节点的唯一ID
   * @returns 找到的节点，或null
   */
  getNodeById(id: number): Node {
    let node: Node = this.scene.getTransformNodeByUniqueId(id);
    if (!node) {
      node = this.scene.getMeshByUniqueId(id);
    }
    if (!node) {
      node = this.scene.getCameraByUniqueId(id);
    }
    if (!node) {
      node = this.scene.getLightByUniqueId(id);
    }
    return node;
  }

  /**
   * 初始化 gizmo
   */
  initGizmos() {
    let boundingBoxGizmo = new BoundingBoxGizmo();
    boundingBoxGizmo.setColor(Color3.Red());
    boundingBoxGizmo.setEnabledScaling(false);
    boundingBoxGizmo.setEnabledRotationAxis('');

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.enableAutoPicking = false;
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.boundingBoxGizmoEnabled = true;
    this.gizmoManager.gizmos.boundingBoxGizmo = boundingBoxGizmo;
    this.gizmoManager.boundingBoxGizmoEnabled = false;

    // 添加灯光 gizmo
    this.lightGizmos = new LightGizmo();
    this.lightGizmos.scaleRatio = 2;
    this.lightGizmos.light = this.light;

    this.gizmoManager.boundingBoxDragBehavior.onDragStartObservable.add(() => {
      // TODO:监听BoundingBoxGizmos拖拽开始
    });

    this.gizmoManager.boundingBoxDragBehavior.onDragEndObservable.add(() => {
      // TODO:监听BoundingBoxGizmos拖拽结束
    });

    // 非等比例下无法缩放，需要将 update... 设置为 false
    this.gizmoManager.rotationGizmoEnabled = true;
    this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  }

  /** 初始化模型试图模型 */
  initViewMode() {
    // 默认开始 Gizmos 和 Mask
    useScene().setCurrentViewFlagsMode(ViewFlagsMode.Gizmos, ViewFlagsMode.Mask);
  }

  /** 初始化光标事件 */
  initPointerObservale() {
    registerLeftClick(this.scene, {
      dragThreshold: 3,
      onClick: () => {
        this.raycastSelect();
      },
    });
  }

  initFocus() {
    window.addEventListener('keydown', (k) => {
      if (k.key == 'f') {
        focusOnNode(this.camera, this._selectNodes[0], this.scene);
      }
    });
  }

  /** 射线检测选中的 object */
  raycastSelect() {
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      Matrix.Identity(),
      this.camera,
    );
    const raycastHit = this.scene.pickWithRay(ray);
    // 赋值当前选中的 Object
    if (raycastHit.hit) {
      useScene().setCurrentSelect([raycastHit.pickedMesh.uniqueId]);
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
    this.gizmoManager.boundingBoxGizmoEnabled = flag;
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
      this.highLightLayer.removeMesh(mesh);
    }
  }

  export() {
    AssetsManager.Instance.exportScene(this.scene);
    // const json = SceneSerializer.Serialize(this.scene);
    // const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    // Tools.Download(blob, 'scene.json');
  }
}

export function applyEnvironmentToPBR(mat: PBRMaterial, scene: Scene) {
  if (!mat || !(mat instanceof PBRMaterial)) return;
  if (scene.environmentTexture) {
    mat.environmentBRDFTexture = scene.environmentTexture;
  }
}
