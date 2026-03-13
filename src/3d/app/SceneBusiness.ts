import type { CameraViewPreset, InfoBoardItem } from './index';
import { App } from './index';

/**
 * 业务层场景控制入口：
 * - 只暴露“业务含义”的方法（视角、设备、动画等）
 * - 内部通过 App 封装好的能力操作相机、动画、信息牌等
 *
 * 建议在上层（Vue）只依赖本类，不直接访问 App。
 */
export interface SceneBusinessConfig {
  /** 预设视角：key 一般对应业务场景名，例如 'overview' | 'deviceA' 等 */
  cameraViews?: Record<string, CameraViewPreset>;
}

export interface PlayBusinessAnimationOptions {
  /** 模型名称，不传则使用当前激活模型 */
  modelName?: string;
  /** 动画名称或索引（不传 / 传 -1 时用第一个动画） */
  animation?: string | number;
  /** 是否循环 */
  loop?: boolean;
  /** 播放方向 */
  direction?: 'forward' | 'backward';
  /** 可选裁剪起始帧 */
  fromFrame?: number;
  /** 可选裁剪结束帧 */
  toFrame?: number;
  /**
   * 动画结束后的业务回调。
   * 内部会按 modelName + animation 做一次过滤，只对本次调用相关的结束事件触发。
   */
  onEnd?: (info: {
    modelName: string;
    animationName: string;
    direction: 'forward' | 'backward';
  }) => void;
}

export class SceneBusiness {
  private readonly app = App.Instance;
  private readonly config: SceneBusinessConfig;

  constructor(config: SceneBusinessConfig = {}) {
    this.config = config;
  }

  /** 获取所有已加载模型名称（可用于业务侧下拉列表） */
  getModelNames(): string[] {
    return this.app.getModelNames();
  }

  /** 当前激活模型名称 */
  getCurrentModelName(): string | null {
    return this.app.getCurrentModelName();
  }

  /** 业务：切换场景视角（根据配置中的 cameraViews 预设） */
  switchView(viewKey: string, options?: { duration?: number }): void {
    const preset = this.config.cameraViews?.[viewKey];
    if (!preset) return;
    this.app.switchCameraView(preset, { duration: options?.duration });
  }

  /** 业务：播放一次业务动画，并可在结束时执行业务逻辑 */
  playBusinessAnimation(options: PlayBusinessAnimationOptions): void {
    const {
      modelName,
      animation,
      loop = false,
      direction = 'forward',
      fromFrame,
      toFrame,
      onEnd,
    } = options;

    // 如提供 onEnd，则在 App 上挂一次过滤后的回调
    if (onEnd) {
      const targetModel = modelName ?? this.app.getCurrentModelName();
      const targetAnimKey = animation;

      this.app.onAnimationEnd((info) => {
        // 按模型过滤
        if (targetModel && info.modelName !== targetModel) return;
        // 按动画名称/索引过滤（如果业务只传了名称，则只比对名称）
        if (typeof targetAnimKey === 'string' && info.animationName !== targetAnimKey) return;
        onEnd(info);
      });
    }

    if (direction === 'backward') {
      this.app.playAnimationReverse(animation, loop, modelName, fromFrame, toFrame);
    } else {
      this.app.playAnimation(animation, loop, modelName, direction, fromFrame, toFrame);
    }
  }

  /** 业务：立即停止所有动画（或指定模型的动画） */
  stopBusinessAnimations(modelName?: string): void {
    this.app.stopAllAnimations(modelName);
  }

  /** 业务：设备信息牌数据更新 */
  updateDeviceBoards(items: InfoBoardItem[]): void {
    this.app.setInfoBoards(items);
  }

  /** 业务：清空所有设备牌子 */
  clearDeviceBoards(): void {
    this.app.clearInfoBoards();
  }

  /** 业务：控制哪些设备牌子可见（例如按分组、按告警状态过滤） */
  setVisibleDeviceBoardIds(ids: string[]): void {
    this.app.setInfoBoardsVisible(ids);
  }

  /** 业务：根据相机距离控制牌子显隐（例如靠近设备才显示详情） */
  setDeviceBoardCameraDistanceVisibility(
    enabled: boolean,
    options?: { min?: number; max?: number },
  ): void {
    this.app.setInfoBoardsCameraDistanceVisibility(enabled, options?.min, options?.max);
  }

  /** 业务：获取当前相机调试状态，可用于在 UI 实时显示视角参数 */
  getCameraDebugState() {
    return this.app.getArcRotateCameraDebugState();
  }
}

/** 工厂方法：按业务配置创建一个默认实例，方便在 Vue 里注入/单例化 */
export function createSceneBusiness(config: SceneBusinessConfig = {}): SceneBusiness {
  return new SceneBusiness(config);
}

