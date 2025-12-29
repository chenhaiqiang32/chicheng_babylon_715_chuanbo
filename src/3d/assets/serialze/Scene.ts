import {
  Color3,
  Color4,
  CubeTexture,
  DefaultRenderingPipeline,
  Engine,
  Scene,
  SSAO2RenderingPipeline,
  SSRRenderingPipeline,
  Vector3,
  type TransformNode,
} from '@babylonjs/core';
import { deserializeNode, serializeNode } from './node/Node';
import type { CC } from '../BaseRes';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';
import {
  parseDefaultRenderingPipeline,
  serializeDefaultRenderingPipeline,
} from '@/3d/rendering/default-pipeline';
import { parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline } from '@/3d/rendering/ssao';
import { parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from '@/3d/rendering/ssr';
import { BackgroundEnvFactory } from './BackgroundEnv';

export async function serializeScene(
  scene: Scene,
  assets: ICollectAssets,
  serializeAssets: boolean = true,
): Promise<CC.Scene> {
  const result: Partial<CC.Scene> = {};
  result.uuid = scene.uuid;
  result.type = 'scene';
  result.name = scene.name;
  result.autoClear = scene.autoClear;
  result.clearColor = scene.clearColor.asArray();
  result.collisionsEnabled = scene.collisionsEnabled;
  result.useRightHandedSystem = scene.useRightHandedSystem;
  result.animation = scene.runtimeAnimation as CC.Animation[];
  result.fog = {
    fogMode: scene.fogMode,
    color: scene.fogColor.asArray(),
    fogStart: scene.fogStart,
    fogEnd: scene.fogEnd,
    fogDensity: scene.fogDensity,
  };
  if (scene.physicsEnabled) {
    const physicEngine = scene.getPhysicsEngine();
    result.physic = {
      enabled: scene.physicsEnabled,
      gravity: physicEngine?.gravity.asArray(),
      physicsEngine: physicEngine?.getPhysicsPluginName(),
    };
  }
  result.metadata = scene.metadata;
  result.activeCamera = scene.activeCamera?.uuid;
  result.reflectionProbes = scene.reflectionProbes?.map((item) => item.serialize());
  result.environment = {
    texture: scene.environmentTexture?.uniqueId,
    url: (scene.environmentTexture as CubeTexture).url,
    intensity: scene.environmentIntensity,
  };
  // 用策略模式根据背景类型不同，执行不同的序列化
  console.log(scene?.bgType);
  result.background = await BackgroundEnvFactory.createFromScene(scene?.bgType).serialize(scene);
  result.iblIntensity = scene.iblIntensity;
  result.nodes = [];
  for (let index = 0; index < scene.rootNodes.length; index++) {
    const element = scene.rootNodes[index];
    if(element.isSkyBox) continue;
    const node = await serializeNode(element as TransformNode, assets, serializeAssets);
    result.nodes.push(node);
  }
  const defaultPipeline = scene.postProcessRenderPipelineManager.supportedPipelines.find(
    (x) => x instanceof DefaultRenderingPipeline,
  );
  if (defaultPipeline) {
    result.defaultRenderingPipeline = serializeDefaultRenderingPipeline(defaultPipeline);
  }
  const ssaoPipeline = scene.postProcessRenderPipelineManager.supportedPipelines.find(
    (x) => x instanceof SSAO2RenderingPipeline,
  );
  if (ssaoPipeline) {
    result.ssao2RenderingPipeline = serializeSSAO2RenderingPipeline(ssaoPipeline);
  }
  const ssrPostProcess = scene.postProcessRenderPipelineManager.supportedPipelines.find(
    (x) => x instanceof SSRRenderingPipeline,
  );
  if (ssrPostProcess) {
    result.ssrPostProcess = serializeSSRRenderingPipeline(ssrPostProcess);
  }

  return result as CC.Scene;
}

export async function deserializeScene(
  sceneData: CC.Scene,
  engine: Engine,
  assets: ILoaderAssets,
  scene?: Scene,
  padding: Array<Promise<any>> = [],
) {
  scene = scene ?? new Scene(engine);
  scene.runtimeAnimation = sceneData.animation as any;
  scene.name = sceneData.name;
  scene.metadata = sceneData.metadata;
  scene.uuid = sceneData.uuid;
  scene.autoClear = sceneData.autoClear;
  scene.clearColor = new Color4(...sceneData.clearColor);
  scene.collisionsEnabled = sceneData.collisionsEnabled;
  scene.useRightHandedSystem = false;
  scene.fogMode = sceneData.fog.fogMode;
  scene.fogColor = new Color3(...sceneData.fog.color);
  scene.fogStart = sceneData.fog?.fogStart;
  scene.fogEnd = sceneData.fog?.fogEnd;
  scene.fogDensity = sceneData.fog?.fogDensity;
  scene.iblIntensity = sceneData.iblIntensity;
  // await import('@babylonjs/inspector');
  // scene.debugLayer.show();
  if (sceneData.physic) {
    scene.physicsEnabled = sceneData.physic.enabled;
    if (sceneData.physic.gravity) {
      scene.getPhysicsEngine()?.setGravity(new Vector3(...sceneData.physic?.gravity));
    }
  }
  scene.physicsEnabled = sceneData.physic?.enabled;
  if (scene) {
    scene.getPhysicsEngine()?.setGravity(new Vector3(...sceneData.physic?.gravity));
  }
  for (const node of sceneData.nodes) {
    await deserializeNode(node, scene, assets, null, false, padding);
  }
  if (sceneData.environment) {
    scene.environmentTexture = new CubeTexture(sceneData.environment.url, scene);
    scene.environmentIntensity = sceneData.environment.intensity;
  }
  if(sceneData.background) {
    BackgroundEnvFactory.createFromScene(sceneData.background.type).deserialize(scene, sceneData);
  }
  if (sceneData.defaultRenderingPipeline) {
    parseDefaultRenderingPipeline(sceneData.defaultRenderingPipeline, scene);
  }
  if (sceneData.ssao2RenderingPipeline) {
    parseSSAO2RenderingPipeline(sceneData.ssao2RenderingPipeline, scene);
  }
  if (sceneData.ssrPostProcess) {
    parseSSRRenderingPipeline(sceneData.ssrPostProcess, scene);
  }
  scene.activeCamera =
    scene.cameras.find((x) => x.uuid == sceneData.activeCamera) ?? scene.cameras[0];
  return scene;
}
