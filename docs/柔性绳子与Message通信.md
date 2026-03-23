# 柔性绳子与 Message 通信

本文档说明如何通过 **创建数据格式** 与 **更新数据格式** 创建、更新多根柔性绳子，以及如何通过 `window.postMessage` 与 3D 场景通信。

---

## 一、数据格式

### 1. 创建柔性绳子

接收一个**数组**，每项描述一根绳子：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 绳子唯一标识，后续更新时用 `parentId` 指定 |
| `start` | `{ x, y, z }` | 是 | 起点坐标（世界坐标） |
| `end` | `{ x, y, z }` | 是 | 终点坐标（世界坐标） |
| `length` | array | 是 | 中间控制点列表，见下表 |
| `angle` | number | 否 | 起点为“模型名称”时：方向水平角 yaw（度，绕 Y 轴） |
| `pitch` | number | 否 | 起点为“模型名称”时：方向俯仰角 pitch（度，正值向上） |

**`length` 每项：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 该控制点的唯一 id，更新角度时用此 id 查找 |
| `distance` | number | 该点到**起点**沿基线方向的距离（世界单位），会被钳制在 [0, 起点到终点总长] |

示例：

```json
[
  {
    "id": "rope_1",
    "angle": 0,
    "start": { "x": -10, "y": 6, "z": 0 },
    "end": { "x": 10, "y": 6, "z": 0 },
    "length": [
      { "id": "p0", "distance": 1.11 },
      { "id": "p1", "distance": 2.22 },
      { "id": "p2", "distance": 3.33 }
    ]
  },
  {
    "id": "rope_2",
    "start": { "x": 0, "y": 2, "z": -5 },
    "end": { "x": 0, "y": 2, "z": 5 },
    "length": [
      { "id": "n1", "distance": 2.5 },
      { "id": "n2", "distance": 5 },
      { "id": "n3", "distance": 7.5 }
    ]
  }
]
```

- 同一 `id` 的绳子若已存在，会先销毁再按新数据创建。
- 每根绳子会生成：一条沿控制点平滑插值（Catmull-Rom）的曲线 Tube、以及每个控制点上的小球（用于挂接信息牌）。信息牌默认显示「洋流点 {id}」以及当前 `yaw/pitch` 偏移。

### 2. 更新连接点偏移

更新**某一根**绳子上部分或全部控制点的偏移（yaw/pitch）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `parentId` | string | 要更新的绳子 id（创建时的 `id`） |
| `length` | array | 要更新的节点列表，见下表 |

**`length` 每项：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 控制点 id（创建时 `length[].id`） |
| `yaw` | number | 该点的水平偏移 yaw（度） |
| `pitch` | number | 该点的俯仰偏移 pitch（度） |
| `angle` | number | 兼容旧字段：等价映射为 `pitch=angle`、`yaw=0` |

示例：

```json
{
  "parentId": "rope_1",
  "length": [
    { "id": "p0", "yaw": 0, "pitch": 15 },
    { "id": "p1", "yaw": 0, "pitch": -10 },
    { "id": "p8", "yaw": 30, "pitch": 5 }
  ]
}
```

- 只传需要更新的节点即可，未传的节点保持当前偏移。
- `parentId` 对应的绳子必须已通过创建接口创建，否则更新会被忽略。

---

## 二、Message 通信

页面通过 `window.postMessage` 接收两种与柔性绳子相关的消息，由 3D 所在页面（如 `index.vue`）统一监听并调用 `App.Instance` 的接口。

### 1. 创建多根绳子

- **type**: `flexibleRopeCreate`
- **data**: 上述「创建柔性绳子」的**数组**

发送示例（父页面或 iframe 外）：

```javascript
window.postMessage(
  {
    type: 'flexibleRopeCreate',
    data: [
      {
        id: 'rope_1',
        // start 也可以直接传模型名称：会在已加载模型节点中查找并跟随移动
        start: 'Soldier',
        // 当 start 为模型名称时，终点由 angle + 总长度推导，无需传 end
        angle: 0,
        length: [
          { id: 'p0', distance: 1.11 },
          { id: 'p1', distance: 2.22 }
          // ... 共 17 个点
        ]
      }
    ]
  },
  '*'
);
```

若 3D 场景在 iframe 内，则需对 iframe 的 `contentWindow` 发送：

```javascript
iframe.contentWindow.postMessage({ type: 'flexibleRopeCreate', data: [...] }, '*');
```

### 2. 更新绳子连接点偏移

- **type**: `flexibleRopeUpdate`
- **data**: 上述「更新连接点偏移」的**对象**（含 `parentId`、`length`）

发送示例：

```javascript
window.postMessage(
  {
    type: 'flexibleRopeUpdate',
    data: {
      parentId: 'rope_1',
      length: [
        { id: 'p0', yaw: 0, pitch: 15 },
        { id: 'p8', yaw: 0, pitch: -10 }
      ]
    }
  },
  '*'
);
```

---

## 三、代码调用（不通过 Message）

若不使用 message，也可在拿到 `App.Instance` 的上下文中直接调用：

- **创建多根绳子**：`App.Instance.createFlexibleRopes(items)`
  - `items`: `FlexibleRopeCreateItem[]`，格式同上述创建数组。
- **更新连接点偏移**：`App.Instance.updateFlexibleRopePoints(payload)`
  - `payload`: `FlexibleRopeUpdatePayload`，格式同上述更新对象。

辅助方法：

- `App.Instance.getFlexibleRopeIds()`：返回当前已创建的绳子 id 列表。
- `App.Instance.getFlexibleRopePointIds(ropeId)`：返回指定绳子的控制点 id 列表（与创建时 `length[].id` 顺序一致）。
- `App.Instance.setFlexibleRopePointsVisible(visible: boolean)`：统一显示或隐藏所有柔性绳子上的控制点小球（默认隐藏）。

类型可从 `@/3d/app` 引入：

```ts
import type { FlexibleRopeCreateItem, FlexibleRopeUpdatePayload } from '@/3d/app';
```

---

## 四、配置与示例数据

- `demoConfig.ts` 中提供：
  - `flexibleRopeDemoConfig`：默认点数、起终点、半径等。
  - `flexibleRopeCreateExample`：符合 `FlexibleRopeCreateItem[]` 的示例（一根绳子、17 个控制点）。
  - `flexibleRopeUpdateExample`：符合 `FlexibleRopeUpdatePayload` 的示例。

可直接用示例数据测试创建与更新，或作为 message 的 `data` 参考。

---

## 五、行为说明

- **多根绳子**：支持同时存在多根绳子，每根由 `id` 唯一标识；创建时同 `id` 会先移除再创建。
- **yaw/pitch 偏移**：每个控制点可单独设置 `yaw`/`pitch`（度），用于在垂直于绳子基线的方向上偏移该点，形成柔性弯曲；曲线通过 Catmull-Rom 样条平滑连接。
- **信息牌**：每个控制点对应一个小球 mesh，并挂接信息牌，默认显示「洋流点 {id}」以及当前 `yaw/pitch`；与现有 `setInfoBoards` 体系一致，更新绳子后会刷新所有绳子的信息牌。
- **控制点小球**：控制点上的小球默认**隐藏**，仅绳子曲线可见。可通过 `App.Instance.setFlexibleRopePointsVisible(true)` 显示、`setFlexibleRopePointsVisible(false)` 隐藏；Demo 面板提供「显示控制点小球」勾选切换。
- **纹理**：每根绳子独立材质与纹理，根据当前曲线总长与参考长度设置 vScale，避免纹理被整体拉伸（变短时保持一整张，变长时重复铺贴）。
