# Babylon.js WaterMaterial 使用文档

本文档结合 [Babylon.js WaterMaterial 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.WaterMaterial) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍水面材质的创建、常用配置项及反射/折射的用法。

---

## 1. WaterMaterial 概述

**WaterMaterial** 是 Babylon.js **扩展材质库**（`@babylonjs/materials`）中的**水面材质**，通过反射与折射模拟水面效果，需配合法线/凹凸贴图使用。

- **官方 TypeDoc**: https://doc.babylonjs.com/typedoc/classes/BABYLON.WaterMaterial  
- **材质库说明**: [Water Material](https://doc.babylonjs.com/toolsAndResources/assetLibraries/materialsLibrary/waterMat)  
- **包**: `import { WaterMaterial } from '@babylonjs/materials';`

---

## 2. 构造函数

### 2.1 签名

```ts
new WaterMaterial(name: string, scene: Scene, renderTargetSize?: Vector2): WaterMaterial
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **name** | `string` | 是 | 材质名称。 |
| **scene** | `Scene` | 是 | 所属场景。 |
| **renderTargetSize** | `Vector2` | 否 | 反射/折射渲染目标分辨率，如 `new Vector2(1024, 1024)`。不传则使用默认尺寸。 |

---

## 3. 常用属性（配置）

| 属性 | 类型 | 说明 |
|------|------|------|
| **bumpTexture** | `Texture` | 法线/凹凸贴图，用于水面波纹扰动，**建议必设**，否则水面缺乏细节。 |
| **windForce** | `number` | 风力强度，影响波纹流动速度与方向感（可为负值表示反向）。 |
| **windDirection** | `Vector2` | 风向（二维）。 |
| **waveHeight** | `number` | 波峰高度，数值越大波浪越明显。 |
| **waveLength** | `number` | 波长/波纹密度，值越小波纹越密。 |
| **waveSpeed** | `number` | 波浪动画速度。 |
| **bumpHeight** | `number` | 凹凸贴图对反射/折射的扰动强度。 |
| **waterColor** | `Color3` | 水面底色，与反射/折射混合。 |
| **colorBlendFactor** | `number` | 水面颜色与反射/折射的混合比例（0~1）。 |
| **sideOrientation** | `number` | 面朝向（如双面、背面剔除等）。 |

---

## 4. 反射/折射：addToRenderList

水面会渲染**反射**与**折射**，需要明确“哪些物体参与反射/折射”。

### 4.1 方法

```ts
waterMaterial.addToRenderList(mesh: AbstractMesh): void
```

将传入的网格加入材质的**渲染列表**，这些网格会出现在水面的反射与折射中。

### 4.2 本项目中的用法

```354:358:src/3d/app/index.ts
    this.scene.meshes.forEach((m) => {
      if (m !== waterGround) {
        waterMaterial.addToRenderList(m);
      }
    });
```

除水面网格 `waterGround` 外，场景中所有网格都加入渲染列表，使水面能反射/折射场景内容（地面、建筑、天空盒等）。

---

## 5. 本项目中的完整用法（src/3d/app/index.ts）

### 5.1 创建与基础配置

```268:280:src/3d/app/index.ts
    const waterMaterial = new WaterMaterial('water', this.scene, new Vector2(1024, 1024));
    const normal = new Texture('waterbump.png', this.scene, true, false);
    normal.uScale = 3;
    normal.vScale = 3;
    waterMaterial.bumpTexture = normal;
    waterMaterial.windForce = -4;
    waterMaterial.waveHeight = 0.1;
    waterMaterial.bumpHeight = 0.5;
    waterMaterial.waveLength = 0.15;
    waterMaterial.waveSpeed = 50;
    waterMaterial.colorBlendFactor = 0.25;
    waterMaterial.sideOrientation = 1;
    waterMaterial.waterColor = new Color3(7 / 255, 41 / 255, 30 / 255);
```

- **renderTargetSize**：1024×1024，保证反射/折射清晰度。  
- **bumpTexture**：`waterbump.png`，U/V 平铺 3 倍控制波纹密度。  
- **windForce = -4**：负值表示风向与默认相反。  
- **waveHeight / waveLength / waveSpeed**：控制波浪形态与动画。  
- **waterColor**：深青绿色 `(7, 41, 30) / 255`，与 **colorBlendFactor = 0.25** 一起控制水面色调。  
- **sideOrientation = 1**：与双面/背面剔除相关的朝向设置。

### 5.2 挂到网格并设置反射列表

```ts
waterGround.material = waterMaterial;
waterGround.position.y = 2;
// ... 后续 ...
waterMaterial.addToRenderList(m);  // 对需参与反射/折射的网格逐个添加
```

水面平面由 `MeshBuilder.CreateGround` 创建，赋材质并抬升到 `y = 2`；反射列表在循环中通过 `addToRenderList` 添加。

---

## 6. 使用注意

| 项目 | 说明 |
|------|------|
| **bumpTexture** | 建议始终设置，否则水面缺乏波纹细节。 |
| **性能** | `renderTargetSize` 越大反射/折射越清晰，但开销越大；1024 为常用折中。 |
| **addToRenderList** | 不加入列表的网格不会出现在水面反射/折射中；天空盒、地面、建筑等需按需加入。 |
| **包依赖** | 需安装并引用 `@babylonjs/materials`。 |

---

## 7. 参考链接

- [BABYLON.WaterMaterial 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.WaterMaterial)  
- [Water Material 材质库说明](https://doc.babylonjs.com/toolsAndResources/assetLibraries/materialsLibrary/waterMat)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中水面创建、配置与 `addToRenderList`）
