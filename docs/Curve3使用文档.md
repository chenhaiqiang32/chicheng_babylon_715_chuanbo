# Babylon.js Curve3 使用文档

本文档结合 [Babylon.js Curve3 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.Curve3)、[Drawing Curves](https://doc.babylonjs.com/features/featuresDeepDive/mesh/drawCurves) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍三维曲线的创建、取点及与 Path3D 的配合使用。

---

## 1. Curve3 概述

**Curve3** 是 Babylon.js 的**三维曲线**类，用于在空间中定义平滑路径。可通过控制点生成 Catmull-Rom 样条等，再得到路径点数组，用于画线、管道、挤出路径或交给 **Path3D** 做沿路径的运动与朝向计算。

- **官方 TypeDoc**: https://doc.babylonjs.com/typedoc/classes/BABYLON.Curve3  
- **绘制曲线**: [Drawing Curves](https://doc.babylonjs.com/features/featuresDeepDive/mesh/drawCurves)  
- **Path3D（沿路径运动）**: [Path3D](https://doc.babylonjs.com/features/featuresDeepDive/mesh/path3D/)

---

## 2. 静态方法：CreateCatmullRomSpline

### 2.1 签名

```ts
Curve3.CreateCatmullRomSpline(
  points: Vector3[],
  nbPoints: number,
  closed?: boolean
): Curve3
```

生成一条**穿过所有控制点**的 Catmull-Rom 样条曲线。

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **points** | `Vector3[]` | 是 | 控制点数组，曲线将依次经过这些点；通常至少需要若干点（建议 ≥ 4）以保证样条效果。 |
| **nbPoints** | `number` | 是 | **每两个相邻控制点之间**生成的插值点数量，越大曲线越密、越平滑。 |
| **closed** | `boolean` | 否 | 为 `true` 时首尾相连形成闭合环；默认 `false`。 |

### 2.3 返回值

返回 **Curve3** 实例，可调用 `getPoints()`、`length()` 等方法。

---

## 3. Curve3 常用方法

| 方法 | 说明 |
|------|------|
| **getPoints()** | 返回曲线上所有插值点的 `Vector3[]`，顺序沿曲线。 |
| **length()** | 返回曲线总长度（标量）。 |

得到的点数组可用于：
- **MeshBuilder.CreateLines**：绘制折线/曲线；
- **new Path3D(points)**：构造 Path3D，用于沿路径取位置、切线、法线等；
- **MeshBuilder.CreateTube**：沿路径生成圆管；
- 挤出、管道等需要路径点的 API。

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 定义控制点并创建样条

```323:330:src/3d/app/index.ts
    const points = [
      new Vector3(35, 10, 0),
      new Vector3(50, 10, 0),
      new Vector3(50, 0, 0),
      new Vector3(50, -5, 0),
      new Vector3(50, -50, 0),
    ];
    const path = Curve3.CreateCatmullRomSpline(points, 20, false);
```

- **points**：5 个控制点，从 (35,10,0) 经 (50,10,0)、(50,0,0)、(50,-5,0) 到 (50,-50,0)。  
- **nbPoints: 20**：每段之间 20 个插值点，整条曲线较平滑。  
- **closed: false**：不闭合，曲线有起点和终点。

### 4.2 用曲线点画线

```331:334:src/3d/app/index.ts
    const line = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    const line2 = MeshBuilder.CreateLines('line', { points: path.getPoints() }, this.scene);
    line2.position.z = 3;
    line.position.z = -3;
```

`path.getPoints()` 得到曲线上所有点，交给 **CreateLines** 画出两条路径线，再通过 `position.z` 错开，形成“双轨”视觉效果。

### 4.3 交给 Path3D 做沿路径运动

用同一组点创建 **Path3D**，在 `setIndex` 中用 **path3D.getPointAt(t)** 驱动圆柱沿路径移动；沿路径朝向可用 **getTangentAt**、**getBinormalAt** 等。详见 **[Path3D 使用文档](./Path3D使用文档.md)**。

---

## 5. 使用建议

| 场景 | 建议 |
|------|------|
| 平滑路径 | 使用 **CreateCatmullRomSpline**，适当增大 **nbPoints**（如 20～50）。 |
| 闭合环 | **closed: true**。 |
| 画线 | **path.getPoints()** + **MeshBuilder.CreateLines**。 |
| 沿路径运动/朝向 | 用 **path.getPoints()** 构造 **Path3D**，详见 [Path3D 使用文档](./Path3D使用文档.md)。 |

---

## 6. 参考链接

- [BABYLON.Curve3 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.Curve3)  
- [Drawing Curves](https://doc.babylonjs.com/features/featuresDeepDive/mesh/drawCurves)  
- [Path3D 使用文档](./Path3D使用文档.md)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中样条创建、画线；Path3D 用法见 Path3D 文档）
