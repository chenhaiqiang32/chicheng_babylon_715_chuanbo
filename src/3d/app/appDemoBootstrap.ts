/**
 * Demo 场景：三维页独立初始化（由 viewer iframe 调用），与业务页通过 postMessage 通信。
 */
import { AppAssets } from '../assets/PublishLibrary';
import { MODEL_URLS } from './modelUrls.generated';
import {
  cameraPresetsConfig,
  directionControlConfig,
  defaultCameraViewLimitConfig,
  flexibleRopeCreateExample,
  flexibleRopeDemoConfig,
  hdrDemoConfig,
  hdrEnvironmentRotationDefaults,
  ropeDemoConfig,
  ropeDemoModelBindings,
} from './demoConfig';
import type {
  FlexibleRopeCreateItem,
  FlexibleRopeUpdatePayload,
} from './index';

import {
  CC_APP_SOURCE,
  CC_3D_SOURCE,
  isObjectLike,
  postToParent,
  setupWindowMessageListener,
} from './ccPostMessageBridge';

export { CC_APP_SOURCE, CC_3D_SOURCE } from './ccPostMessageBridge';

export type CcAppToChildMessage =
  | {
      source: typeof CC_APP_SOURCE;
      type: 'invoke';
      id: string;
      method: string;
      args?: unknown[];
    }
  | {
      source: typeof CC_APP_SOURCE;
      type: 'flexibleRopeCreate';
      data: FlexibleRopeCreateItem[];
    }
  | {
      source: typeof CC_APP_SOURCE;
      type: 'flexibleRopeUpdate';
      data: FlexibleRopeUpdatePayload;
    };

function isModelUrl(url: string) {
  return /\.(glb|gltf|fbx)$/i.test(url);
}

function modelUrlFromProjectId(projectId: string) {
  return projectId || './Dancing.fbx';
}

function getRopeInitConfigById(id: string) {
  const b = ropeDemoModelBindings.find((x) => x.id === id);
  const c = b?.config ?? {};
  return {
    textureUrl: c.textureUrl ?? ropeDemoConfig.textureUrl,
    textureWidthPx: c.textureWidthPx ?? ropeDemoConfig.textureWidthPx,
    textureHeightPx: c.textureHeightPx ?? ropeDemoConfig.textureHeightPx,
    initialDistance: c.initialDistance ?? ropeDemoConfig.initialDistance,
    initialYawDeg: c.initialYawDeg ?? ropeDemoConfig.initialYawDeg,
    initialPitchDeg: c.initialPitchDeg ?? ropeDemoConfig.initialPitchDeg,
    ropeRadius: c.ropeRadius ?? ropeDemoConfig.ropeRadius,
    ropeShapeType: c.ropeShapeType ?? 'tube',
    boxSelfRotationDeg: c.boxSelfRotationDeg ?? c.boxFlipAngleDeg ?? 0,
    boxFaces: c.boxFaces,
    boxWidth: c.boxWidth,
    boxHeight: c.boxHeight,
  };
}

function initRopeDemo(app: import('./index').App) {
  const bindings = ropeDemoModelBindings;
  bindings.forEach((cfg) => {
    const initCfg = getRopeInitConfigById(cfg.id);
    app.createRopeDemo({
      name: cfg.id,
      meshAName: cfg.meshAName,
      meshBName: cfg.modelBName,
      textureUrl: initCfg.textureUrl,
      textureWidthPx: initCfg.textureWidthPx,
      textureHeightPx: initCfg.textureHeightPx,
      ropeRadius: initCfg.ropeRadius,
      ropeShapeType: initCfg.ropeShapeType,
      boxSelfRotationDeg: initCfg.boxSelfRotationDeg,
      boxFaces: initCfg.boxFaces,
      boxWidth: initCfg.boxWidth,
      boxHeight: initCfg.boxHeight,
      initialDistance: initCfg.initialDistance,
      initialAngleDeg: initCfg.initialYawDeg,
    });
    app.updateRopeDemoByAngleDistance(
      cfg.id,
      initCfg.initialDistance,
      initCfg.initialYawDeg,
      initCfg.initialPitchDeg,
      initCfg.boxSelfRotationDeg,
    );
  });
}

function applyFlexibleRopeCameraDistanceFilter(app: import('./index').App) {
  const ids = app.getAllFlexibleRopePointMeshIds();
  app.setInfoBoardsVisible(ids);
  app.setInfoBoardsCameraDistanceVisibility(true, 0, 30);
}

