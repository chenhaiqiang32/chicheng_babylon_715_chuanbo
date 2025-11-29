import { Camera, Scene } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';

export function serializeCamera(
  camera: Camera,
  node: CC.CameraNode,
  assetsManager: ICollectAssets,
) {
  node.type = 'camera';
  node.data = camera.serialize();
}

export function deserializeCamera(node: CC.CameraNode, scene: Scene, assetsManager: ILoaderAssets) {
  return Camera.Parse(node.data, scene);
}
