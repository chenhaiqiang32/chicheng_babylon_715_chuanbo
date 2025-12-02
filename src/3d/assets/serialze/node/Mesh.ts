import { Mesh, Scene, SceneSerializer } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';

export function serializeMeshNode(
  mesh: Mesh,
  meshData: CC.MeshNode,
  assetsManager: ICollectAssets,
  serializeAssets: boolean = true,
) {
  meshData.type = 'mesh';
  meshData.material = mesh.material?.uuid || '';
  if (mesh.geometry) {
    if (serializeAssets) {
      assetsManager.addGeometry(mesh.geometry);
    }
    meshData.geometry = mesh.geometry?.uuid;
  }
  if (mesh.material) {
    if (serializeAssets) {
      assetsManager.addMaterial(mesh.material);
    }
    meshData.material = mesh.material?.uuid || '';
  }
}

export async function deserializeMeshNode(data: CC.MeshNode, scene: Scene, assets: ILoaderAssets) {
  const mesh = new Mesh(data.name, scene, {});
  mesh.uniqueId = data.id;
  if (data.geometry) {
    const geoInfo = await assets.getGeometry(data.geometry);
    geoInfo.applyToMesh(mesh);
    mesh.geometry.uuid = data.geometry;
  } else {
  }
  if (data.material) {
    mesh.material = await assets.getMaterial(data.material);
  }
  mesh.sideOrientation = 0;
  mesh.markAsDirty();
  return mesh;
}
