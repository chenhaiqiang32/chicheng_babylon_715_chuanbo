# Babylon.js Engine 使用文档

本文档结合 [Babylon.js Engine 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine) 与项目 `src/3d/app/index.ts` 中的实际用法，说明 `Engine` 的传参、配置项及常用方法。

---

## 1. Engine 类概述

`Engine` 是 Babylon.js 中负责与底层图形 API（如 WebGL、WebGPU）交互的核心类，用于创建渲染上下文、管理渲染循环和资源。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine  
- **继承关系**: `ThinEngine` → `Engine`（同包下还有 `NullEngine` 等）

---

## 2. 构造函数与传参

### 2.1 签名

```ts
new Engine(
  canvasOrContext: Nullable<HTMLCanvasElement | OffscreenCanvas | WebGLRenderingContext | WebGL2RenderingContext>,
  antialias?: boolean,
  options?: EngineOptions,
  adaptToDeviceRatio?: boolean
): Engine
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **canvasOrContext** | `HTMLCanvasElement \| OffscreenCanvas \| WebGLRenderingContext \| WebGL2RenderingContext` | 是 | 用于渲染的 Canvas 或已有 WebGL 上下文。若传入的是 **已存在的 WebGL 上下文**，Engine 不会在 Canvas 上绑定事件（指针、键盘等），因此相关 Observable 不可用，常用于将 Babylon 作为已有系统的插件集成。 |
| **antialias** | `boolean` | 否 | 是否开启抗锯齿，默认 `false`。设为 `true` 可得到更平滑的边缘。 |
| **options** | `EngineOptions` | 否 | 传给底层 `getContext()` 的扩展配置，详见下一节。 |
| **adaptToDeviceRatio** | `boolean` | 否 | 是否根据设备视口（如 devicePixelRatio）自适应，默认 `false`。为 `true` 时，浏览器缩放会正确影响硬件缩放。 |

---

## 3. EngineOptions 配置项

`options` 对应 [EngineOptions](https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions) 接口，会传递给 WebGL/WebGPU 的上下文创建。常用属性如下：

| 属性 | 类型 | 说明 |
|------|------|------|
| **antialias** | `boolean` | 是否开启抗锯齿（与构造函数第二参数效果一致，可在 options 中统一配置）。 |
| **adaptToDeviceRatio** | `boolean` | 是否根据设备像素比自适应渲染分辨率（与构造函数第四参数一致）。 |
| **limitDeviceRatio** | `number` | 设备像素比上限。例如设为 `1` 可限制在高清屏上不超出 1:1 渲染，避免过高分辨率带来的性能问题。 |
| **powerPreference** | `'high-performance' \| 'low-power' \| 'default'` | WebGL 请求上下文时的 GPU 偏好，如 `'high-performance'` 倾向使用独立显卡。 |
| **stencil** | `boolean` | 是否启用模板缓冲，用于阴影、描边等高级效果。 |
| **preserveDrawingBuffer** | `boolean` | 是否保留绘图缓冲，为 `true` 时便于截图（如 `canvas.toDataURL()`）。 |
| **premultipliedAlpha** | `boolean` | 是否使用预乘 Alpha，影响透明混合行为。 |
| **disableVertexArrayObjects** | `boolean` | 即使支持也禁用 VAO，用于兼容个别驱动。 |
| **disableUniformBuffers** | `boolean` | 即使支持也禁用 Uniform Buffer。 |
| **doNotHandleContextLost** | `boolean` | 不自动处理 WebGL 上下文丢失/恢复。 |
| **forcePOTTextures** | `boolean` | 是否强制纹理尺寸为 2 的幂。 |

> 更多选项以官方 [EngineOptions](https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions) 为准；创建后可通过 `engine.getCreationOptions()` 读取当前生效的配置（只读，修改不会影响已创建的引擎）。

---

## 4. 本项目中的用法（src/3d/app/index.ts）

### 4.1 创建 Engine（WebGL / WebGPU）

在 `App.init(canvas, gpu)` 中根据 `gpu` 选择创建普通 `Engine` 或使用 WebGPU 后端：

```ts
// GPU 模式：启用抗锯齿、设备比自适应，并限制 deviceRatio
if (gpu) {
  this.engine = new Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: true,
    limitDeviceRatio: 1,
  });
  if (this.engine instanceof WebGPUEngine) {
    await this.engine.initAsync();
  }
} else {
  // 非 GPU 模式：仅设备比自适应
  this.engine = new Engine(canvas, true, {
    adaptToDeviceRatio: true,
  });
}
```

- **第二参数 `true`**：开启抗锯齿。  
- **options**：  
  - `antialias: true`：抗锯齿（GPU 分支）。  
  - `adaptToDeviceRatio: true`：随设备像素比缩放。  
  - `limitDeviceRatio: 1`：将设备比限制为 1，避免过高分辨率。  
- 若实际创建出的是 `WebGPUEngine`，需要 **先 `await this.engine.initAsync()`** 再使用。

### 4.2 硬件缩放级别

```ts
this.engine.setHardwareScalingLevel(2);
```

- **含义**：设置硬件缩放级别。默认会按窗口 device ratio 计算。  
  - `1`：按 Canvas 尺寸 1:1 渲染。  
  - `0.5`：以 2 倍分辨率渲染（更清晰）。  
  - `2`：以一半分辨率渲染（更省性能）。  
- 获取当前级别：`engine.getHardwareScalingLevel()`。

### 4.3 渲染循环与窗口缩放

```ts
this.engine.runRenderLoop(() => {
  this.scene?.render();
});
window.addEventListener('resize', this.resize);
```

- **runRenderLoop(fn)**：注册并执行渲染循环，每帧执行 `fn`；可多次调用以注册多个渲染函数。  
- **resize** 中调用 `this.engine.resize()`，在窗口尺寸变化时更新视口与缓冲。

### 4.4 销毁

```ts
onDispose() {
  window.removeEventListener('resize', this.resize);
  this.engine.dispose();
  // ...
}
```

- **dispose()**：释放引擎占用的所有资源（上下文、缓冲、纹理等），调用后不应再使用该引擎。

---

## 5. 常用方法与属性速查

| 方法/属性 | 说明 |
|-----------|------|
| `engine.runRenderLoop(fn)` | 注册渲染循环，每帧执行 `fn`。 |
| `engine.stopRenderLoop()` | 停止当前渲染循环。 |
| `engine.resize(forceSetSize?)` | 根据 Canvas 尺寸调整视口；`forceSetSize` 为 true 时强制设置底层 canvas 尺寸。 |
| `engine.dispose()` | 释放引擎资源。 |
| `engine.getHardwareScalingLevel()` | 获取当前硬件缩放级别。 |
| `engine.setHardwareScalingLevel(level)` | 设置硬件缩放级别。 |
| `engine.getCreationOptions()` | 获取创建时的选项（只读）。 |
| `engine.scenes` | 当前引擎上的场景列表。 |
| `engine.onResizeObservable` | Canvas 尺寸变化时触发。 |
| `engine.onContextLostObservable` / `onContextRestoredObservable` | WebGL 上下文丢失/恢复时触发。 |

---

## 6. 参考链接

- [BABYLON.Engine 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine)  
- [EngineOptions 接口](https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions)  
- 项目实现：`src/3d/app/index.ts`（`App.init`、`resize`、`onDispose`）
