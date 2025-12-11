import {
  Color3,
  Color4,
  CubeTexture,
  Engine,
  Scene,
  Vector3,
  type TransformNode,
} from '@babylonjs/core';
import { deserializeNode, serializeNode } from './node/Node';
import type { CC } from '../BaseRes';
import { ICollectAssets, ILoaderAssets } from '../AssetsManager';

export function serializeScene(
  scene: Scene,
  assets: ICollectAssets,
  serializeAssets: boolean = true,
): CC.Scene {
  const result: Partial<CC.Scene> = {};
  result.uuid = scene.uuid;
  result.type = 'scene';
  result.name = scene.name;
  result.autoClear = scene.autoClear;
  result.clearColor = scene.clearColor.asArray();
  result.collisionsEnabled = scene.collisionsEnabled;
  result.useRightHandedSystem = scene.useRightHandedSystem;
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
  result.activeCamera = scene.activeCamera?.uniqueId;
  result.reflectionProbes = scene.reflectionProbes?.map((item) => item.serialize());
  result.environment = {
    texture: scene.environmentTexture?.uniqueId,
    url: (scene.environmentTexture as CubeTexture).url,
    intensity: scene.environmentIntensity,
  };
  result.iblIntensity = scene.iblIntensity;

  result.nodes = scene.rootNodes.map((item) =>
    serializeNode(item as TransformNode, assets, serializeAssets),
  );
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

  return scene;
}
