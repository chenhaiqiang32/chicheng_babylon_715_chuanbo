# GSAP 使用文档（结合本项目）

本文档基于 GSAP 官方文档（[Tween](https://gsap.com/docs/v3/GSAP/Tween)、[Timeline](https://gsap.com/docs/v3/GSAP/Timeline)、[CSS](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/)、[Eases](https://gsap.com/docs/v3/Eases)、[GSAP 仓库](https://github.com/greensock/GSAP)）以及本项目在 `src/3d/app/index.ts`、`src/utils/index.ts` 中的用法，总结 GSAP 的核心概念与常用配置。

---

## 1. GSAP 核心概念

- **Tween**：最基本的动画单元，“把某个对象的属性从 A 变到 B”。  
- **Timeline**：Tween 的容器，用来做复杂的时间轴编排（本项目当前未使用，但推荐了解）。  
- **CSS 插件**：内置在核心中的 CSS 动画支持，允许直接写 `x`、`y`、`opacity` 等属性。  
- **Ease（缓动）**：控制动画速度曲线，如 `power1.inOut`、`back.out`、`elastic.out` 等。

安装后常见引入方式：

```ts
import gsap from 'gsap';
```

---

## 2. Tween：gsap.to / from / fromTo

### 2.1 基本用法

```ts
gsap.to(targets, {
  duration: 1,   // 持续时间（秒），默认 0.5
  x: 100,        // 要变化到的属性值
  ease: 'power1.out',
});
```

- **`gsap.to(targets, vars)`**：从当前值 “到” `vars` 中指定的值。  
- **`gsap.from(targets, vars)`**：从 `vars` 的起始值 “到” 当前值。  
- **`gsap.fromTo(targets, fromVars, toVars)`**：显式指定起点和终点。

### 2.2 TweenVars 常用配置

基于 `gsap-core.d.ts` 的 `TweenVars`/`AnimationVars` 定义：

| 属性 | 类型 | 说明 |
|------|------|------|
| **duration** | `number` | 动画时长（秒），建议都写在 `vars` 里。 |
| **delay** | `number` | 延迟开始时间（秒）。 |
| **ease** | `EaseString \\| EaseFunction` | 缓动函数，如 `"power2.inOut"`、`"back.out"`、`"elastic.inOut"` 等。GSAP 默认 `power1.out`。 |
| **repeat** | `number` | 重复次数，`-1` 表示无限循环。 |
| **repeatDelay** | `number` | 每次重复之间的停顿时间。 |
| **yoyo** | `boolean` | 与 `repeat` 搭配，反向往返播放（来回动）。 |
| **paused** | `boolean` | 初始是否暂停。 |
| **id** | `string \\| number` | Tween 的唯一标识，可配合 `gsap.getById()` 查找。 |
| **data** | `any` | 挂在 Tween 实例上的自定义数据。 |
| **stagger** | `number \\| StaggerVars` | 多个目标时的交错起始。 |
| **onStart / onUpdate / onComplete** | `Function` | 生命周期回调，可以在 `vars` 里直接写。 |

此外 Tween 还提供 `.eventCallback(type, fn, params?)` 方法，允许在创建之后修改回调，例如：

```ts
const tween = gsap.to(obj, { duration: 1, x: 100 });
tween.eventCallback('onUpdate', () => { /* ... */ });
```

---

## 3. 本项目中的 Tween 用法

### 3.1 数值驱动 Path3D（`src/3d/app/index.ts`）

```397:404:src/3d/app/index.ts
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
      },
    });
```

- **目标对象**：并不是 DOM 元素，而是普通对象 `v`，GSAP 也可以直接 tween。  
- **思路**：通过 `v.value` 从旧进度平滑过渡到新进度，在 `onUpdate` 里根据当前进度计算每个圆柱在 Path3D 上的位置（见 `Path3D使用文档.md`）。  
- **场景**：在 3D 场景中做“沿路径平滑过渡”的非 DOM 数值插值，非常适合用 GSAP Tween。

### 3.2 通用数值动画工具（`src/utils/index.ts`）

```40:47:src/utils/index.ts
  export function animate(event: (n: number) => void, time: number) {
    const v = { v: 0 };
    gsap
      .to(v, {
        duration: time,
        v: 1,
      })
      .eventCallback('onUpdate', () => {
        event?.(v.v);
      });
  }
```

- 封装了一个“**0→1 数值插值**”函数，`time` 控制时长。  
- 通过 `.eventCallback('onUpdate', ...)` 在每一帧把当前进度 `v.v` 回调出去，其他模块只关心一个 0～1 的进度值即可。

### 3.3 其他示例（`src/3d/app/index copy.ts`，示例代码）

```258:264:src/3d/app/index copy.ts
    gsap.to(box2.position, {
      y: 15,
      duration: 2,
      ease: 'power2.inOut',
      repeat: -1,
      yoyo: true,
    });
```

- 典型 DOM/对象属性 Tween：往返上下移动一个盒子。  
- 用到了 `duration`、`ease`、`repeat`、`yoyo` 这些常见配置。

---

## 4. Timeline（时间轴）简介

本项目目前未使用 GSAP 的 `timeline`，但在复杂动画编排中非常重要。

### 4.1 创建与基本用法

```ts
import gsap from 'gsap';

const tl = gsap.timeline({
  repeat: 2,
  repeatDelay: 1,
  yoyo: true,
});

tl.to('.box1', { x: 100, duration: 1 })
  .from('.box2', { y: -50, opacity: 0, duration: 1 }, '>-0.5') // 与前一个 Tween 结束重叠 0.5s
  .to('.box3', { rotation: 180, duration: 1 }, 'labelEnd');    // 使用 label 定位
```

### 4.2 TimelineVars 常用配置

| 属性 | 类型 | 说明 |
|------|------|------|
| **delay** | `number` | 整个时间轴的起始延迟。 |
| **repeat** | `number` | 时间轴重复次数，`-1` 为无限循环。 |
| **repeatDelay** | `number` | 每次重复之间的间隔。 |
| **yoyo** | `boolean` | 与 repeat 搭配，实现来回播放。 |
| **defaults** | `TweenVars` | 子 Tween 继承的默认配置（如统一 duration、ease）。 |

时间轴上的 `to` / `from` / `fromTo` 接收一个 **position 参数**（数字/字符串，如 `'>', '<', '+=1', 'label'`）控制插入位置，详情见官方 [Timeline 文档](https://gsap.com/docs/v3/GSAP/Timeline) 与 [Position Parameter](https://gsap.com/resources/position-parameter/)。

---

## 5. CSS 动画与 Eases 简要说明

虽然本项目目前主要用 Tween 驱动数值，但 GSAP 也常用于 DOM/CSS 动画。

### 5.1 CSS 属性与 CSS 插件

参见官方 [CSS 插件文档](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/)：

- 直接在 `vars` 里写 CSS 属性的 JS 形式：`backgroundColor`、`fontSize`、`opacity` 等。  
- 位移/缩放/旋转推荐用 GSAP 的简写属性：`x`、`y`、`scale`、`rotation`、`xPercent`、`yPercent`。  
- 特殊属性：  
  - **autoAlpha**：联动 `opacity` + `visibility`，0 时自动设 `visibility: hidden`。  
  - **transformOrigin**：变换中心点。

示例：

```ts
gsap.to('.box', {
  x: 200,
  y: 50,
  opacity: 0.5,
  duration: 1,
  ease: 'power2.out',
});
```

### 5.2 Eases（缓动函数）

官方文档：[Easing](https://gsap.com/docs/v3/Eases/)。

核心 eases 字符串（`EaseString`）包括：

- `none`（线性）、`power1`～`power4`、`back`、`bounce`、`circ`、`elastic`、`expo`、`sine`，都支持 `.in` / `.out` / `.inOut` 三种形式，例如：  
  - `"power1.inOut"`、`"back.out"`、`"elastic.out"`、`"bounce.inOut"`。

设置方式：

```ts
gsap.to(obj, {
  duration: 1,
  value: 1,
  ease: 'power2.inOut',
});
```

---

## 6. 项目中使用 GSAP 的位置汇总

| 文件 | 用法 | 说明 |
|------|------|------|
| `src/3d/app/index.ts` | `gsap.to(v, { value, duration, onUpdate })` | 在 `setIndex` 中驱动 Path3D 插值与圆柱沿路径运动。 |
| `src/3d/app/index copy.ts` | `gsap.to(box2.position, { y, duration, ease, repeat, yoyo })` | 示例：让盒子上下往返运动。 |
| `src/utils/index.ts` | `gsap.to(v, { duration: time, v: 1 }).eventCallback('onUpdate', ...)` | 抽象出一个通用 0→1 数值插值工具函数。 |

---

## 7. 推荐阅读与进阶

- 官方文档入口：[GSAP Docs](https://gsap.com/docs/v3/GSAP/)  
- Tween 详解：[Tween](https://gsap.com/docs/v3/GSAP/Tween)  
- Timeline 详解：[Timeline](https://gsap.com/docs/v3/GSAP/Timeline)  
- CSS 动画：[CSS 插件](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/)  
- Eases 可视化：[Easing](https://gsap.com/docs/v3/Eases/)  
- 核心仓库与示例代码：[greensock/GSAP](https://github.com/greensock/GSAP)

