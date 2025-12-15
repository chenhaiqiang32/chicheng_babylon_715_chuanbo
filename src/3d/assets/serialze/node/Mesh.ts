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
    assetsManager.addMaterial(mesh.material);
    meshData.material = mesh.material?.uuid || '';
  }
}

export async function deserializeMeshNode(
  data: CC.MeshNode,
  scene: Scene,
  assets: ILoaderAssets,
  padding: Array<Promise<any>> = [],
) {
  const mesh = new Mesh(data.name, scene, {});
  if (data.geometry) {
    const geometryPromise = assets.getGeometry(data.geometry);
    padding.push(geometryPromise);
    geometryPromise.then((g) => {
      g.applyToMesh(mesh);
      mesh.geometry.uuid = data.geometry;
      mesh.sideOrientation = 0;
    });
  } else {
  }
  if (data.material) {
    // const materialPromise = assets.getMaterial(data.material);
    // padding.push(materialPromise);
    // materialPromise.then((s) => {
    //   console.log(2222);
    //   mesh.material = s;
    //   mesh.markAsDirty();
    // });
  }
  return mesh;
}
