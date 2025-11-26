import { Light, Scene } from '@babylonjs/core';
import { CC } from '../../BaseRes';
import { IAssets } from '../../AssetsManager';

export function serializeLight(light: Light, node: CC.LightNode, assetsManager: IAssets) {
  node.type = 'light';
  node.data = light.serialize();
}

export function deserializeLight(node: CC.LightNode, scene: Scene) {
  return Light.Parse(node.data, scene);
}