export interface AppDemoBootstrapOptions {
  canvas: HTMLCanvasElement;
  /** 与路由 query 一致：工程资源 URL 或模型路径 */
  projectId: string;
  onLoading?: (v: number) => void;
}

export interface AppDemoReadyPayload {
  /** 路径索引条数（螺旋桨 demo 等） */
  allCount: number;
  modelNames: string[];
  currentModelName: string;
  loadedAsModel: boolean;
  cameraHelperOn: boolean;
  cameraTargetHelperOn: boolean;
  ropeDemoReady: boolean;
  ropeControlTarget: string;
  flexibleRopeReady: boolean;
  flexibleRopeIds: string[];
  flexibleRopeFirstId: string;
  flexibleRopePointIds: string[];
  flexibleRopePointYaws: number[];
  flexibleRopePointPitches: number[];
  flexibleRopeYaw: number;
  flexibleRopePitch: number;
}

/**
 * 在 iframe 内创建引擎、加载模型/场景、环境、绳子 demo，并注册动画结束日志。
 */
export async function bootstrapAppDemo(opts: AppDemoBootstrapOptions): Promise<{
  destroy: () => void;
  /** 与 postMessage `ready` 的 payload 一致，供同页初始化 UI 使用 */
  readyPayload: AppDemoReadyPayload;
}> {
  const { App } = await import('./index');
  const app = App.Instance;
  const onLoading = opts.onLoading ?? (() => {});

  let cameraDebugTick: ReturnType<typeof setInterval> | null = null;

  const postLoading = (v: number) => {
    onLoading(v);
    postToParent({ source: CC_3D_SOURCE, type: 'loading', value: v });
  };

  await app.init(opts.canvas, true);

  app.onAnimationEnd((info) => {
    console.log('动画播放结束', info);
  });

  const url = modelUrlFromProjectId(opts.projectId);
  let loadedAsModel = false;

  if (isModelUrl(url)) {
    for (const mUrl of MODEL_URLS) {
      await app.loadModelAndScene(mUrl, (progress) => {
        postLoading(progress);
      });
    }
    loadedAsModel = true;

    await app.loadHdrEnvironment({
      url: hdrUrlFromDemo(),
      size: hdrDemoConfig.defaultSize,
      onProgress: (p) => {
        postLoading(0.85 + p * 0.15);
      },
    });
    app.setEnvironmentIntensity(hdrDemoConfig.defaultIntensity);
    app.setEnvironmentRotationEnabled(hdrEnvironmentRotationDefaults.enabled);
    app.setEnvironmentRotationSpeedRadPerSec(hdrEnvironmentRotationDefaults.speedRadPerSec);
    postLoading(1);

    app.createFlexibleRopes(flexibleRopeCreateExample);
    const ropeIds = app.getFlexibleRopeIds();
    applyFlexibleRopeCameraDistanceFilter(app);
  } else {
    const assets = new AppAssets();
    await assets.loadFromUrl(url, (progress) => {
      postLoading(progress * 0.4);
    });
    app.setAssetsLibrary(assets);
    await app.setScene((progress) => {
      postLoading(progress * 0.6 + 0.4);
    });
  }

  const payload = buildReadyPayload(app, loadedAsModel, ropeIdsAfterInit(app, loadedAsModel));
  postToParent({ source: CC_3D_SOURCE, type: 'ready', payload });

  const updateCameraDebug = () => {
    const s = app.getArcRotateCameraDebugState();
    if (!s) {
      postToParent({
        source: CC_3D_SOURCE,
        type: 'cameraDebug',
        text: '相机：非 ArcRotateCamera 或未就绪',
      });
      return;
    }
    const deg = (r: number) => (r * 180) / Math.PI;
    const t = s.target;
    postToParent({
      source: CC_3D_SOURCE,
      type: 'cameraDebug',
      text:
        `target=(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})\n` +
        `radius=${s.radius.toFixed(2)}  beta=${deg(s.beta).toFixed(1)}°  alpha=${deg(s.alpha).toFixed(1)}°`,
    });
  };
  updateCameraDebug();
  cameraDebugTick = setInterval(updateCameraDebug, 120);

  const destroy = () => {
    if (cameraDebugTick) {
      clearInterval(cameraDebugTick);
      cameraDebugTick = null;
    }
    app.onDispose();
  };

  return { destroy, readyPayload: payload };
}

function hdrUrlFromDemo() {
  return hdrDemoConfig.defaultUrl || hdrDemoConfig.initFallbackUrl;
}

