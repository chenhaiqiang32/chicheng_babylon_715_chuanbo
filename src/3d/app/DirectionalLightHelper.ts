import {
  DirectionalLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  VertexBuffer,
  Vector3,
  Color3,
} from '@babylonjs/core';

export interface DirectionalLightHelperOptions {
  /** 方向射线基准长度，实际长度 = baseLength * max(0.1, light.intensity) */
  baseLength?: number;
  /** 方向线颜色 */
  lineColor?: Color3;
  /** 位置球颜色 */
  sphereColor?: Color3;
  /** 位置球直径 */
  sphereDiameter?: number;
}

const DEFAULT_BASE_LENGTH = 25;
const DEFAULT_LINE_COLOR = new Color3(1, 0.85, 0.2);
const DEFAULT_SPHERE_COLOR = new Color3(1, 0.9, 0.3);
const DEFAULT_SPHERE_DIAMETER = 1.5;

/**
 * DirectionalLight 辅助线：方向线 + 位置球，便于调试灯光位置、朝向和强度。
 * 可通过 setEnabled 控制是否显示。
 */
export class DirectionalLightHelper {
  private scene: Scene;
  private options: Required<Omit<DirectionalLightHelperOptions, 'baseLength'>> & {
    baseLength: number;
  };
  private _enabled = false;
  private line: Mesh | null = null;
  private sphere: Mesh | null = null;
  private currentLight: DirectionalLight | null = null;

  constructor(scene: Scene, options: DirectionalLightHelperOptions = {}) {
    this.scene = scene;
    this.options = {
      baseLength: options.baseLength ?? DEFAULT_BASE_LENGTH,
      lineColor: options.lineColor ?? DEFAULT_LINE_COLOR,
      sphereColor: options.sphereColor ?? DEFAULT_SPHERE_COLOR,
      sphereDiameter: options.sphereDiameter ?? DEFAULT_SPHERE_DIAMETER,
    };
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * 启用或关闭辅助线显示。关闭时会释放网格资源。
   */
  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    if (enabled && this.currentLight) {
      this.create(this.currentLight);
    } else {
      this.dispose();
    }
  }

  /**
   * 设置要可视化的平行光。若当前已启用，会立即创建或更新辅助线。
   */
  setLight(light: DirectionalLight | null): void {
    if (this.currentLight === light) return;
    this.currentLight = light;
    if (!this._enabled) return;
    if (light) {
      this.create(light);
    } else {
      this.dispose();
    }
  }

  /**
   * 每帧调用，根据灯光当前 position / direction / intensity 更新辅助线。
   */
  update(): void {
    if (!this._enabled || !this.currentLight || !this.line || !this.sphere) return;
    const light = this.currentLight;
    const start = light.position.clone();
    const dir = light.direction.clone().normalize();
    const length =
      this.options.baseLength * Math.max(0.1, light.intensity);
    const end = start.clone().add(dir.scale(length));
    this.line.updateVerticesData(
      VertexBuffer.PositionKind,
      new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]),
    );
    this.sphere.position.copyFrom(light.position);
  }

  private create(light: DirectionalLight): void {
    this.dispose();
    const { baseLength, lineColor, sphereColor, sphereDiameter } = this.options;
    const start = light.position.clone();
    const dir = light.direction.clone().normalize();
    const length = baseLength * Math.max(0.1, light.intensity);
    const end = start.clone().add(dir.scale(length));

    const line = MeshBuilder.CreateLines(
      'directionalLightHelperLine',
      { points: [start, end], updatable: true },
      this.scene,
    );
    const lineMat = new StandardMaterial('directionalLightHelperLineMat', this.scene);
    lineMat.emissiveColor = lineColor;
    lineMat.disableLighting = true;
    line.material = lineMat;
    line.isPickable = false;
    line.renderingGroupId = 1;

    const sphere = MeshBuilder.CreateSphere(
      'directionalLightHelperSphere',
      { diameter: sphereDiameter, segments: 8 },
      this.scene,
    );
    sphere.position.copyFrom(light.position);
    const sphereMat = new StandardMaterial('directionalLightHelperSphereMat', this.scene);
    sphereMat.emissiveColor = sphereColor;
    sphereMat.disableLighting = true;
    sphere.material = sphereMat;
    sphere.isPickable = false;
    sphere.renderingGroupId = 1;

    this.line = line;
    this.sphere = sphere;
  }

  /**
   * 释放辅助线网格，调用后需 setEnabled(true) 且 setLight(light) 才会再次显示。
   */
  dispose(): void {
    this.line?.dispose();
    this.line = null;
    this.sphere?.dispose();
    this.sphere = null;
  }
}
