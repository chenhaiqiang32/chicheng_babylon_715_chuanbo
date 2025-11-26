import { Camera, Scene } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { IAssets } from '../../AssetsManager';

export function serializeCamera(camera: Camera, node: CC.CameraNode, assetsManager: IAssets) {
  node.type = 'camera';
  node.data = camera.serialize();
}

export function deserializeCamera(node: CC.CameraNode, scene: Scene) {
  return Camera.Parse(node.data, scene);
}