function ropeIdsAfterInit(app: import('./index').App, loadedAsModel: boolean): {
  ropeIds: string[];
  firstId: string;
} {
  if (!loadedAsModel) return { ropeIds: [], firstId: '' };
  const ropeIds = app.getFlexibleRopeIds();
  return { ropeIds, firstId: ropeIds[0] ?? '' };
}

function buildReadyPayload(
  app: import('./index').App,
  loadedAsModel: boolean,
  rope: { ropeIds: string[]; firstId: string },
): AppDemoReadyPayload {
  const bindings = ropeDemoModelBindings;
  const ropeControlTarget = '';

  let flexibleRopePointIds: string[] = [];
  let flexibleRopePointYaws: number[] = Array.from(
    { length: flexibleRopeDemoConfig.pointCount },
    () => 0,
  );
  let flexibleRopePointPitches: number[] = Array.from(
    { length: flexibleRopeDemoConfig.pointCount },
    () => 0,
  );
  let flexibleRopeYaw = 0;
  let flexibleRopePitch = 0;

  if (rope.firstId) {
    flexibleRopePointIds = app.getFlexibleRopePointIds(rope.firstId);
    const offsets = app.getFlexibleRopePointYawPitch(rope.firstId);
    flexibleRopePointYaws = offsets.yawsDeg;
    flexibleRopePointPitches = offsets.pitchesDeg;
    const dir = app.getFlexibleRopeDirection(rope.firstId);
    if (dir) {
      flexibleRopeYaw = dir.yaw;
      flexibleRopePitch = dir.pitch;
    }
  }

  return {
    allCount: app.allCount,
    modelNames: app.getModelNames(),
    currentModelName: app.getCurrentModelName() || '',
    loadedAsModel,
    cameraHelperOn: app.isCameraHelperEnabled,
    cameraTargetHelperOn: app.isCameraTargetHelperEnabled,
    ropeDemoReady: false,
    ropeControlTarget,
    flexibleRopeReady: loadedAsModel && rope.ropeIds.length > 0,
    flexibleRopeIds: rope.ropeIds,
    flexibleRopeFirstId: rope.firstId,
    flexibleRopePointIds,
    flexibleRopePointYaws,
    flexibleRopePointPitches,
    flexibleRopeYaw,
    flexibleRopePitch,
  };
}

/**
 * iframe 内监听父页面发来的 invoke / 柔性绳消息。
 */
export function setupAppDemoChildBridge(): () => void {
  return setupWindowMessageListener((event, data) => {
    if (!isObjectLike(data)) return;

    void (async () => {
      const { App } = await import('./index');
      const app = App.Instance;

      // 兼容业务侧简化指令格式：
      // { cmd: 'switchCamera', param: 'default' | 'czz' | 'ttz' | 'jsz' }
      if ((data as any).cmd === 'switchCamera') {
        const key = String((data as any).param || 'default');
        const item = (cameraPresetsConfig as Record<string, { preset: any }>)[key];
        if (item?.preset) {
          app.switchCameraView(item.preset, { duration: 0.8 });
        }
        return;
      }

      // 业务侧简化指令格式：
      // { cmd: 'directionControl', param: '0~360'(string) } 顺时针旋转受控模型
      if ((data as any).cmd === 'directionControl') {
        const raw = String((data as any).param ?? '');
        const deg = Number(raw);
        // 使用 demoConfig 中指定的受控模型名数组
        directionControlConfig.modelNames.forEach((name) => {
          app.setModelYawDegClockwise(name, deg);
        });
        return;
      }

      const raw = data as CcAppToChildMessage | undefined;
      if (!raw || raw.source !== CC_APP_SOURCE) return;

      if (raw.type === 'flexibleRopeCreate' && Array.isArray(raw.data)) {
        app.createFlexibleRopes(raw.data);
        return;
      }
      if (raw.type === 'flexibleRopeUpdate' && raw.data?.parentId) {
        app.updateFlexibleRopePoints(raw.data);
        return;
      }
      if (raw.type !== 'invoke' || !raw.method) return;

      const id = raw.id;
      const fn = (app as unknown as Record<string, unknown>)[raw.method];
      try {
        if (typeof fn !== 'function') {
          throw new Error(`unknown method: ${raw.method}`);
        }
        const result = await Promise.resolve(
          (fn as (...a: unknown[]) => unknown).apply(app, raw.args ?? []),
        );
        postToParent({ source: CC_3D_SOURCE, type: 'invokeResult', id, result });
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        postToParent({ source: CC_3D_SOURCE, type: 'invokeResult', id, error: err });
      }
    })();
  });
}
