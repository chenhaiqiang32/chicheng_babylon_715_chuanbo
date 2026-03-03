# Babylon.js MeshBuilder 使用文档

本文档结合 [Babylon.js MeshBuilder 官方文档](https://doc.babylonjs.com/typedoc/variables/BABYLON.MeshBuilder)、`@babylonjs/core` 类型定义与项目 `src/3d/app/index.ts` 中的实际用法，介绍通过 MeshBuilder 程序化创建网格的方法及常用配置项。

---

## 1. MeshBuilder 概述

**MeshBuilder** 是 Babylon.js 提供的一组**静态方法**，用于**程序化创建**各类基础与参数化网格（盒子、球体、地面、线条等），无需加载外部模型。

- **官方 TypeDoc**: https://doc.babylonjs.com/typedoc/variables/BABYLON.MeshBuilder  
- **创建网格总览**: [Creating Meshes](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/)  
- **类型定义**: `@babylonjs/core/Meshes/meshBuilder.d.ts`

### 1.1 通用调用形式

```ts
const mesh = MeshBuilder.Create<MeshType>(name, options, scene);
```

- **name**：网格名称（字符串）。  
- **options**：配置对象，不同方法有不同的属性（见下文各节）。  
- **scene**：所属场景，可选，不传则使用当前场景。

---

## 2. 本项目用到的创建方法一览

| 方法 | 用途（本项目） |
|------|----------------|
| **CreateBox** | 天空盒立方体 |
| **CreateGround** | 地面、水面平面 |
| **CreateLines** | 路径曲线线条 |
| **CreateCylinder** | 路径上的圆柱体（可做圆管/锥体） |

---

## 3. CreateBox — 盒子

### 3.1 签名

```ts
MeshBuilder.CreateBox(name: string, options?: IBoxCreationOptions, scene?: Scene): Mesh
```

### 3.2 常用配置项（IBoxCreationOptions）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| **size** | `number` | `1` | 统一边长（宽高深相同）。 |
| **width** | `number` | - | 宽度（X 方向），会覆盖 size。 |
| **height** | `number` | - | 高度（Y 方向），会覆盖 size。 |
| **depth** | `number` | - | 深度（Z 方向），会覆盖 size。 |
| **faceColors** | `Color4[]` | - | 6 个面的颜色（顺序对应 6 个面）。 |
| **faceUV** | `Vector4[]` | - | 6 个面的 UV。 |
| **updatable** | `boolean` | `false` | 是否允许后续更新几何。 |
| **sideOrientation** | `number` | - | 面朝向（正面/背面剔除等）。 |

### 3.3 本项目中的用法

```228:232:src/3d/app/index.ts
    const box = MeshBuilder.CreateBox(
      'box',
      { width: 1000, height: 1000, depth: 1000 },
      this.scene,
    );
```

用于天空盒：创建立方体后挂 PBR 材质 + CubeTexture 反射，从内部观看。

---

## 4. CreateGround — 地面平面

### 4.1 签名

```ts
MeshBuilder.CreateGround(name: string, options?: IGroundCreationOptions, scene?: Scene): GroundMesh
```

创建与 **XZ 平面平行**的矩形平面（Y 为法线方向）。

### 4.2 常用配置项（IGroundCreationOptions）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| **width** | `number` | `1` | X 方向尺寸。 |
| **height** | `number` | `1` | Z 方向尺寸（文档中常称 height，表示平面“长度”）。 |
| **subdivisions** | `number` | `1` | 每条边的细分段数（划分成多少个小格）。 |
| **updatable** | `boolean` | `false` | 是否可更新几何。 |

### 4.3 本项目中的用法

```249:258:src/3d/app/index.ts
    const waterGround = MeshBuilder.CreateGround(
      'ground',
      { width: 3000, height: 3000, subdivisions: 1 },
      this.scene,
    );
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 3000, height: 3000, subdivisions: 1 },
      this.scene,
    );
```

两个平面：一个做水面（贴水材质），一个做地面（贴地材质）；`subdivisions: 1` 表示不细分，保持单块平面。

---

## 5. CreateLines — 折线/路径线

### 5.1 签名

```ts
MeshBuilder.CreateLines(name: string, options: ILinesOptions, scene?: Scene): LinesMesh
```

根据一组点生成**连续线段**。

### 5.2 常用配置项（ILinesOptions）

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **points** | `Vector3[]` | 是 | 顶点数组，相邻两点连成一段线。 |
| **updatable** | `boolean` | 否 | 是否可更新。 |
| **instance** | `LinesMesh` | 否 | 用于在已有线条网格上更新几何（需配合 updatable）。 |

### 5.3 本项目中的用法

```324:334:src/3d/app/index.ts
    const path = Curve3.CreateCatmullRomSpline(points, 20, false);
    const line = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    const line2 = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    line2.position.z = 3;
    line.position.z = -3;
```

用样条曲线得到路径点，再交给 CreateLines 绘制两条平行路径线（通过 position.z 错开）。

---

## 6. CreateCylinder — 圆柱/圆台/锥

### 6.1 签名

```ts
MeshBuilder.CreateCylinder(name: string, options?: ICylinderCreationOptions, scene?: Scene): Mesh
```

### 6.2 常用配置项（ICylinderCreationOptions）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| **height** | `number` | `2` | 轴向高度。 |
| **diameterTop** | `number` | `1` | 顶面直径；设为 `0` 可得到圆锥。 |
| **diameterBottom** | `number` | `1` | 底面直径，不能为 0。 |
| **diameter** | `number` | `1` | 顶底统一直径（被 diameterTop/Bottom 覆盖）。 |
| **tessellation** | `number` | `24` | 圆周分段数（棱数）。 |
| **subdivisions** | `number` | `1` | 高度方向分段。 |
| **faceColors** | `Color4[]` | - | 底面、侧面、顶面颜色。 |
| **arc** | `number` | `1` | 扇形弧度比例（0~1），用于做扇形柱。 |
| **updatable** | `boolean` | `false` | 是否可更新几何。 |

### 6.3 本项目中的用法

```342:348:src/3d/app/index.ts
      const box = MeshBuilder.CreateCylinder(
        'box',
        { height: 6, diameterTop: 2, diameterBottom: 2 },
        this.scene,
      );
      box.material = mat;
      box.rotate(new Vector3(1, 0, 0), Math.PI / 2);
```

创建圆柱后绕 X 轴旋转 90°，使轴向与路径方向一致，用作路径上的“盒子”视觉。

---

## 7. MeshBuilder 其他方法速查

以下方法均来自 `meshBuilder.d.ts`，调用形式均为 `MeshBuilder.XXX(name, options, scene)`（部分为 Extrude 等变体）。

| 方法 | 说明 |
|------|------|
| **CreateTiledBox** | 带贴图平铺的盒子。 |
| **CreateSphere** | 球体。 |
| **CreateDisc** | 圆盘。 |
| **CreateIcoSphere** | 二十面体球。 |
| **CreateRibbon** | 带状曲面。 |
| **CreateTorus** | 圆环。 |
| **CreateTorusKnot** | 环面纽结。 |
| **CreateLineSystem** | 多段线系统。 |
| **CreateDashedLines** | 虚线。 |
| **ExtrudeShape** / **ExtrudeShapeCustom** | 沿路径挤出形状。 |
| **CreateLathe** | 旋转体（车削）。 |
| **CreatePlane** / **CreateTiledPlane** | 平面 / 平铺平面。 |
| **CreateTiledGround** | 平铺地面。 |
| **CreateGroundFromHeightMap** | 高度图地面。 |
| **CreatePolygon** / **ExtrudePolygon** | 多边形 / 挤出多边形。 |
| **CreateTube** | 管道（沿路径的圆管）。 |
| **CreatePolyhedron** | 多面体。 |
| **CreateGeodesic** / **CreateGoldberg** | 测地/戈德堡多面体。 |
| **CreateDecal** | 贴花。 |
| **CreateCapsule** | 胶囊体。 |
| **CreateText** | 文本网格。 |

---

## 8. 参考链接

- [MeshBuilder TypeDoc](https://doc.babylonjs.com/typedoc/variables/BABYLON.MeshBuilder)  
- [Creating Meshes](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/)  
- [Box](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/box) · [Ground](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/ground) · [Cylinder](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/cylinder)  
- [Parametric Meshes](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/param)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中的天空盒、地面、路径线、圆柱）
