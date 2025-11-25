import { ControlMode, useScene } from '@/store/useScene';
import {
  ArcRotateCamera,
  CascadedShadowGenerator,
  CubeTexture,
  DirectionalLight,
  Engine,
  GizmoManager,
  AbstractMesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SceneLoader,
  Vector3,
  Node,
  BoundingBoxGizmo,
  Color3,
  TransformNode,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';
import '@babylonjs/materials';
import { watch, type WatchHandle } from 'vue';

export class Editor {
  private scene: Scene;
  private engine: Engine;
  private gizmoManager: GizmoManager;
  private shadowGenerator: CascadedShadowGenerator;

  private static instance: Editor;

  private resizeObserver: ResizeObserver;

  private watcher: WatchHandle[] = [];

  private _selectNodes: Node[];

  get selectNodes() {
    return this.selectNodes;
  }
  set selectNodes(v: Node[]) {
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
  }

  static get Instance() {
    if (Editor.instance == null) {
      Editor.instance = new Editor();
    }
    return Editor.instance;
  }

  async init(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      limitDeviceRatio: 2,
    });
    this.scene = new Scene(this.engine);
    const camera = new ArcRotateCamera('camera', 0, 0, 10, new Vector3(0, 0, 0), this.scene);
    camera.minZ = 0.01;
    camera.maxZ = 5000;
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 20;
    camera.wheelPrecision = 60; // 鼠标滚轮（传统鼠标）
    camera.wheelDeltaPercentage = 0.08; // 触控板滚轮（Mac/Windows 触控板）
    camera.pinchDeltaPercentage = 0.15; // 手机/平板双指缩放

    const texuture = CubeTexture.CreateFromPrefilteredData(
      './abandoned_factory_canteen_01.env',
      this.scene,
    );

    // 修改 boundingboxgizmo 样式
    let boundingBoxGizmo = new BoundingBoxGizmo();
    boundingBoxGizmo.setColor(Color3.Red());
    boundingBoxGizmo.setEnabledScaling(false);
    boundingBoxGizmo.setEnabledRotationAxis("");

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.boundingBoxGizmoEnabled = true;
    this.gizmoManager.gizmos.boundingBoxGizmo = boundingBoxGizmo;
    this.gizmoManager.boundingBoxGizmoEnabled = false;

    this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(()=> {
      // TODO:监听拖拽开始
    })
    this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
      // TODO:监听拖拽结束
    })

    // 非等比例下无法缩放，需要将 update... 设置为 false
    this.gizmoManager.rotationGizmoEnabled = true;
    this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;

    this.scene.createDefaultSkybox(texuture, true, 100, 0, true);

    this.scene.activeCamera.position.set(50, 50, 5);
    const box = MeshBuilder.CreateSphere('Box', {}, this.scene);
    box.position.set(0, 0.5, 0);
    const json = await (await fetch('./pbr.json')).json();
    const pbr = PBRMaterial.Parse(json, this.scene, '');
    box.material = pbr;
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    window.addEventListener('resize', this.resize);
    const resizeObserver = new ResizeObserver((entries) => {
      this.resize();
    });

    const sun = new DirectionalLight('sun', new Vector3(0, -1, 0), this.scene);
    //2. 推荐！用 CascadedShadowGenerator（远景阴影不拉跨 + 超柔和）
    this.shadowGenerator = new CascadedShadowGenerator(2048, sun); // 1024 或 2048 看性能
    this.shadowGenerator.shadowMaxZ = 1000; // 阴影最远距离
    this.shadowGenerator.lambda = 0.98; // 越接近1越柔和（推荐 0.9~0.98）
    this.shadowGenerator.normalBias = 0.05; // 解决阴影失真
    this.shadowGenerator.bias = 0.0002; // 解决彼得潘问题
    box.receiveShadows = true;
    this.shadowGenerator.addShadowCaster(box);
    resizeObserver.observe(canvas);
    this.loadFbx();
    this.initWatch();

    this.switchControlType(ControlMode.Select);
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
      }
    );
    this.watcher.push(selectWatcher);
    this.watcher.push(controlModeWatcher);
  }

  async loadFbx() {
    const modelUrl = './bust_demo.glb';
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

    useScene().setHierarchy(this.scene.rootNodes);
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
}
