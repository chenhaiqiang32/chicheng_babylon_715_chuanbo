# ShaderMaterialHelper 使用文档

本文档介绍项目中的着色器材质工具模块 `src/3d/shader/ShaderMaterialHelper.ts`：封装 Babylon.js `ShaderMaterial` 的创建、uniform 配置与时间驱动逻辑，便于实现「顶点/片段着色器 + iTime / iResolution」类特效（如水面流动、螺旋桨波浪等）。

---

## 1. 模块概述

- **文件路径**: `src/3d/shader/ShaderMaterialHelper.ts`
- **导出**:
  - `createTimedShaderMaterial`：创建带时间与分辨率的 ShaderMaterial，并做好透明与深度配置。
  - `startShaderTimeObserver`：为材质启动每帧更新 `iTime` 的观察者，返回移除函数。
  - `createTiledTexture`：创建 UV 平铺贴图，常用于噪声/流动采样（如 `iChannel0`）。

### 1.1 使用流程简述

1. 准备 **顶点 / 片段着色器** GLSL 源码，片段中声明 `uniform float iTime`、`uniform vec3 iResolution` 及需要的 sampler（如 `iChannel0`）。
2. 调用 **createTimedShaderMaterial** 得到 `ShaderMaterial`，再对 sampler 调用 **setTexture**（贴图可用 **createTiledTexture** 生成）。
3. 调用 **startShaderTimeObserver** 注册每帧更新 `iTime`；在不需要时调用返回的 **remove** 函数清理观察者。

### 1.2 着色器约定

- **顶点着色器** 需提供：`attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUV;`，并在 `main()` 中写 `vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0);`（或等价）。
- **片段着色器** 可声明：`uniform float iTime; uniform vec3 iResolution;` 以及若干 `uniform sampler2D xxx`，名称需与 `createTimedShaderMaterial` 的 `extraSamplers` 及后续 `setTexture` 的 key 一致。

---

## 2. createTimedShaderMaterial

创建「带时间与分辨率」的 ShaderMaterial，并统一透明与深度配置，便于透明面片参与遮挡。

### 2.1 函数签名

```ts
function createTimedShaderMaterial(
  scene: Scene,
  shaderKey: string,
  vertexSource: string,
  fragmentSource: string,
  extraSamplers: string[] = [],
): ShaderMaterial
```

### 2.2 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **scene** | `Scene` | 当前场景。 |
| **shaderKey** | `string` | 着色器在 `Effect.ShadersStore` 中的名字，会生成 `${shaderKey}VertexShader` 与 `${shaderKey}FragmentShader`。 |
| **vertexSource** | `string` | 顶点着色器 GLSL 源码。 |
| **fragmentSource** | `string` | 片段着色器 GLSL 源码。 |
| **extraSamplers** | `string[]` | 除内置 uniform 外需要的 sampler 名称，如 `['iChannel0']`。 |

### 2.3 内部行为说明

- 将 `vertexSource` / `fragmentSource` 分别写入 `Effect.ShadersStore[shaderKey + 'VertexShader']` 与 `FragmentShader`。
- 使用 `ShaderMaterial` 构造时指定：
  - **attributes**: `['position', 'uv']`
  - **uniforms**: `['worldViewProjection', 'iTime', 'iResolution']`
  - **samplers**: `extraSamplers`
- 初始化：
  - `iTime = 0`
  - `iResolution = (engine.getRenderWidth(), engine.getRenderHeight(), 0)`
- 材质配置：
  - `backFaceCulling = false`（双面可见）
  - `alpha = 0.92`、`alphaMode = Engine.ALPHA_COMBINE`
  - `forceDepthWrite = true`、`needDepthPrePass = true`（参与深度，可被前景遮挡）

### 2.4 使用示例

```ts
import { createTimedShaderMaterial, createTiledTexture } from '@/3d/shader/ShaderMaterialHelper';

const mat = createTimedShaderMaterial(
  scene,
  'myEffect',
  MY_VERTEX_GLSL,
  MY_FRAGMENT_GLSL,
  ['iChannel0'],
);
const tex = createTiledTexture(scene, 'iChannel0.png');
mat.setTexture('iChannel0', tex);
```

---

## 3. startShaderTimeObserver

