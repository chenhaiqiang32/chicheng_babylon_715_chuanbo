import { ControlMode, useScene } from '@/store/useScene';
import {
  ArcRotateCamera,
  CascadedShadowGenerator,
  CubeTexture,
  Engine,
  GizmoManager,
  AbstractMesh,
  PBRMaterial,
  Scene,
  SceneLoader,
  Vector3,
  Node,
  BoundingBoxGizmo,
  Color3,
  HighlightLayer,
  Mesh,
  DirectionalLight,
  MeshBuilder,
  Texture,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';
import '@babylonjs/materials';
import { watch, type WatchHandle } from 'vue';
import { AssetsManager } from './assets/AssetsManager';
import '@babylonjs/inspector';

export class Editor {
  loadScene(arg0: string) {}
  private scene: Scene;
  private engine: Engine;
  private gizmoManager: GizmoManager;
  private shadowGenerator: CascadedShadowGenerator;

  private static instance: Editor;
  static get Instance() {
    if (Editor.instance == null) {
      Editor.instance = new Editor();
    }
    return Editor.instance;
  }

  private resizeObserver: ResizeObserver;

  private highLightLayer: HighlightLayer;

  private watcher: WatchHandle[] = [];

  private _selectNodes: Node[];

  get selectNodes() {
    return this.selectNodes;
  }
  set selectNodes(v: Node[]) {
    if (this._selectNodes?.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          item.renderOverlay = false;

          this.highLightLayer.removeMesh(item);
        }
      });
    }

    this._selectNodes = v;
    if (v[0] instanceof AbstractMesh) {
        this.gizmoManager.boundingBoxGizmoEnabled = true;
        this.gizmoManager.attachToMesh(v[0]);
    } else {
      // 如果子节点没有 mesh，则不显示 gizmo
      if(v[0].getChildMeshes().length > 0)
        this.gizmoManager.attachToNode(v[0]);
      else 
        this.gizmoManager.boundingBoxGizmoEnabled = false;
    }
    if (this._selectNodes.length > 0) {
      this._selectNodes.forEach((item) => {
        if (item instanceof Mesh) {
          item.overlayColor = new Color3(1, 0, 0);
          item.overlayAlpha = 0.2;
          item.renderOverlay = true;
          // this.highLightLayer.addMesh(item, new Color3(0, 0, 1));
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
    // this.scene = await AssetsManager.Instance.loadFile(
    //   '18a508e08481489d89ed4a4f3f18eff2.zip',
    //   this.engine,
    // );

    // this.scene.activeCamera.attachControl();
    // // this.loadFbx();

    this.scene = await this.createScene();

    const env = CubeTexture.CreateFromPrefilteredData(
      './abandoned_factory_canteen_01.env',
      this.scene,
    );



    this.scene.environmentTexture = env;
    this.scene.iblIntensity = 0.5;
    // this.scene.debugLayer.show();

    // 修改 boundingboxgizmo 样式
    let boundingBoxGizmo = new BoundingBoxGizmo();
    boundingBoxGizmo.setColor(Color3.Red());
    boundingBoxGizmo.setEnabledScaling(false);
    boundingBoxGizmo.setEnabledRotationAxis("");

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.enableAutoPicking = false;
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.boundingBoxGizmoEnabled = true;
    this.gizmoManager.gizmos.boundingBoxGizmo = boundingBoxGizmo;
    this.gizmoManager.boundingBoxGizmoEnabled = false;

    this.gizmoManager.boundingBoxDragBehavior.onDragStartObservable.add(() =>{
      // TODO:监听BoundingBoxGizmos拖拽开始
    });

    this.gizmoManager.boundingBoxDragBehavior.onDragEndObservable.add(() => {
      // TODO:监听BoundingBoxGizmos拖拽结束
    });

    this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(()=> {
      // TODO:监听gizmos位移开始
    })
    this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
      // TODO:监听gizmos位移结束
    })

    // 非等比例下无法缩放，需要将 update... 设置为 false
    this.gizmoManager.rotationGizmoEnabled = true;
    this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    window.addEventListener('resize', this.resize);
    const resizeObserver = new ResizeObserver((entries) => {
      this.resize();
    });

    this.highLightLayer = new HighlightLayer('hl1', this.scene, {});
    this.highLightLayer.needStencil();
    // const sun = new HemisphericLight('sun', new Vector3(0, 1, 0), this.scene);
    resizeObserver.observe(canvas);
    this.initWatch();

    // 默认选择模式
    this.switchControlType(ControlMode.Select);

    useScene().setHierarchy(this.scene.rootNodes);
    setTimeout(() => {
      this.resize();
    }, 100);
    this.test();
  }

  test() {}

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
      }
    );
    this.watcher.push(selectWatcher);
    this.watcher.push(controlModeWatcher);
  }

  async loadFbx() {
    const modelUrl = './Avocado.glb';
    const result = await SceneLoader.ImportMeshAsync(
      '',
      '',
      modelUrl.split('/').pop(),
      this.scene,
      (evt) => {
        // 实时加载进度（可选）
        if (evt.lengthComputable) {
          console.log('加载进度:', ((evt.loaded / evt.total) * 100).toFixed(2) + '%');
        }
      },
    );
    const rootNodes = result.meshes;
    rootNodes.forEach((mesh) => {
      mesh.receiveShadows = true;
      //this.shadowGenerator.addShadowCaster(mesh as AbstractMesh);
    });
    this.resize();
  }

  async createScene() {
    const scene = new Scene(this.engine);
    const camera = new ArcRotateCamera('camera', 0, 0, 10, new Vector3(0, 0, 0), this.scene);
    camera.minZ = 0.01;
    camera.maxZ = 5000;
    camera.attachControl();
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 20;
    camera.wheelPrecision = 60; // 鼠标滚轮（传统鼠标）
    camera.wheelDeltaPercentage = 0.08; // 触控板滚轮（Mac/Windows 触控板）
    camera.pinchDeltaPercentage = 0.15; // 手机/平板双指缩放
    camera.inertia = 0;
    camera.panningInertia = 0;

    camera.angularSensibilityX = 200; // 水平拖动速度（越小越快）
    camera.angularSensibilityY = 200; // 垂直拖动速度
    camera.panningSensibility = 500; // 鼠标中键缩放速度（越小越快）

    const env = CubeTexture.CreateFromPrefilteredData('./abandoned_factory_canteen_01.env', scene);
    scene.environmentTexture = env;
    scene.iblIntensity = 0.5;
    const directionalLight = new DirectionalLight('dirLight', new Vector3(0, -1, -1), scene);
    directionalLight.position = new Vector3(0, 10, 0);
    directionalLight.intensity = 0.5;

    const box = MeshBuilder.CreateBox('box', {}, scene);
    box.position = new Vector3(0, 0, 0);
    box.receiveShadows = true;
    const mat = new PBRMaterial('boxMat', scene);
    box.material = mat;
    mat.albedoTexture = new Texture('./img/Avocado_baseColor.png', scene);
    mat.metallic = 0.3;
    mat.roughness = 0.7;

    const sphere = MeshBuilder.CreateSphere('sphere', {}, scene);
    sphere.position.set(0, 1, 0);

    // await this.loadFbx();
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
  getNodeById(id: string): Node {
    return this.scene.getNodeById(id);
  }

  // 切换控制模式：选择/移动/旋转/缩放
  switchControlType(mode : ControlMode)
  {
    switch(mode)
    {
      case ControlMode.Select:
        this.gizmoManager.positionGizmoEnabled = true;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
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
