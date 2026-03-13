import {
  ArcRotateCamera,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  VertexBuffer,
  Vector3,
  Color3,
} from '@babylonjs/core';

export interface CameraTargetHelperOptions {
  /** 目标点球体颜色 */
  sphereColor?: Color3;
  /** 目标点球体直径 */
  sphereDiameter?: number;
  /** 是否绘制从相机到目标点的连线（仅 ArcRotateCamera） */
  showCameraToTargetLine?: boolean;
  /** 相机到目标点连线的颜色 */
  lineColor?: Color3;
}

const DEFAULT_SPHERE_COLOR = new Color3(1, 0.3, 0.2);
const DEFAULT_SPHERE_DIAMETER = 1.5;
const DEFAULT_LINE_COLOR = new Color3(1, 0.5, 0.4);

/**
 * 控制器/目标点辅助：显示 ArcRotateCamera 的 target（环绕目标点），便于调试控制器位置。
 * 可选绘制从相机到目标点的连线。可通过 setEnabled 控制是否显示。
 */
export class CameraTargetHelper {
  private scene: Scene;
  private options: Required<CameraTargetHelperOptions>;
  private _enabled = false;
  private sphere: Mesh | null = null;
  private line: Mesh | null = null;
  private currentCamera: ArcRotateCamera | null = null;

  constructor(scene: Scene, options: CameraTargetHelperOptions = {}) {
    this.scene = scene;
    this.options = {
      sphereColor: options.sphereColor ?? DEFAULT_SPHERE_COLOR,
      sphereDiameter: options.sphereDiameter ?? DEFAULT_SPHERE_DIAMETER,
      showCameraToTargetLine: options.showCameraToTargetLine ?? true,
      lineColor: options.lineColor ?? DEFAULT_LINE_COLOR,
    };
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    if (enabled && this.currentCamera) {
      this.create(this.currentCamera);
    } else {
      this.dispose();
    }
  }

  /**
   * 设置要可视化的相机（仅 ArcRotateCamera 的 target 会被显示）。
   */
  setCamera(camera: ArcRotateCamera | null): void {
    if (this.currentCamera === camera) return;
    this.currentCamera = camera;
    if (!this._enabled) return;
    if (camera) {
      this.create(camera);
    } else {
      this.dispose();
    }
  }

  update(): void {
    if (!this._enabled || !this.currentCamera) return;
    const cam = this.currentCamera;
    const target = cam.target;

    if (this.sphere) {
      this.sphere.position.copyFrom(target);
    }
    if (this.line && this.options.showCameraToTargetLine) {
      // 线段世界坐标：从相机位置到 target
      this.line.updateVerticesData(
        VertexBuffer.PositionKind,
        new Float32Array([
          cam.position.x, cam.position.y, cam.position.z,
          target.x, target.y, target.z,
        ]),
      );
    }
  }

  private create(camera: ArcRotateCamera): void {
    this.dispose();
    const { sphereColor, sphereDiameter, showCameraToTargetLine, lineColor } = this.options;
    const target = camera.target.clone();

    const sphere = MeshBuilder.CreateSphere(
      'cameraTargetHelperSphere',
      { diameter: sphereDiameter, segments: 8 },
      this.scene,
    );
    sphere.position.copyFrom(target);
    const sphereMat = new StandardMaterial('cameraTargetHelperSphereMat', this.scene);
    sphereMat.emissiveColor = sphereColor;
    sphereMat.disableLighting = true;
    sphere.material = sphereMat;
    sphere.isPickable = false;
    sphere.renderingGroupId = 1;

    this.sphere = sphere;

    if (showCameraToTargetLine) {
      const start = camera.position.clone();
      const end = target.clone();
      const line = MeshBuilder.CreateLines(
        'cameraTargetHelperLine',
        { points: [start, end], updatable: true },
        this.scene,
      );
      const lineMat = new StandardMaterial('cameraTargetHelperLineMat', this.scene);
      lineMat.emissiveColor = lineColor;
      lineMat.disableLighting = true;
      line.material = lineMat;
      line.isPickable = false;
      line.renderingGroupId = 1;
      this.line = line;
    }
  }

  dispose(): void {
    this.sphere?.dispose();
    this.sphere = null;
    this.line?.dispose();
    this.line = null;
  }
}
