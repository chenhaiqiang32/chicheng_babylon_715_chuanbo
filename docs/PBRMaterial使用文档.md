# Babylon.js PBRMaterial 使用文档

本文档结合 [Babylon.js PBRMaterial 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍 PBR 材质的创建、常用属性及使用场景。

---

## 1. PBRMaterial 概述

**PBRMaterial** 是 Babylon.js 的**基于物理的渲染（PBR）材质**，通过金属度/粗糙度等参数模拟真实光照与反射，适合写实风格场景。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial  
- **PBR 概念**: [Intro to PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR)  
- **继承**: 继承自 `PBRBaseMaterial`。

---

## 2. 构造函数

### 2.1 签名

```ts
new PBRMaterial(
  name: string,
  scene?: Scene,
  forceGLSL?: boolean
): PBRMaterial
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **name** | `string` | 是 | 材质名称，用于调试与 Inspector 显示。 |
| **scene** | `Scene` | 否 | 材质所属场景，通常必传以正确渲染。 |
| **forceGLSL** | `boolean` | 否 | 是否强制使用 GLSL 生成 shader（如在 WebGPU 下仍用 GLSL），默认 `false`。 |

### 2.3 本项目中的创建方式

```ts
// 天空盒材质
const skyBox = new PBRMaterial('skyBox', this.scene);

// 地面材质
const groundMaterial = new PBRMaterial('groundMaterial', this.scene);

// 圆柱体材质（路径上的盒子）
const mat = new PBRMaterial('boxMaterial', this.scene);
```

---

## 3. 常用属性速查

以下属性在项目中有使用或为 PBR 最常用配置。

| 属性 | 类型 | 说明 |
|------|------|------|
| **albedoColor** | `Color3` | 漫反射颜色（基础色），其他文档常称 Diffuse Color。 |
| **albedoTexture** | `BaseTexture \| null` | 漫反射贴图（基础色贴图）。 |
| **roughness** | `number` | 粗糙度（0~1）。0 更光滑、高光更锐利；1 更粗糙、高光更弥散。 |
| **metallic** | `number` | 金属度（0~1）。0 非金属，1 金属，影响反射与菲涅尔。 |
| **reflectionTexture** | `BaseTexture \| null` | 反射贴图，常用于天空盒、环境反射。 |
| **microSurface** | `number` | 光滑度/光泽度，与 roughness 概念相反，部分工作流使用。 |
| **backFaceCulling** | `boolean` | 是否剔除背面（默认 true）。天空盒等需双面显示时设为 false。 |
| **emissiveColor** | `Color3` | 自发光颜色。 |
| **emissiveTexture** | `BaseTexture \| null` | 自发光贴图。 |
| **bumpTexture** | `BaseTexture \| null` | 法线/凹凸贴图。 |
| **ambientColor** | `Color3` | 环境光颜色。 |
| **environmentIntensity** | `number` | 环境光/反射强度。 |

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 天空盒材质（反射 + 双面）

```234:239:src/3d/app/index.ts
    const skyBox = new PBRMaterial('skyBox', this.scene);
    skyBox.backFaceCulling = false;
    box.material = skyBox;
    const tex = new CubeTexture('environment/512/TropicalSunnyDay', this.scene);
    tex.coordinatesMode = Texture.SKYBOX_MODE;
    skyBox.reflectionTexture = tex;
```

- **backFaceCulling = false**：盒子从内部看时背面可见，适合作为天空盒。
- **reflectionTexture**：使用立方体纹理做环境反射，配合 `Texture.SKYBOX_MODE` 作为天空反射。

### 4.2 地面材质（粗糙 + 漫反射贴图）

```259:267:src/3d/app/index.ts
    const groundMaterial = new PBRMaterial('groundMaterial', this.scene);
    groundMaterial.roughness = 1;
    const p = new Texture('OIP-C.webp', this.scene, true, false);
    p.uScale = 100;
    p.vScale = 100;

    groundMaterial.albedoTexture = p;
    ground.material = groundMaterial;
```

- **roughness = 1**：完全粗糙，几乎无高光，适合地面。
- **albedoTexture**：贴图铺地，通过 `uScale`/`vScale` 控制平铺密度。

### 4.3 路径圆柱体材质（金属度 + 基础色）

```337:341:src/3d/app/index.ts
    const mat = new PBRMaterial('boxMaterial', this.scene);
    mat.roughness = 1;
    mat.metallic = 0.5;
    mat.albedoColor = new Color3(0.8, 0.8, 0.8);
```

- **roughness = 1**：表面偏粗糙。
- **metallic = 0.5**：半金属感，有一定反射。
- **albedoColor**：浅灰基础色，多个圆柱共用同一材质。

---

## 5. 常见用法小结

| 场景 | 建议配置 |
|------|----------|
| 天空盒/环境球 | `backFaceCulling = false`，`reflectionTexture = CubeTexture`。 |
| 地面/墙面 | `roughness = 1`（或较高），`albedoTexture` 贴图，可选 `bumpTexture`。 |
| 金属物体 | `metallic` 接近 1，`roughness` 按表面调整。 |
| 塑料/非金属 | `metallic = 0`，`roughness` 与 `albedoColor`/`albedoTexture` 搭配。 |
| 自发光 | 设置 `emissiveColor` 或 `emissiveTexture`，可选 `emissiveIntensity`。 |

---

## 6. 常用方法

| 方法 | 说明 |
|------|------|
| **clone(name)** | 克隆材质，便于多网格共用或微调。 |
| **dispose()** | 释放材质资源。 |
| **getScene()** | 获取所属场景。 |
| **markAsDirty(flag)** | 标记材质脏，触发 shader 更新。 |

---

## 7. 参考链接

- [BABYLON.PBRMaterial 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial)  
- [Intro to PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中的天空盒、地面、路径圆柱体材质）
