# HDR 环境贴图使用文档

本文档说明如何在项目中加载并使用 HDR 环境贴图，用于 PBR 反射与环境光（IBL）。实现位于 `src/3d/app/index.ts`，默认资源为 `public/Dutch-Sky_0168_4k.hdr`。  
Babylon.js 官方说明：[Using An HDR Environment For PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment/)。

---

## 1. 概述

- **推荐做法**：使用预滤波的 HDR 立方体贴图（.env 或 .dds），可避免运行时预滤波带来的延迟。
- **直接使用 .hdr / .exr**：本项目通过 `App.loadHdrEnvironment()` 直接加载 .hdr，在加载时进行预滤波，需 **WebGL2**；适合快速使用或资源为 HDR 文件的场景。
- **默认资源**：`/Dutch-Sky_0168_4k.hdr`（放在 `public/` 下，根路径即为 `/Dutch-Sky_0168_4k.hdr`）。

---

## 2. API：`App.loadHdrEnvironment(options?)`

### 2.1 签名

```ts
async loadHdrEnvironment(options?: {
  url?: string;
  size?: number;
  noMipmap?: boolean;
  generateHarmonics?: boolean;
  useInGammaSpace?: boolean;
  usePMREMGenerator?: boolean;
  createSkybox?: boolean;
  onProgress?: (progress: number) => void;
}): Promise<HDRCubeTexture>
```

### 2.2 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| **url** | `string` | `'/Dutch-Sky_0168_4k.hdr'` | HDR 或 EXR 文件 URL。放在 `public/` 下时使用根路径，如 `'/Dutch-Sky_0168_4k.hdr'`。 |
| **size** | `number` | `512` | 立方体贴图每面尺寸（如 128/256/512）。越大质量越高、加载与预滤波越慢。 |
| **noMipmap** | `boolean` | `false` | 是否不生成 mipmap。 |
| **generateHarmonics** | `boolean` | `true` | 是否生成球谐用于 IBL 环境光。 |
| **useInGammaSpace** | `boolean` | `false` | 是否在 gamma 空间使用。 |
| **usePMREMGenerator** | `boolean` | `true` | 是否使用 PMREM 生成器。 |
| **createSkybox** | `boolean` | `true` | 是否创建天空盒网格以显示环境；为 `true` 时会替换 `setGround()` 中的默认天空盒。 |
| **onProgress** | `(progress: number) => void` | — | 加载进度回调，`0 ~ 1`。HDR 预滤波可能无细分进度，通常仅在 0 与 1 时调用。 |

### 2.3 返回值与前置条件

- **返回**：`Promise<HDRCubeTexture>`，加载完成后得到的环境纹理。
- **前置条件**：需在 `App.Instance.init()` 及场景创建（如 `loadModelAndScene()` 或 `setScene()`）之后调用，否则会抛出错误。

---

## 3. 在视图中的使用（含 `src/view/app/index.vue` 参数）

在 `src/view/app/index.vue` 中，可在场景就绪后调用 `loadHdrEnvironment`，并把进度接到现有的 `loading` 状态上。

### 3.1 基本用法（默认 HDR + 默认天空盒）

```ts
// 场景与模型已就绪后
await App.Instance.loadHdrEnvironment();
```

### 3.2 带进度与自定义 URL（与 view 中的 loading 联动）

```ts
const loading = ref<number>(0);

// 在 onMounted 中，loadModelAndScene 完成后
await App.Instance.loadModelAndScene(modelUrl, (progress) => {
  loading.value = progress;
});
// 加载默认 HDR 环境，进度并入 loading（例如占最后 0.1 比例）
await App.Instance.loadHdrEnvironment({
  onProgress: (p) => {
    loading.value = 0.9 + p * 0.1;
  },
});
loading.value = 1;
```

### 3.3 自定义 HDR 与尺寸、不创建天空盒

```ts
await App.Instance.loadHdrEnvironment({
  url: '/other_env.hdr',
  size: 256,
  createSkybox: false,
  onProgress: (p) => (loading.value = 0.9 + p * 0.1),
});
```

### 3.4 与 Vue 中常用参数的对应关系

| 视图/业务参数 | 说明 | 在 loadHdrEnvironment 中的用法 |
|---------------|------|--------------------------------|
| **loading** | 全局加载进度 0~1 | 通过 `onProgress` 写入 `loading.value`，可与模型加载进度合并。 |
| **projectId / modelUrl** | 项目或模型地址 | 不直接传入本方法；在调用前根据 `modelUrl()` 等先完成 `init` 和 `loadModelAndScene` 或 `setScene`。 |
| **canvas** | 画布元素 | 在 `App.Instance.init(canvas, true)` 时已传入，无需再传。 |

---

## 4. 与 Babylon.js 文档的对应关系

- **直接使用 .hdr**：  
  官方示例：`new BABYLON.HDRCubeTexture("./textures/environment.hdr", scene, 128, false, true, false, true)`  
  本项目中由 `loadHdrEnvironment` 内部使用相同构造函数，并统一设置 `scene.environmentTexture` 与可选天空盒。
- **预滤波与性能**：  
  使用 .hdr 会在加载时进行预滤波，有一定延迟；若需更优性能，可先用 [Sandbox](https://sandbox.babylonjs.com/) 或 [IBL Texture Tool](https://www.babylonjs.com/tools/textures/) 将 .hdr 转为 .env 后，再通过 `CubeTexture.CreateFromPrefilteredData` 加载（可参考 `src/3d/core/utils/EnvSkybox.ts`）。
- **环境旋转**：  
  若需旋转环境，可在加载完成后对返回的 `HDRCubeTexture` 调用  
  `texture.setReflectionTextureMatrix(Matrix.RotationY(Tools.ToRadians(angle)))`。

---

## 5. 小结

- 使用 **`App.Instance.loadHdrEnvironment(options?)`** 即可加载 HDR 环境，默认使用 **`/Dutch-Sky_0168_4k.hdr`** 并创建天空盒。
- 在 **`src/view/app/index.vue`** 中通过 **`onProgress`** 与 **`loading`** 绑定即可接入现有加载进度；其他参数（url、size、createSkybox 等）按需传入。
- 更多原理与格式说明见 [Using An HDR Environment For PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment/)。
