import { Light, Scene } from '@babylonjs/core';
import { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';

export function serializeLight(light: Light, node: CC.LightNode, assetsManager: ICollectAssets) {
  node.type = 'light';
  node.data = light.serialize();
}

export function deserializeLight(node: CC.LightNode, scene: Scene, assetsManager: ILoaderAssets) {
  return Light.Parse(node.data, scene);
}
