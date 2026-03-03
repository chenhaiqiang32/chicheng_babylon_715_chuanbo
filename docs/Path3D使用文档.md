# Babylon.js Path3D 使用文档

本文档结合 [Path3D 官方说明](https://doc.babylonjs.com/features/featuresDeepDive/mesh/path3D) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍 Path3D 的创建、插值取点及沿路径运动/朝向的用法。

---

## 1. Path3D 概述

**Path3D** 是 Babylon.js 的**路径数学对象**，从一组空间中的 **Vector3** 点序列构造，用于在路径上做插值：取任意位置（0～1）的点坐标、切向、法向、副法向等，常用于沿路径移动物体、相机轨迹、管道朝向等。

- **官方文档**: [Path3D](https://doc.babylonjs.com/features/featuresDeepDive/mesh/path3D)  
- **与 Curve3 关系**: 通常先用 **Curve3.CreateCatmullRomSpline** 得到平滑点列，再 `new Path3D(path.getPoints())` 构造 Path3D。

---

## 2. 构造函数

### 2.1 签名

```ts
new Path3D(path: Vector3[], firstNormal?: Vector3): Path3D
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **path** | `Vector3[]` | 是 | 路径上的点序列，顺序沿路径。通常来自 `Curve3.getPoints()` 或自定义数组。 |
| **firstNormal** | `Vector3` | 否 | 路径起点的初始法向，用于确定整条路径的 Frenet 标架方向；不传则由内部计算。 |

---

## 3. 常用方法

### 3.1 插值取点与方向（参数 t 为 0～1）

| 方法 | 返回值 | 说明 |
|------|--------|------|
| **getPointAt(t)** | `Vector3` | 归一化位置 `t`（0～1）处的**点坐标**，用于物体沿路径移动。 |
| **getTangentAt(t)** | `Vector3` | 该处的**切向**（路径前进方向），可用于朝向、相机 lookAt。 |
| **getNormalAt(t)** | `Vector3` | 该处的**法向**，与切向垂直，构成 Frenet 标架。 |
| **getBinormalAt(t)** | `Vector3` | 该处的**副法向**，与切向、法向正交。 |

切向、法向、副法向构成路径上每点的局部坐标系，可用于让物体“沿轨道”正确旋转（例如 `Quaternion.FromLookDirectionRH(tangent, normal)`）。

### 3.2 批量与辅助方法

| 方法 | 说明 |
|------|------|
| **getTangents()** | 返回各路径点处的切向数组。 |
| **getNormals()** | 返回各路径点处的法向数组。 |
| **getBinormals()** | 返回各路径点处的副法向数组。 |
| **getCurve()** | 返回路径点数组的副本。 |
| **getDistances()** | 返回相邻点间的距离数组。 |
| **update(points)** | 用新点序列更新路径（避免重新分配内存）。 |

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 从 Curve3 点列创建 Path3D

```335:335:src/3d/app/index.ts
    const path3D = new Path3D(path.getPoints());
```

`path` 由 `Curve3.CreateCatmullRomSpline(points, 20, false)` 得到，`path.getPoints()` 为平滑后的点数组，交给 Path3D 用于后续插值。

### 4.2 存储为实例属性

```352:353:src/3d/app/index.ts
    this.path3D = path3D;
    this.meshArray = boxArray;
```

`path3D` 与路径上的圆柱网格数组一起保存，供 `setIndex` 动画使用。

### 4.3 沿路径移动物体（getPointAt）

```392:416:src/3d/app/index.ts
  setIndex(index: number) {
    const oldIndex = this.currentCount;
    const v = { value: oldIndex / this.allCount };
    gsap.to(v, {
      value: index / this.allCount,
      duration: 1,
      onUpdate: () => {
        this.currentCount = v.value * this.allCount;
        for (let index = 0; index < this.meshArray.length; index++) {
          const vv = v.value - index / (this.meshArray.length - 1);
          const boxMesh = this.meshArray[index];
          if (vv <= 0) {
            boxMesh.setEnabled(false);
          } else {
            boxMesh.setEnabled(true);
          }
          const pos = this.path3D.getPointAt(Math.max(vv, 0));
          boxMesh.position.copyFrom(pos);
        }
        // const normal = path3D.getBinormalAt(v.value);
        // const dir = path3D.getTangentAt(v.value);
        // box2.rotationQuaternion = Quaternion.FromLookDirectionRH(dir, normal);
      },
    });
  }
```

- **vv**：根据当前动画进度和圆柱索引算出的归一化路径位置（0～1）。  
- **this.path3D.getPointAt(Math.max(vv, 0))**：取该位置的坐标，**boxMesh.position.copyFrom(pos)** 使圆柱沿路径移动。  
- 注释中的 **getTangentAt**、**getBinormalAt** 配合 **Quaternion.FromLookDirectionRH** 可让物体沿路径朝向（当前仅更新位置）。

---

## 5. 沿路径朝向示例

若要让物体“车头”沿路径方向，可在 `onUpdate` 中增加旋转逻辑，例如：

```ts
const t = Math.max(vv, 0);
const pos = this.path3D.getPointAt(t);
const tangent = this.path3D.getTangentAt(t);
const normal = this.path3D.getBinormalAt(t); // 或 getNormalAt(t)
boxMesh.position.copyFrom(pos);
if (boxMesh.rotationQuaternion) {
  boxMesh.rotationQuaternion = Quaternion.FromLookDirectionRH(tangent, normal);
}
```

具体用 normal 还是 binormal 取决于模型的前/上轴定义，可按需选择。

---

## 6. 使用建议

| 场景 | 建议 |
|------|------|
| 路径来源 | 优先用 **Curve3.CreateCatmullRomSpline** 生成平滑点列，再 `new Path3D(path.getPoints())`。 |
| 沿路径移动 | 用 **getPointAt(t)**，`t` 由 0～1 的动画进度或距离比例计算。 |
| 沿路径朝向 | 用 **getTangentAt(t)** 作前向，**getNormalAt(t)** 或 **getBinormalAt(t)** 作上向，再构造四元数。 |
| 路径变化 | 可 **path3D.update(newPoints)** 更新点序列，避免重复 new Path3D。 |

---

## 7. 参考链接

- [Path3D](https://doc.babylonjs.com/features/featuresDeepDive/mesh/path3D)  
- [Curve3 使用文档](./Curve3使用文档.md)（路径点来源）  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中 Path3D 创建；`setIndex` 中 `getPointAt` 驱动位置）
