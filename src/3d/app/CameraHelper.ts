import {
  AbstractCamera,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  VertexBuffer,
  Vector3,
  Color3,
} from '@babylonjs/core';

export interface CameraHelperOptions {
  /** 视线方向射线长度 */
  forwardLineLength?: number;
  /** 相机位置球颜色 */
  sphereColor?: Color3;
  /** 视线方向线颜色 */
  lineColor?: Color3;
  /** 位置球直径 */
  sphereDiameter?: number;
}

const DEFAULT_FORWARD_LINE_LENGTH = 8;
const DEFAULT_SPHERE_COLOR = new Color3(0.2, 0.6, 1);
const DEFAULT_LINE_COLOR = new Color3(0.4, 0.8, 1);
const DEFAULT_SPHERE_DIAMETER = 1.2;

/**
 * 相机辅助：在相机位置显示小球，并沿视线方向绘制射线，便于调试相机位置与朝向。
 * 可通过 setEnabled 控制是否显示。
 */
export class CameraHelper {
  private scene: Scene;
  private options: Required<CameraHelperOptions>;
  private _enabled = false;
  private line: Mesh | null = null;
  private sphere: Mesh | null = null;
  private currentCamera: AbstractCamera | null = null;

  constructor(scene: Scene, options: CameraHelperOptions = {}) {
    this.scene = scene;
    this.options = {
      forwardLineLength: options.forwardLineLength ?? DEFAULT_FORWARD_LINE_LENGTH,
      sphereColor: options.sphereColor ?? DEFAULT_SPHERE_COLOR,
      lineColor: options.lineColor ?? DEFAULT_LINE_COLOR,
      sphereDiameter: options.sphereDiameter ?? DEFAULT_SPHERE_DIAMETER,
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

  setCamera(camera: AbstractCamera | null): void {
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
    if (!this._enabled || !this.currentCamera || !this.line || !this.sphere) return;
    const camera = this.currentCamera;
    const start = camera.position.clone();
    const ray = camera.getForwardRay(this.options.forwardLineLength);
    const end = ray.origin.add(ray.direction.scale(this.options.forwardLineLength));

    this.line.updateVerticesData(
      VertexBuffer.PositionKind,
      new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]),
    );
    this.sphere.position.copyFrom(camera.position);
  }

  private create(camera: AbstractCamera): void {
    this.dispose();
    const { forwardLineLength, sphereColor, lineColor, sphereDiameter } = this.options;
    const start = camera.position.clone();
    const ray = camera.getForwardRay(forwardLineLength);
    const end = ray.origin.add(ray.direction.scale(forwardLineLength));

    const line = MeshBuilder.CreateLines(
      'cameraHelperLine',
      { points: [start, end], updatable: true },
      this.scene,
    );
    const lineMat = new StandardMaterial('cameraHelperLineMat', this.scene);
    lineMat.emissiveColor = lineColor;
    lineMat.disableLighting = true;
    line.material = lineMat;
    line.isPickable = false;
    line.renderingGroupId = 1;

    const sphere = MeshBuilder.CreateSphere(
      'cameraHelperSphere',
      { diameter: sphereDiameter, segments: 8 },
      this.scene,
    );
    sphere.position.copyFrom(camera.position);
    const sphereMat = new StandardMaterial('cameraHelperSphereMat', this.scene);
    sphereMat.emissiveColor = sphereColor;
    sphereMat.disableLighting = true;
    sphere.material = sphereMat;
    sphere.isPickable = false;
    sphere.renderingGroupId = 1;

    this.line = line;
    this.sphere = sphere;
  }

  dispose(): void {
    this.line?.dispose();
    this.line = null;
    this.sphere?.dispose();
    this.sphere = null;
  }
}
