import { Mesh, Scene, SceneSerializer } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';

export function serializeMeshNode(
  mesh: Mesh,
  meshData: CC.MeshNode,
  assetsManager: ICollectAssets,
) {
  meshData.type = 'mesh';
  meshData.material = mesh.material?.uuid || '';
  meshData.sideOrientation = mesh.sideOrientation;
  if (mesh.geometry) {
    assetsManager.addGeometry(mesh.geometry);
    meshData.geometry = mesh.geometry?.uuid;
  }
  if (mesh.material) {
    assetsManager.addMaterial(mesh.material);
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
  mesh.sideOrientation = data.sideOrientation;
  mesh.markAsDirty();
  return mesh;
}
