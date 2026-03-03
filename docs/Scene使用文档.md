# Babylon.js Scene 使用文档

本文档结合 [Babylon.js Scene 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene) 与项目 `src/3d/app/index.ts` 中的实际用法，说明 `Scene` 的创建、常用属性与在项目中的使用方式。

---

## 1. Scene 类概述

`Scene` 是 Babylon.js 中**场景**的容器类，用于承载所有 3D 对象：相机、灯光、网格、粒子、材质等。渲染时由 Engine 的渲染循环调用 `scene.render()` 将当前场景绘制到画布。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene  
- **场景概念**: [Scene 功能概览](https://doc.babylonjs.com/features/featuresDeepDive/scene)

---

## 2. 构造函数

### 2.1 签名

```ts
new Scene(engine: AbstractEngine): Scene
```

### 2.2 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| **engine** | `AbstractEngine` | 必填。用于渲染的引擎实例（通常由 `new Engine(canvas, ...)` 创建）。Scene 依赖 Engine 的 WebGL/WebGPU 上下文进行绘制。 |

### 2.3 本项目中的用法

```107:108:src/3d/app/index.ts
    const scene = new Scene(this.engine);
    const padding = new Array<Padding>();
```

在 `setScene` 中先创建空场景，再通过 `deserializeScene` 从资源包反序列化节点、相机、灯光、网格等，最后赋给 `this.scene`。

---

## 3. 常用属性与访问器

以下属性在 `src/3d/app/index.ts` 中均有使用或涉及。

| 属性 / 访问器 | 类型 | 说明 |
|---------------|------|------|
| **activeCamera** | `Nullable<Camera>` | 当前用于渲染的相机。渲染前必须设置，否则不绘制。 |
| **cameras** | `Camera[]` | 场景中所有相机的列表。 |
| **lights** | `Light[]` | 场景中所有灯光。 |
| **meshes** | `AbstractMesh[]` | 场景中所有网格（含子网格）。 |
| **rootNodes** | `Node[]` | 场景根节点列表（无父节点的变换节点）。 |
| **fogEnabled** | `boolean` | 是否启用雾效。 |
| **clearColor** | `Color4` | 清除画布时使用的背景色。 |
| **onBeforeRenderObservable** | `Observable<Scene>` | 每帧在渲染前触发，可用于更新天空、动画等。 |
| **onAfterRenderObservable** | `Observable<Scene>` | 每帧在渲染后触发。 |
| **debugLayer** | `DebugLayer` | 调试层，可调用 `scene.debugLayer.show()` 打开 Inspector。 |

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 创建场景并设为当前场景

```ts
const scene = new Scene(this.engine);
this.assets.deserializeScene(scene, sceneNode, padding);
this.scene = scene;
```

创建场景 → 反序列化资源到该场景 → 将 `this.scene` 指向该场景，供渲染循环使用（`this.scene?.render()`）。

### 4.2 雾效与背景

```ts
this.scene.fogEnabled = false;
// scene.clearColor = new Color4(1, 1, 1, 1);
```

关闭雾效；如需纯色背景可设置 `clearColor`。

### 4.3 相机

```ts
scene.activeCamera.maxZ = 10000;
scene.activeCamera.attachControl(this.canvas, true);
```

- **activeCamera**：反序列化后由 `deserializeScene` 根据 `sceneData.activeCamera` 从 `scene.cameras` 中选出。
- **maxZ**：相机远裁剪面距离，增大可看到更远的物体。
- **attachControl(canvas, noPreventDefault)**：将相机控制（旋转、缩放等）绑定到画布；`true` 表示不阻止默认事件（如右键菜单）。

### 4.4 每帧前逻辑（Observable）

```ts
this.skyObserver = this.scene.onBeforeRenderObservable.add(() => {});
this.updateSkyByTime();
```

在 `onBeforeRenderObservable` 中注册回调，每帧渲染前执行（如本项目里在 `updateSkyByTime` 中根据时间更新天空与太阳方向）。销毁时需移除观察者：

```ts
this.scene.onBeforeRenderObservable.remove(this.skyObserver);
this.skyObserver = null;
```

### 4.5 灯光

```ts
const light = new HemisphericLight('light', new Vector3(0, -1, 0), this.scene);
let sun = this.scene.lights.find((l) => l instanceof DirectionalLight) as DirectionalLight;
if (!sun) {
  sun = new DirectionalLight('sunLight', new Vector3(0, -1, 0), this.scene);
  sun.intensity = 1.0;
}
```

- 灯光创建时第三个参数为 `this.scene`，即归属场景。
- 通过 **scene.lights** 查找已有定向光，若无则创建。

### 4.6 网格与根节点

```ts
this.scene.rootNodes.forEach((node) => { /* 注册交互等 */ });
this.scene.meshes.forEach((m) => {
  if (m !== waterGround) waterMaterial.addToRenderList(m);
});
```

- **rootNodes**：遍历场景根节点，用于挂载行为或查找子节点。
- **meshes**：遍历所有网格，例如把非水面网格加入水材质的渲染列表以实现反射/折射。

### 4.7 调试层

```ts
this.scene.debugLayer.show();
```

在开发时打开 Babylon.js Inspector，可查看场景树、材质、纹理、性能等。

---

## 5. 渲染与生命周期

- **渲染**：在 Engine 的渲染循环中调用 `this.scene?.render()`，每帧将当前场景绘制到画布。
- **销毁**：若需销毁场景，应调用 `scene.dispose()` 释放其占用的资源；本项目里未单独 dispose 场景，而是通过 `engine.dispose()` 在应用卸载时统一释放。

---

## 6. 常用方法速查

| 方法 | 说明 |
|------|------|
| **scene.render()** | 渲染当前帧。 |
| **scene.getEngine()** | 获取关联的 Engine。 |
| **scene.dispose()** | 释放场景资源。 |
| **scene.getNodeByID(id)** | 根据 id 查找节点。 |
| **scene.getMeshByName(name)** | 根据名称查找网格。 |
| **scene.getLightByName(name)** | 根据名称查找灯光。 |
| **scene.getCameraByName(name)** | 根据名称查找相机。 |

---

## 7. 参考链接

- [BABYLON.Scene 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene)  
- [Scene 功能概览](https://doc.babylonjs.com/features/featuresDeepDive/scene)  
- 项目实现：`src/3d/app/index.ts`（`setScene`、`setGround`、`onDispose`、渲染循环）
