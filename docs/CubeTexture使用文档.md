# Babylon.js CubeTexture 使用文档

本文档结合 [Babylon.js CubeTexture 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.CubeTexture) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍立方体纹理的创建、常用属性及使用场景。

---

## 1. CubeTexture 概述

**CubeTexture** 是 Babylon.js 的**立方体纹理**，由 6 张面（+X/-X, +Y/-Y, +Z/-Z）组成，常用于**天空盒**、**环境反射**、**折射**等需要 360° 方向采样的效果。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.CubeTexture  
- **天空盒**: [Skyboxes](https://doc.babylonjs.com/features/featuresDeepDive/environment/skybox)  
- **反射/折射**: [ReflectionTexture](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture)

---

## 2. 构造函数

### 2.1 常用签名

```ts
new CubeTexture(
  rootUrl: string,
  scene?: Scene,
  extensions?: string[],
  noMipmap?: boolean,
  files?: string[],
  onLoad?: () => void,
  onError?: () => void,
  prefiltered?: boolean
): CubeTexture
```

### 2.2 参数说明（常用部分）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **rootUrl** | `string` | 是 | 立方体纹理的**根路径**（不含文件名后缀）。引擎会在此路径下按约定名称加载 6 个面的图片。 |
| **scene** | `Scene` | 否 | 所属场景，通常必传以正确加载与渲染。 |
| **extensions** | `string[]` | 否 | 各面文件扩展名。不传时默认使用 `["_px.jpg", "_nx.jpg", "_py.jpg", "_ny.jpg", "_pz.jpg", "_nz.jpg"]`。若用 PNG 可传 `[".png"]` 等。 |
| **noMipmap** | `boolean` | 否 | 是否禁用 Mipmap。 |
| **files** | `string[]` | 否 | 自定义 6 个面的完整文件名，若提供则不再按 rootUrl + 后缀拼接。 |

### 2.3 默认文件命名规则

未传 `files` 时，会在 `rootUrl` 后追加以下后缀加载 6 张图：

| 面 | 后缀 | 方向 |
|----|------|------|
| +X | `_px` | 右 |
| -X | `_nx` | 左 |
| +Y | `_py` | 上 |
| -Y | `_ny` | 下 |
| +Z | `_pz` | 前 |
| -Z | `_nz` | 后 |

例如 `rootUrl = "environment/512/TropicalSunnyDay"`、默认扩展名时，会加载：  
`environment/512/TropicalSunnyDay_px.jpg`、`_nx.jpg` … 共 6 个文件。

---

## 3. 常用属性

| 属性 | 类型 | 说明 |
|------|------|------|
| **coordinatesMode** | `number` | 采样坐标模式。用于天空盒/反射时设为 `Texture.SKYBOX_MODE`。 |
| **url** | `string` | 当前使用的根 URL。 |
| **onLoadObservable** | `Observable<CubeTexture>` | 加载完成时触发。 |

`CubeTexture` 继承自 `BaseTexture`，因此也支持 `wrapU`、`wrapV`、采样模式等通用纹理属性。

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 天空盒反射

```237:239:src/3d/app/index.ts
    const tex = new CubeTexture('environment/512/TropicalSunnyDay', this.scene);
    tex.coordinatesMode = Texture.SKYBOX_MODE;
    skyBox.reflectionTexture = tex;
```

- **rootUrl**：`'environment/512/TropicalSunnyDay'`，对应 6 张图如 `environment/512/TropicalSunnyDay_px.jpg` 等（默认 .jpg）。
- **coordinatesMode = Texture.SKYBOX_MODE**：按天空盒/立方体方向采样，用于反射时方向正确。
- **reflectionTexture**：将立方体纹理赋给 PBR 材质的反射贴图，天空盒盒子内侧即可反射环境。

### 4.2 典型使用场景

- **材质反射**：`material.reflectionTexture = new CubeTexture(rootUrl, scene)`，再设置 `coordinatesMode = Texture.SKYBOX_MODE`。
- **场景环境**：`scene.environmentTexture = new CubeTexture(rootUrl, scene)`，用于 IBL 等环境光。
- **折射**：`material.refractionTexture = new CubeTexture(...)`（需配合折射相关材质参数）。

---

## 5. 静态方法：预过滤环境贴图

若使用预过滤的 `.env` 等格式，可用静态方法：

```ts
CubeTexture.CreateFromPrefilteredData(url: string, scene: Scene, extension?: string): CubeTexture
```

项目其他位置示例（如 `EnvSkybox.ts`、`RuntimeLibrary.ts`）：

```ts
const envTexture = CubeTexture.CreateFromPrefilteredData(url, scene, '.env');
```

适用于已烘焙好的 HDR 环境贴图，加载后可直接用于反射/环境。

---

## 6. 使用注意

| 项目 | 说明 |
|------|------|
| **图片规格** | 每个面建议为正方形，尺寸为 2 的幂（如 512×512、1024×1024）以兼顾兼容与性能。 |
| **用途限制** | 立方体纹理一般只用于 `reflectionTexture`、`refractionTexture` 或 `scene.environmentTexture`，不用于 `albedoTexture` 等 2D 贴图槽。 |
| **坐标模式** | 做天空盒或环境反射时，记得设置 `coordinatesMode = Texture.SKYBOX_MODE`。 |

---

## 7. 与 HDRCubeTexture 的简单对比

| 类型 | 说明 |
|------|------|
| **CubeTexture** | 普通 LDR 立方体纹理，6 张 jpg/png，本项目天空盒即用此。 |
| **HDRCubeTexture** | HDR 立方体纹理，单张或 6 张 HDR，适合更真实的环境光与反射。 |

项目中 `index copy.ts` 中有使用 `HDRCubeTexture` 的示例，可按需选用。

---

## 8. 参考链接

- [BABYLON.CubeTexture 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.CubeTexture)  
- [Skyboxes](https://doc.babylonjs.com/features/featuresDeepDive/environment/skybox)  
- [ReflectionTexture](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中天空盒反射）、`EnvSkybox.ts`、`Editor.ts` 等
