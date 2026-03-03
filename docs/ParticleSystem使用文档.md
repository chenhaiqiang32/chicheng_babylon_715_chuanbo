# Babylon.js ParticleSystem 使用文档

本文档结合 [Babylon.js ParticleSystem 官方 API](https://doc.babylonjs.com/typedoc/classes/BABYLON.ParticleSystem) 与项目 `src/3d/app/index.ts` 中的实际用法，介绍粒子系统的创建、常用配置项及动画表（Sprite Sheet）用法。

---

## 1. ParticleSystem 概述

**ParticleSystem** 是 Babylon.js 的**粒子系统**，用于模拟火焰、烟雾、水花、魔法光效等由大量小精灵组成的特效。粒子可从点、盒、球、锥等发射器生成，并支持贴图、动画表、混合模式等配置。

- **官方文档**: https://doc.babylonjs.com/typedoc/classes/BABYLON.ParticleSystem  
- **入门示例**: [Particle System Intro](https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/particle_system_intro)  
- **继承**: 继承自 `ThinParticleSystem`。

---

## 2. 构造函数

### 2.1 签名

```ts
new ParticleSystem(
  name: string,
  capacity: number,
  sceneOrEngine: Scene | AbstractEngine,
  customEffect?: Nullable<Effect>,
  isAnimationSheetEnabled?: boolean,
  epsilon?: number,
  noUpdateQueue?: boolean
): ParticleSystem
```

### 2.2 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| **name** | `string` | 是 | 粒子系统名称。 |
| **capacity** | `number` | 是 | 同时存在的**最大粒子数量**，超出后回收旧粒子。 |
| **sceneOrEngine** | `Scene \| AbstractEngine` | 是 | 所属场景或引擎。 |
| **customEffect** | `Effect` | 否 | 自定义着色器效果。 |
| **isAnimationSheetEnabled** | `boolean` | 否 | 是否使用**精灵表（Sprite Sheet）**做序列帧动画，用贴图多格时设为 `true`。 |
| **epsilon** | `number` | 否 | 渲染偏移。 |
| **noUpdateQueue** | `boolean` | 否 | 为 `true` 时以空更新队列启动。 |

---

## 3. 常用属性（配置）

### 3.1 发射与位置

| 属性 | 类型 | 说明 |
|------|------|------|
| **emitter** | `Vector3 \| AbstractMesh` | 发射位置或附着网格；为网格时随其运动。 |
| **emitRate** | `number` | 每帧最大发射粒子数，越大密度越高。 |
| **direction1** | `Vector3` | 发射方向范围下限（需配合 Box 发射器等）。 |
| **direction2** | `Vector3` | 发射方向范围上限，粒子方向在 direction1～direction2 间随机。 |

### 3.2 生命周期与尺寸

| 属性 | 类型 | 说明 |
|------|------|------|
| **minLifeTime** | `number` | 粒子最小存活时间。 |
| **maxLifeTime** | `number` | 粒子最大存活时间。 |
| **minSize** | `number` | 粒子最小尺寸。 |
| **maxSize** | `number` | 粒子最大尺寸。 |
| **minScaleX** / **minScaleY** | `number` | 最小 X/Y 缩放（可做拉伸）。 |
| **maxScaleX** / **maxScaleY** | `number` | 最大 X/Y 缩放。 |

### 3.3 贴图与混合

| 属性 | 类型 | 说明 |
|------|------|------|
| **particleTexture** | `BaseTexture` | 粒子贴图（可为一张贴图或精灵表）。 |
| **blendMode** | `number` | 混合模式，如 `ParticleSystem.BLENDMODE_ADD`、`BLENDMODE_STANDARD`。 |

### 3.4 精灵表（Sprite Sheet）动画

当 **isAnimationSheetEnabled = true** 时，贴图被当作多格动画使用：

| 属性 | 类型 | 说明 |
|------|------|------|
| **spriteCellWidth** | `number` | 每格宽度（像素或列数）。 |
| **spriteCellHeight** | `number` | 每格高度（像素或行数）。 |
| **startSpriteCellID** | `number` | 起始格索引。 |
| **endSpriteCellID** | `number` | 结束格索引。 |
| **spriteCellLoop** | `boolean` | 是否循环播放。 |
| **spriteCellChangeSpeed** | `number` | 格切换速度（如 1 表示在粒子生命周期内播完一遍）。 |

### 3.5 混合模式常量

| 常量 | 说明 |
|------|------|
| **ParticleSystem.BLENDMODE_STANDARD** | 标准 Alpha 混合，适合透明烟雾、玻璃。 |
| **ParticleSystem.BLENDMODE_ADD** | 加法混合，适合火焰、光效、魔法。 |
| **ParticleSystem.BLENDMODE_ONEONE** | 源色加目标色，无 Alpha 调制，适合强发光。 |
| **ParticleSystem.BLENDMODE_MULTIPLY** | 相乘，变暗。 |
| **ParticleSystem.BLENDMODE_MULTIPLYADD** | 先乘后加。 |
| **ParticleSystem.BLENDMODE_SUBTRACT** | 相减，更暗。 |

---

## 4. 常用方法

| 方法 | 说明 |
|------|------|
| **start()** | 开始发射与更新粒子，**创建并配置后需调用**。 |
| **stop()** | 停止发射，已有粒子会继续播完生命周期。 |
| **clone(name, newEmitter)** | 克隆粒子系统，可指定新名称与发射位置（Vector3）。 |
| **dispose()** | 释放粒子系统资源。 |
| **createBoxEmitter(direction1, direction2, minEmitBox, maxEmitBox)** | 创建盒状发射器，粒子在盒内发射，方向在 direction1～direction2 间随机。 |
| **createPointEmitter()** | 点发射器（默认）。 |
| **createSphereEmitter(radius?, angle?)** | 球体发射器。 |
| **createConeEmitter(radius?, angle?)** | 锥形发射器。 |

---

## 5. 本项目中的用法（src/3d/app/index.ts）

### 5.1 创建与发射配置

```288:317:src/3d/app/index.ts
    const particleSystem = new ParticleSystem('particles', 1000, this.scene);
    particleSystem.emitter = new Vector3(15.7, 2, -3.5);
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    const tex2 = new Texture('particle/smoke.png', this.scene, true, false, null);
    tex2.hasAlpha = true;
    particleSystem.particleTexture = tex2;
    particleSystem.isAnimationSheetEnabled = true;
    particleSystem.spriteCellWidth = 1; // 列数 = 1
    particleSystem.spriteCellHeight = 5; // 行数 = 5
    particleSystem.spriteCellLoop = true;
    particleSystem.spriteCellChangeSpeed = 5;

    particleSystem.minScaleX = 10;
    particleSystem.minScaleY = 10;
    particleSystem.startSpriteCellID = 0;
    particleSystem.endSpriteCellID = 5;
    particleSystem.spriteCellHeight = 256;
    particleSystem.spriteCellWidth = 256;
    particleSystem.spriteCellLoop = true;
    // 发射速率
    particleSystem.emitRate = 30; // 每秒发射多少颗

    // // 方向、速度等（示例：向上喷发）
    particleSystem.minSize = 0.5;
    particleSystem.minLifeTime = 5;
    particleSystem.minLifeTime = 5;
    particleSystem.maxSize = 1.5;
    particleSystem.direction1 = new Vector3(30, 0, -2);
    particleSystem.direction2 = new Vector3(30, 0, -2);
    particleSystem.start();
```

- **capacity: 1000**：最多 1000 个粒子同时存在。  
- **emitter**：固定点 `(15.7, 2, -3.5)`。  
- **blendMode: BLENDMODE_ADD**：加法混合，适合烟雾/光效。  
- **particleTexture**：`particle/smoke.png`，贴图需 `hasAlpha = true` 以透明。  
- **isAnimationSheetEnabled = true**：贴图按多格播放；`spriteCellWidth/Height` 先按列/行数（1×5）再按像素（256×256）设置，`startSpriteCellID`～`endSpriteCellID` 为 0～5 共 6 格。  
- **emitRate = 30**：每帧最多发射 30 个。  
- **minSize/maxSize**：粒子尺寸在 0.5～1.5 间随机。  
- **minLifeTime**：存活时间 5（单位与引擎时间步相关）。  
- **direction1/direction2**：相同表示固定方向 `(30, 0, -2)`。  
- **start()**：启动粒子系统。

### 5.2 克隆第二套粒子（反向方向）

```318:320:src/3d/app/index.ts
    const particleSystem2 = particleSystem.clone('particles2', new Vector3(15.7, 2, 3.5));
    particleSystem2.direction1 = new Vector3(30, 0, 2);
    particleSystem2.direction2 = new Vector3(30, 0, 2);
```

克隆后仅改发射位置与方向，其余配置继承；克隆出的系统需单独调用 **start()** 才会发射（若原系统已 start，克隆体通常也需 start，具体以引擎行为为准）。

---

## 6. 使用建议

| 场景 | 建议 |
|------|------|
| 烟雾、云 | `blendMode = BLENDMODE_STANDARD`，贴图带 Alpha，适当 minLifeTime/maxSize。 |
| 火焰、魔法、光点 | `blendMode = BLENDMODE_ADD` 或 `BLENDMODE_ONEONE`。 |
| 序列帧动画 | `isAnimationSheetEnabled = true`，设置 spriteCell* 与 start/endSpriteCellID。 |
| 发射形状 | 默认点发射；需盒/锥/球时调用 `createBoxEmitter`、`createConeEmitter`、`createSphereEmitter` 等。 |
| 性能 | `capacity` 与 `emitRate` 不宜过大，按画面需求调整。 |

---

## 7. 参考链接

- [BABYLON.ParticleSystem 官方文档](https://doc.babylonjs.com/typedoc/classes/BABYLON.ParticleSystem)  
- [Particle System Intro](https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/particle_system_intro)  
- 项目实现：`src/3d/app/index.ts`（`setGround` 中粒子创建、精灵表与克隆）
