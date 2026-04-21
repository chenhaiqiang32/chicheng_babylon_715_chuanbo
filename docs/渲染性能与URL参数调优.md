# 渲染性能与 URL 参数调优

本文档说明如何通过 **Vue 侧栏「性能」面板**或直接在浏览器地址栏使用 **URL query** 覆盖参数，来降低 GPU/显存占用。

- **相关实现**：
  - `src/3d/app/demoConfig.ts`：`rendererPerformanceDemoConfig`、`resolveRendererPerformanceDemo`、`parseRendererPerformanceFromQuery`
  - `src/3d/app/index.ts`：`App.applyRendererPerformance()`（运行时立即应用）
  - `src/view/app/index.vue`：性能面板（全功能页）
  - `src/view/app/viewer3d.vue`：3D Viewer（仅画布页，支持 URL 传参）

---

## 1. 两个入口

- **全功能页（带侧栏）**：`#/app`
  - 支持侧栏实时调参
  - 也支持 URL query 覆盖默认性能参数（用于一键打开“低配模式”）

- **仅画布 Viewer（iframe 场景）**：`#/3d-viewer`
  - 无侧栏 UI
  - 推荐用 URL query 传参进行调参（适合父页面 iframe 引用）

---

## 2. URL query 覆盖参数（立即生效）

在 `#/app` 或 `#/3d-viewer` 后拼接 query 即可，例如：

- `#/3d-viewer?projectId=xxx&hsl=2&ibl=0&gtq=low&gls=0.6`
- `#/app?projectId=xxx&hardwareScalingLevel=1.75&gpuEnvironmentEnabled=false&gpuEnvironmentIntensityScale=0.5`

> 说明：**长参数名**与**短别名**等价；未提供的字段将沿用 `demoConfig.ts` 默认值与 preset 合并结果。

---

## 3. 参数表

### 3.1 性能核心参数（推荐优先调这些）

| 参数（长 / 短） | 类型 | 示例 | 作用 |
|---|---:|---|---|
| `hardwareScalingLevel` / `hsl` | number | `hsl=2` | **渲染缩放**：值越大，3D 越糊但更省 GPU/显存。此项目实现为“相机后处理像素化”，**不会影响信息牌/指南针清晰度**。 |
| `gpuLightIntensityScale` / `gls` | number | `gls=0.6` | **场景灯光强度缩放**：降低可减轻光照相关负载（画面整体变暗）。范围建议 0.2~1。 |
| `gpuTextureQuality` / `gtq` | enum | `gtq=low` | **材质纹理清晰度**：降低各向异性过滤与采样开销。可选 `high`/`medium`/`low`。 |
| `gpuEnvironmentEnabled` / `ibl` | boolean | `ibl=0` | **环境光/反射（IBL）开关**：关闭通常能显著降低 PBR 负载，但模型反射会消失。 |
| `gpuEnvironmentIntensityScale` / `ibls` | number | `ibls=0.5` | **环境强度缩放**（0~1）：保留 IBL 的同时降低其强度与开销感知。 |

### 3.2 FPS 调试相关（可选）

| 参数（长 / 短） | 类型 | 示例 | 作用 |
|---|---:|---|---|
| `showFpsOverlay` / `fps` | boolean | `fps=1` | 是否显示角落 FPS 叠加层。 |
| `fpsHudRealtime` / `fpsr` | boolean | `fpsr=1` | FPS 采样方式：`true` 为每帧 rAF 采样（更实时），`false` 为定时采样（略省主线程）。 |
| `fpsHudPollMs` / `fpsms` | number | `fpsms=200` | 定时采样间隔（ms），仅在 `fpsHudRealtime=false` 时生效。 |

### 3.3 画质预设（可选）

| 参数（长 / 短） | 类型 | 示例 | 作用 |
|---|---:|---|---|
| `qualityPreset` / `q` | enum | `q=low` | 画质预设：`default`/`medium`/`low`。会先合并一组推荐性能值，再被 query 中显式字段覆盖。 |

---

## 4. 常用场景推荐

### 4.1 极致省 GPU（集显/低显存）

建议先用预设，再精调：

- `#/3d-viewer?projectId=xxx&q=low`

或手动指定：

- `#/3d-viewer?projectId=xxx&hsl=2.5&ibl=0&gtq=low&gls=0.55`

### 4.2 不想完全关反射，只想降低环境开销

- `#/app?projectId=xxx&ibl=1&ibls=0.5`

### 4.3 只降低 3D 场景分辨率，但保持信息牌清晰

- `#/app?projectId=xxx&hsl=2`

> 本项目中信息牌/指南针使用 GUI Layer，并强制在后处理之后绘制，因此缩放不会影响其清晰度。

---

## 5. boolean 的取值

以下值都会被识别：

- `1` / `true` / `yes` / `on` → `true`
- `0` / `false` / `no` / `off` → `false`

