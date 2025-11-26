import { Mesh, Scene } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { IAssets } from '../../AssetsManager';

export function serializeMeshNode(mesh: Mesh, meshData: CC.MeshNode, assetsManager: IAssets) {
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

export async function deserializeMeshNode(data: CC.MeshNode, scene: Scene, assets: IAssets) {
  const mesh = new Mesh(data.name, scene, {});
  mesh.sideOrientation = data.sideOrientation;
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
  mesh.markAsDirty();
  return mesh;
}
