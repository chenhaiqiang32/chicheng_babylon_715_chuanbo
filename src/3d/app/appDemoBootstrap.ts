/**
 * Demo 场景：三维页独立初始化（由 viewer iframe 调用），与业务页通过 postMessage 通信。
 */
import { AppAssets } from '../assets/PublishLibrary';
import { MODEL_URLS } from './modelUrls.generated';
import {
  cameraPresetsConfig,
  defaultCameraViewLimitConfig,
  flexibleRopeCreateExample,
  flexibleRopeDemoConfig,
  hdrDemoConfig,
  hdrEnvironmentRotationDefaults,
  infoBoardAlarmBindConfig,
  infoBoardBindConfig,
  ropeDemoConfig,
  ropeDemoModelBindings,
} from './demoConfig';
import type { InfoBoardItem } from './InfoBoardHelper';
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

/** 接收阵 5202H：cgqArray 单项（与业务字符串一致，在内部转为数值） */
type JszCgqItem = {
  fgsszRaw: string;
  fysszRaw: string;
  hxsszRaw: string;
  sdsszRaw: string;
};

/** 段长：无 length 字段时用与 demo 一致的等分绳段（与 demo-3d-host 原 jszSensor 模拟一致） */
const JSZ_DEFAULT_SEGMENT_LEN = 20 / 18;

function parse5202CgqArray(param: unknown): JszCgqItem[] | null {
  if (!param || typeof param !== 'object') return null;
  const cgqArray = (param as { cgqArray?: unknown }).cgqArray;
  if (!Array.isArray(cgqArray) || cgqArray.length !== 34) return null;
  return cgqArray.map((raw) => {
    const o = raw as Record<string, unknown>;
    return {
      fgsszRaw: String(o.fgsszRaw ?? ''),
      fysszRaw: String(o.fysszRaw ?? ''),
      hxsszRaw: String(o.hxsszRaw ?? ''),
      sdsszRaw: String(o.sdsszRaw ?? ''),
    };
  });
}

function applyReceiveArraySensor5202Payload(app: import('./index').App, param: unknown) {
  const sensorList = parse5202CgqArray(param);
  if (!sensorList) return;

  // 业务约定：1-17 为 rope_1 的 17 个点；18-34 为 rope_2 的 17 个点（顺序从头到尾）
  const groups: Array<{ id: string; sensors: JszCgqItem[] }> = [
    { id: 'rope_1', sensors: sensorList.slice(0, 17) },
    { id: 'rope_2', sensors: sensorList.slice(17, 34) },
  ];

  // 用 demoConfig 里的 flexibleRopeCreateExample 作为模板；距离按固定段长累加（原 SensorList.length 已移除）
  const baseById = new Map(flexibleRopeCreateExample.map((x) => [x.id, x] as const));

  const createItems: FlexibleRopeCreateItem[] = [];
  const updates: FlexibleRopeUpdatePayload[] = [];

  for (const g of groups) {
    const base = baseById.get(g.id);
    if (!base) continue;
    const sensors = g.sensors;
    if (sensors.length !== base.length.length) continue;

    let acc = 0;
    const length = base.length.map((p, i) => {
      acc += JSZ_DEFAULT_SEGMENT_LEN;
      return { id: p.id, distance: acc };
    });

    createItems.push({
      ...base,
      length,
    });

    updates.push({
      parentId: base.id,
      length: base.length.map((p, i) => ({
        id: p.id,
        yaw: Number(sensors[i]?.hxsszRaw ?? 0),
        pitch: Number(sensors[i]?.fysszRaw ?? 0),
        depth: Math.max(0, Number(sensors[i]?.sdsszRaw ?? 0)),
        fgssz: Number(sensors[i]?.fgsszRaw ?? 0),
      })),
    });
  }

  if (createItems.length) app.createFlexibleRopes(createItems);
  for (const u of updates) app.updateFlexibleRopePoints(u);
}

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
  const ids = app.getInfoBoardCameraDistanceFilterTargetIds();
  app.setInfoBoardsVisible(ids);
  app.setInfoBoardsCameraDistanceVisibility(true, 0, 30);
}

