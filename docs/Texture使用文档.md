# Babylon.js Texture 使用文档

本文档结合 [Babylon.js Texture 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.Texture) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍 2D 纹理的创建、常用配置项及使用场景。

---

## 1. Texture 概述

**Texture** 是 Babylon.js 的**二维纹理**类，用于从 URL（或 base64、HTML 等）加载图片并贴到材质上，如漫反射、法线、透明度、粒子贴图等。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.Texture  
- **继承**: 继承自 `BaseTexture`，与 `CubeTexture`、`RenderTargetTexture` 等并列。  
- **用途**: 常赋给 `material.albedoTexture`、`material.bumpTexture`、`particleSystem.particleTexture` 等。

---

## 2. 构造函数

### 2.1 常用签名

```ts
new Texture(
  url: string | string[] | HTMLCanvasElement | HTMLVideoElement,
  scene?: Scene,
  noMipmap?: boolean,
  invertY?: boolean,
  samplingMode?: number
): Texture
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **url** | `string` 等 | 是 | 纹理来源。通常为图片路径（相对 public 或绝对 URL），也可为 base64、Canvas、Video。 |
| **scene** | `Scene` | 否 | 所属场景，通常必传以正确加载与释放。 |
| **noMipmap** | `boolean` | 否 | 为 `true` 时不生成 Mipmap，可减少内存与加载时间，适合 UI/粒子等；默认 `false`。 |
| **invertY** | `boolean` | 否 | 为 `true` 时翻转纹理 V 轴，用于匹配不同坐标系；默认视引擎而定。 |
| **samplingMode** | `number` | 否 | 采样模式，如 `Texture.NEAREST_SAMPLINGMODE`、`Texture.BILINEAR_SAMPLINGMODE`、`Texture.TRILINEAR_SAMPLINGMODE`。 |

---

## 3. 常用属性（配置）

以下属性可在创建后设置，用于控制采样与显示。

| 属性 | 类型 | 说明 |
|------|------|------|
| **uScale** | `number` | U 方向（水平）平铺倍数，>1 表示重复贴图。 |
| **vScale** | `number` | V 方向（垂直）平铺倍数。 |
| **uOffset** | `number` | U 方向偏移（0~1）。 |
| **vOffset** | `number` | V 方向偏移（0~1）。 |
| **wrapU** | `number` | U 方向寻址：`Texture.WRAP_ADDRESSMODE`（重复）、`Texture.CLAMP_ADDRESSMODE`（钳制）等。 |
| **wrapV** | `number` | V 方向寻址。 |
| **hasAlpha** | `boolean` | 是否使用贴图 Alpha 通道（透明、镂空、粒子等需设为 `true`）。 |
| **coordinatesMode** | `number` | 纹理坐标模式，如 `Texture.EXPLICIT_MODE`、`Texture.SPHERICAL_MODE`、`Texture.PLANAR_MODE` 等（立方体纹理常用 `Texture.SKYBOX_MODE`）。 |
| **level** | `number` | Mip 级别，用于细节层次。 |

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 地面漫反射贴图（平铺）

```261:266:src/3d/app/index.ts
    const p = new Texture('OIP-C.webp', this.scene, true, false);
    p.uScale = 100;
    p.vScale = 100;

    groundMaterial.albedoTexture = p;
    ground.material = groundMaterial;
```

- **url**：`'OIP-C.webp'`，对应 `public/OIP-C.webp`。  
- **noMipmap: true**：不生成 Mipmap，适合大平面平铺。  
- **invertY: false**：不翻转。  
- **uScale / vScale = 100**：地面在 U、V 方向各重复 100 次，形成密铺效果。

### 4.2 水面法线/凹凸贴图

```269:272:src/3d/app/index.ts
    const normal = new Texture('waterbump.png', this.scene, true, false);
    normal.uScale = 3;
    normal.vScale = 3;
    waterMaterial.bumpTexture = normal;
```

- 用法线图做水面波纹凹凸。  
- **uScale / vScale = 3**：比地面贴图重复少，波纹密度适中。

### 4.3 粒子贴图（带透明）

```291:293:src/3d/app/index.ts
    const tex2 = new Texture('particle/smoke.png', this.scene, true, false, null);
    tex2.hasAlpha = true;
    particleSystem.particleTexture = tex2;
```

- **url**：`'particle/smoke.png'`，带透明通道的粒子图。  
- **hasAlpha = true**：使用 Alpha，粒子边缘透明，与背景混合正确。

### 4.4 坐标模式常量（与 CubeTexture 共用）

项目中在立方体纹理上设置天空盒采样模式（Texture 为 BaseTexture 子类，常量通用）：

```ts
tex.coordinatesMode = Texture.SKYBOX_MODE;
```

---

## 5. 常用常量速查

| 常量 | 说明 |
|------|------|
| **Texture.EXPLICIT_MODE** | 显式 UV。 |
| **Texture.SPHERICAL_MODE** | 球面映射。 |
| **Texture.PLANAR_MODE** | 平面映射。 |
| **Texture.CUBIC_MODE** | 立方体映射。 |
| **Texture.SKYBOX_MODE** | 天空盒/反射用立方体采样。 |
| **Texture.WRAP_ADDRESSMODE** | 重复寻址。 |
| **Texture.CLAMP_ADDRESSMODE** | 钳制到边缘。 |
| **Texture.NEAREST_SAMPLINGMODE** | 最近邻采样。 |
| **Texture.BILINEAR_SAMPLINGMODE** | 双线性。 |
| **Texture.TRILINEAR_SAMPLINGMODE** | 三线性（含 Mip）。 |

---

## 6. 使用建议

| 场景 | 建议 |
|------|------|
| 地面/墙面大平铺 | `noMipmap: true`，合理设置 `uScale`/`vScale`，必要时 `wrapU/wrapV = WRAP_ADDRESSMODE`。 |
| 法线/凹凸贴图 | 赋给 `material.bumpTexture`，用 `uScale`/`vScale` 控制密度。 |
| 粒子/透明贴图 | `hasAlpha = true`，图片带透明通道。 |
| 需要锐利像素风格 | `noMipmap: true`，`samplingMode = Texture.NEAREST_SAMPLINGMODE`。 |

---

## 7. 参考链接

- [BABYLON.Texture 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.Texture)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中地面贴图、水法线、粒子贴图）
