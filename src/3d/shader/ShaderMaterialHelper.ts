/**
 * 着色器材质工具模块
 *
 * 封装 Babylon.js ShaderMaterial 的创建、uniform 配置与时间驱动逻辑，
 * 供需要「顶点/片段着色器 + iTime / iResolution」的特效复用（如水面流动、全屏后处理等）。
 *
 * ## 使用流程
 * 1. 准备 vertex / fragment 源码（GLSL），片段里使用 uniform float iTime、uniform vec3 iResolution。
 * 2. 调用 createTimedShaderMaterial 得到 ShaderMaterial，并绑定任意贴图（如 iChannel0）。
 * 3. 调用 startShaderTimeObserver 注册每帧更新 iTime；在不需要时调用返回的 remove 清理。
 *
 * ## 约定
 * - 顶点着色器需声明：attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUV;
 * - 片段着色器可声明：uniform float iTime; uniform vec3 iResolution; 以及若干 uniform sampler2D。
 */

import {
  Effect,
  Engine,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';

/** 时间观察者移除函数类型 */
export type RemoveTimeObserver = () => void;

/**
 * 创建「带时间与分辨率」的 ShaderMaterial，并做好透明与深度配置。
 *
 * - 将 vertexSource / fragmentSource 注册到 Effect.ShadersStore[`${shaderKey}VertexShader`] 与 `FragmentShader`。
 * - 创建 ShaderMaterial，统一 attributes: position/uv，uniforms: worldViewProjection / iTime / iResolution，以及 extraSamplers。
 * - 初始化 iTime = 0，iResolution = (renderWidth, renderHeight, 0)。
 * - 设置 backFaceCulling = false、alpha、alphaMode、forceDepthWrite、needDepthPrePass，便于透明面片参与遮挡。
 *
 * @param scene - 当前场景
 * @param shaderKey - 着色器在 ShadersStore 中的名字（会生成 `${shaderKey}VertexShader` / `${shaderKey}FragmentShader`）
 * @param vertexSource - 顶点着色器 GLSL 源码
 * @param fragmentSource - 片段着色器 GLSL 源码
 * @param extraSamplers - 除 iTime/iResolution 外需要的 sampler 名称，如 ['iChannel0']
 * @returns 已配置好的 ShaderMaterial，需自行 setTexture 等
 */
export function createTimedShaderMaterial(
  scene: Scene,
  shaderKey: string,
  vertexSource: string,
  fragmentSource: string,
  extraSamplers: string[] = [],
): ShaderMaterial {
  Effect.ShadersStore[`${shaderKey}VertexShader`] = vertexSource;
  Effect.ShadersStore[`${shaderKey}FragmentShader`] = fragmentSource;

  const engine = scene.getEngine();
  const resolution = new Vector3(engine.getRenderWidth(), engine.getRenderHeight(), 0);

  const mat = new ShaderMaterial(
    `${shaderKey}Mat`,
    scene,
    shaderKey,
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'iTime', 'iResolution'],
      samplers: extraSamplers,
    },
  );

  mat.setFloat('iTime', 0);
  mat.setVector3('iResolution', resolution);
  mat.backFaceCulling = false;
  mat.alpha = 0.92;
  mat.alphaMode = Engine.ALPHA_COMBINE;
  mat.forceDepthWrite = true;
  mat.needDepthPrePass = true;

  return mat;
}

/**
 * 为 ShaderMaterial 启动「每帧更新 iTime」的观察者。
 * 仅在 mesh 启用且 material 存在时累加时间并 setFloat('iTime', time)。
 *
 * @param scene - 当前场景
 * @param material - 需要更新 iTime 的 ShaderMaterial
 * @param isActive - 每帧调用，返回 true 时才更新（例如对应 Mesh 的 isEnabled）
 * @param timeScale - 累加 delta 的系数，默认 1；可传 1/1000 表示秒，或更小以放慢动画
 * @returns 移除该观察者的函数，在 dispose 或不再需要时调用
 */
export function startShaderTimeObserver(
  scene: Scene,
  material: ShaderMaterial,
  isActive: () => boolean,
  timeScale: number = 1,
): RemoveTimeObserver {
  let time = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (!isActive()) return;
    time += scene.getEngine().getDeltaTime() * timeScale;
    material.setFloat('iTime', time);
  });
  return () => {
    scene.onBeforeRenderObservable.remove(observer);
  };
}

/**
 * 创建用于 Shader 的平铺贴图（UV 重复），常用于噪声/流动采样。
 *
 * @param scene - 当前场景
 * @param url - 贴图路径（如 'iChannel0.png'，相对于 public 或资源根目录）
 * @param wrapU - 是否 U 向重复，默认 true
 * @param wrapV - 是否 V 向重复，默认 true
 * @returns 已设置 WRAP 的 Texture，可 setTexture 绑定到材质
 */
export function createTiledTexture(
  scene: Scene,
  url: string,
  wrapU: boolean = true,
  wrapV: boolean = true,
): Texture {
  const tex = new Texture(url, scene, false, true);
  if (wrapU) tex.wrapU = Texture.WRAP_ADDRESSMODE;
  if (wrapV) tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}