function getParamValueByPath(param: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = param;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur === null || cur === undefined) return '';
  return String(cur);
}

/** 按 boardBindCmd 分路缓存，合并再 setInfoBoards，避免 5206H 与 5208H 互相覆盖 */
const sensorInfoBoardItemsByCmd = new Map<string, InfoBoardItem[]>();
/** 最近一次 5206H / 5208H 的 param，供仅推送告警码时重算 attributeAlarm */
const lastSensorParamByBindCmd = new Map<string, Record<string, unknown>>();
/**
 * 绑定命令 -> 异常中的「测点绑定路径」集合（与 boardBindCmdKey 一致，如 skpdyObject.fgsszRaw）
 * 由 5207H / 5203H 等写入；0 正常会从此集合移除对应 bindKey。
 */
const alarmAbnormalBindKeysByBindCmd = new Map<string, Set<string>>();

function buildSensorInfoItemsForBindCmd(
  app: import('./index').App,
  bindCmd: string,
  param: Record<string, unknown>,
): InfoBoardItem[] | null {
  type Entry = (typeof infoBoardBindConfig)[keyof typeof infoBoardBindConfig];
  let cfg: Entry | undefined;
  for (const v of Object.values(infoBoardBindConfig) as Entry[]) {
    if (v.boardBindCmd === bindCmd) {
      cfg = v;
      break;
    }
  }
  if (!cfg) return null;

  const abnormalSet = alarmAbnormalBindKeysByBindCmd.get(bindCmd) ?? new Set<string>();
  const items: InfoBoardItem[] = [];

  for (const sensor of cfg.sensorList) {
    const node = app.getNodeUnderModelByName(cfg.modelName, sensor.childModelName);
    const mesh = node ? app.getAbstractMeshUnderNode(node) : null;
    if (!mesh) continue;
    const attribute = sensor.boardAttribute.map((ba) => {
      const raw = getParamValueByPath(param, ba.boardBindCmdKey);
      return { [ba.boardBindCmdName]: raw === '' ? '--' : raw };
    });
    const sensorKey =
      sensor.boardAttribute[0]?.boardBindCmdKey?.split('.')?.[0] ?? sensor.childModelName;
    const attributeAlarm = sensor.boardAttribute.map((ba) => abnormalSet.has(ba.boardBindCmdKey));
    items.push({
      id: String(mesh.uniqueId),
      title: sensor.boardTitle,
      attribute,
      attributeAlarm,
      clickReport: { type: bindCmd, data: sensorKey },
    });
  }
  return items;
}

function flushMergedSensorInfoBoards(app: import('./index').App) {
  const merged: InfoBoardItem[] = [];
  for (const list of sensorInfoBoardItemsByCmd.values()) {
    merged.push(...list);
  }
  app.setSensorBindInfoBoardTargetIds(merged.map((x) => x.id));
  // 与仅刷新单路时一致：无任何可挂接牌子时不调用 setInfoBoards，以免误 clear 其它业务牌子
  if (!merged.length) {
    app.syncInfoBoardCameraFilterVisibleIds();
    return;
  }
  app.setSensorInfoBoards(merged);
  app.setInfoBoardsCameraDistanceVisibility(true, 0, 120);
  app.syncInfoBoardCameraFilterVisibleIds();
}

/**
 * 按 demoConfig.infoBoardBindConfig 将业务 cmd（如 5206H / 5208H）的 param 推到对应子模型上的信息牌。
 */
function applySensorInfoBoardFromCmd(app: import('./index').App, cmd: string, param: unknown) {
  if (!param || typeof param !== 'object') return;
  const p = param as Record<string, unknown>;
  type Entry = (typeof infoBoardBindConfig)[keyof typeof infoBoardBindConfig];
  const hasCfg = (Object.values(infoBoardBindConfig) as Entry[]).some((x) => x.boardBindCmd === cmd);
  if (!hasCfg) return;

  lastSensorParamByBindCmd.set(cmd, p);
  const items = buildSensorInfoItemsForBindCmd(app, cmd, p);
  if (items === null) return;
  sensorInfoBoardItemsByCmd.set(cmd, items);
  flushMergedSensorInfoBoards(app);
}

