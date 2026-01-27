import {
  Camera,
  Color4,
  Engine,
  PostProcess,
  RenderTargetTexture,
  Scene,
  Texture,
  Vector3,
  Mesh,
  ShaderMaterial,
  Effect,
  AbstractEngine,
  Constants,
  TransformNode,
  AbstractMesh,
} from '@babylonjs/core';
Effect.ShadersStore['outlineSampleVertexShader'] = `
        precision highp float;
        attribute vec3 position;
        uniform mat4 worldViewProjection;
        
        void main() {
            vec4 p = vec4(position, 1.);
            gl_Position = worldViewProjection * p;
        }
    `;

Effect.ShadersStore['outlineSampleFragmentShader'] = `
precision highp float;
void main() {
  gl_FragColor = vec4(1.0,1.0,1.0, 1.0);
}
`;
// 1. 定义 Shader：用于处理模糊和合成
Effect.ShadersStore['customOutlineFragmentShader'] = `
        precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler; // 原场景纹理
    uniform sampler2D maskSampler;    // 只有选中物体的纹理
    uniform float stride;             // 轮廓宽度
    uniform vec3 outlineColor;        // 轮廓颜色
    uniform float aspectRatio;        // 屏幕宽高比

    void main(void) {
        vec4 baseColor = texture2D(textureSampler, vUV);
        float mask = texture2D(maskSampler, vUV).r;
        
       float alpha = 0.0;
       vec2 invAspect = vec2(1.0 / aspectRatio, 1.0);
        // 我们采样 9 个点（3x3），但通过 stride 控制跨度
        alpha += texture2D(maskSampler, vUV + vec2(-1.0, -1.0) * stride * invAspect).a * 0.075;
        alpha += texture2D(maskSampler, vUV + vec2( 0.0, -1.0) * stride * invAspect).a * 0.125;
        alpha += texture2D(maskSampler, vUV + vec2( 1.0, -1.0) * stride * invAspect).a * 0.075;
        
        alpha += texture2D(maskSampler, vUV + vec2(-1.0,  0.0) * stride * invAspect).a * 0.125; 
        alpha += texture2D(maskSampler, vUV + vec2( 0.0,  0.0) * stride * invAspect).a * 0.200; // 中心
        alpha += texture2D(maskSampler, vUV + vec2( 1.0,  0.0) * stride * invAspect).a * 0.125;
        
        alpha += texture2D(maskSampler, vUV + vec2(-1.0,  1.0) * stride * invAspect).a * 0.075; 
        alpha += texture2D(maskSampler, vUV + vec2( 0.0,  1.0) * stride * invAspect).a * 0.125;
        alpha += texture2D(maskSampler, vUV + vec2( 1.0,  1.0) * stride * invAspect).a * 0.075;

        float intensity = clamp(alpha - mask, 0.0, 1.0)*5.0;
        
        gl_FragColor = vec4(baseColor.rgb+outlineColor*intensity,1.0);
    }
`;

export class OutlinePass extends PostProcess {
  private stride: number;
  private outlineColor: Vector3;
  private renderTarget: RenderTargetTexture;

  private material: ShaderMaterial;
  private engine: AbstractEngine;
  constructor(stride: number, outlineColor: Vector3, camera: Camera) {
    super(
      'outlinePass',
      'customOutline',
      ['stride', 'outlineColor', 'aspectRatio'],
      ['maskSampler'],
      1.0,
      camera,
    );
    const scene = camera.getScene();
    const engine = scene.getEngine();
    const size = {
      width: engine.getRenderWidth(),
      height: engine.getRenderHeight(),
    };
    this.stride = stride;
    this.outlineColor = outlineColor;
    this.samples = 4; // 开启 MSAA 抗锯齿
    this.renderTarget = new RenderTargetTexture('outline-mask', size, scene);
    this.material = new ShaderMaterial('outlineSample', scene, 'outlineSample');
    this.renderTarget.clearColor = new Color4(0, 0, 0, 0);
    scene.customRenderTargets.push(this.renderTarget);

    this.onApply = (effect) => {
      effect.setFloat('stride', this.stride);
      effect.setVector3('outlineColor', this.outlineColor);
      effect.setTexture('maskSampler', this.renderTarget);
      effect.setFloat('aspectRatio', engine.getRenderWidth() / engine.getRenderHeight());
    };
    this.engine = engine;
    window.addEventListener('resize', this.onResize);
  }

  onResize = () => {
    setTimeout(() => {
      const w = this.engine.getRenderWidth();
      const h = this.engine.getRenderHeight();
      this.renderTarget.resize({ width: w, height: h });
    }, 100);
  };

  addToRenderList(mesh: TransformNode) {
    const meshes = mesh.getChildren((n) => n instanceof AbstractMesh, false);
    if (mesh instanceof AbstractMesh) {
      meshes.push(mesh);
    }
    for (const child of meshes) {
      child.setMaterialForRenderPass(this.renderTarget.renderPassId, this.material);
    }
    this.renderTarget.renderList = meshes;
  }

  removeFromRenderList(mesh: TransformNode) {
    const meshes = mesh.getChildren((n) => n instanceof AbstractMesh, false);
    if (mesh instanceof AbstractMesh) {
      meshes.push(mesh);
    }
    this.renderTarget.renderList = this.renderTarget.renderList.filter(
      (item) => !meshes.includes(item),
    );
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
    super.dispose();
    window.removeEventListener('resize', this.onResize);
  }

  enable(v: boolean) {
    if (!v) {
      this.getCamera().detachPostProcess(this);
      this._scene.customRenderTargets = this._scene.customRenderTargets.filter(
        (item) => item !== this.renderTarget,
      );
    } else {
      this.getCamera().attachPostProcess(this);
      if (this._scene.customRenderTargets.indexOf(this.renderTarget) === -1) {
        this._scene.customRenderTargets.push(this.renderTarget);
      }
    }
  }
}