为 ShaderMaterial 启动「每帧更新 iTime」的观察者；仅在 `isActive()` 为 true 时累加时间并写回材质。

### 3.1 函数签名

```ts
function startShaderTimeObserver(
  scene: Scene,
  material: ShaderMaterial,
  isActive: () => boolean,
  timeScale: number = 1,
): RemoveTimeObserver
```

其中 `RemoveTimeObserver = () => void`，即返回一个无参函数，调用即可移除观察者。

### 3.2 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **scene** | `Scene` | 当前场景，用于挂载 `onBeforeRenderObservable`。 |
| **material** | `ShaderMaterial` | 需要更新 `iTime` 的材质。 |
| **isActive** | `() => boolean` | 每帧调用，返回 true 时才累加时间并 `material.setFloat('iTime', time)`。例如 `() => mesh.isEnabled()`。 |
| **timeScale** | `number` | 对 `getDeltaTime()` 的缩放系数；默认 1。例如 `1/1000` 表示按秒，`1/3200` 可放慢螺旋桨波浪动画。 |

### 3.3 使用示例

```ts
import { startShaderTimeObserver } from '@/3d/shader/ShaderMaterialHelper';

const removeTimeObserver = startShaderTimeObserver(
  scene,
  mat,
  () => plane.isEnabled(),
  1 / 3200,
);

// 在 dispose 或不再需要时：
removeTimeObserver();
```

---

## 4. createTiledTexture

创建用于 Shader 的平铺贴图（UV 重复），常用于噪声、流动等需要重复采样的纹理。

### 4.1 函数签名

```ts
function createTiledTexture(
  scene: Scene,
  url: string,
  wrapU: boolean = true,
  wrapV: boolean = true,
): Texture
```

### 4.2 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **scene** | `Scene` | 当前场景。 |
| **url** | `string` | 贴图路径（如 `'iChannel0.png'`），相对于 public 或项目资源根目录。 |
| **wrapU** | `boolean` | 是否 U 向重复，默认 true。 |
| **wrapV** | `boolean` | 是否 V 向重复，默认 true。 |

### 4.3 使用示例

见上文 `createTimedShaderMaterial` 示例中的 `createTiledTexture(scene, 'iChannel0.png')`。

---

## 5. 与螺旋桨波浪效果的对应关系

项目中的螺旋桨波浪面片效果（`src/3d/app/index.ts` 中的 `createPropellerWaveEffectShader`）完整使用了本模块：

| 步骤 | 说明 |
|------|------|
| 着色器 | 使用顶部常量 `PROPELLER_WAVE_VERTEX`、`PROPELLER_WAVE_FRAGMENT`（基于 `docs/水面波浪2.glsl`，仅流动条带 + iChannel0 FBM）。 |
| 材质 | `createTimedShaderMaterial(this.scene, 'propellerWave', ... , ['iChannel0'])`。 |
| 贴图 | `createTiledTexture(this.scene, 'iChannel0.png')` 并 `mat.setTexture('iChannel0', noiseTex)`。 |
| 平面 | `MeshBuilder.CreatePlane` 后设置位置、旋转、`renderingGroupId = 0`、`forceDepthWrite`/`needDepthPrePass` 由材质提供。 |
| 时间 | `startShaderTimeObserver(this.scene, mat, () => propellerWaveMesh?.isEnabled(), 1/3200)`，返回值存为 `propellerWaveRemoveTimeObserver`，便于后续 dispose 时移除。 |

着色器内水色与水面材质 `waterColor (7,41,30)` 一致，首尾通过 `headFade`/`tailFade` 渐变透明。

---

## 6. 小结

- **createTimedShaderMaterial**：统一注册 vertex/fragment、创建材质、设置 iTime/iResolution 与透明/深度配置。
- **startShaderTimeObserver**：统一「每帧更新 iTime」逻辑，并可按是否启用（如 mesh 显隐）决定是否累加，记得在不用时调用返回的 remove。
- **createTiledTexture**：统一噪声/流动类贴图的平铺配置，避免重复写 wrapU/wrapV。

如需扩展更多 uniform（如自定义 vec3、float），可在创建材质后自行 `mat.setFloat` / `setVector3` 等，并在 GLSL 中声明对应 uniform。