/**
 * 5207H / 5203H 等：按 infoBoardAlarmBindConfig 将 cmdKey 状态（0 正常 / 1 异常）反映到关联绑定指令的信息牌行颜色。
 */
function applySensorAlarmFromCmd(app: import('./index').App, alarmCmd: string, param: unknown) {
  if (!param || typeof param !== 'object') return;
  const p = param as Record<string, unknown>;
  const entry = (infoBoardAlarmBindConfig.alarmList as readonly {
    cmdName: string;
    cmdBindCmd: string;
    sensorList: readonly { cmdKey: string; cmdKeyBind: string }[];
  }[]).find((x) => x.cmdName === alarmCmd);
  if (!entry) return;

  const abnormal = new Set<string>();
  for (const row of entry.sensorList) {
    const raw = getParamValueByPath(p, row.cmdKey);
    if (String(raw).trim() === '1') {
      abnormal.add(row.cmdKeyBind);
    }
  }
  alarmAbnormalBindKeysByBindCmd.set(entry.cmdBindCmd, abnormal);

  const last = lastSensorParamByBindCmd.get(entry.cmdBindCmd);
  if (!last) return;
  const items = buildSensorInfoItemsForBindCmd(app, entry.cmdBindCmd, last);
  if (items === null) return;
  sensorInfoBoardItemsByCmd.set(entry.cmdBindCmd, items);
  flushMergedSensorInfoBoards(app);
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

    // 柔性绳子由业务侧（demo host）通过 cmd: 5202H 推送 cgqArray 后创建/更新。
    // 这里不再默认创建，避免“本地配置”与“业务推送”两套数据源同时生效。
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

      // 接收阵传感器（全量 34 点）：柔性绳子数据源
      // { cmd:"5202H", param:{ cgqArray:[{ fgsszRaw, fysszRaw, hxsszRaw, sdsszRaw }]×34 } }
      if ((data as any).cmd === '5202H') {
        applyReceiveArraySensor5202Payload(app, (data as any).param);
        applyFlexibleRopeCameraDistanceFilter(app);
        return;
      }

      // 接收阵柔性绳告警 5203H：cgqArray×34，与 5202H 同序（见 App.apply5203HReceiveArrayAlarm）
      if (String((data as any).cmd ?? '') === '5203H') {
        app.apply5203HReceiveArrayAlarm((data as any).param);
        app.syncInfoBoardCameraFilterVisibleIds();
        return;
      }

      // 传感器信息牌告警：5207H↔5206H 等，配置见 demoConfig.infoBoardAlarmBindConfig
      {
        const acmd = String((data as any).cmd ?? '');
        const alarmHit = infoBoardAlarmBindConfig.alarmList.some((x) => x.cmdName === acmd);
        if (alarmHit) {
          applySensorAlarmFromCmd(app, acmd, (data as any).param);
          return;
        }
      }

      // 传感器信息牌：5206H 垂直阵 / 5208H 托体阵等，配置见 demoConfig.infoBoardBindConfig
      {
        const cmd = String((data as any).cmd ?? '');
        if (cmd) {
          type Entry = (typeof infoBoardBindConfig)[keyof typeof infoBoardBindConfig];
          const hasBind = (Object.values(infoBoardBindConfig) as Entry[]).some(
            (x) => x.boardBindCmd === cmd,
          );
          if (hasBind) {
            applySensorInfoBoardFromCmd(app, cmd, (data as any).param);
            return;
          }
        }
      }

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
      // { cmd: 'directionControl', param: '0~360'(string) } 顺时针设置 ArcRotateCamera.alpha（与鼠标绕目标一致），指北针不随本指令旋转
      if ((data as any).cmd === 'directionControl') {
        const raw = String((data as any).param ?? '');
        const deg = Number(raw);
        app.setDirectionControlCameraYawDegClockwise(deg);
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
