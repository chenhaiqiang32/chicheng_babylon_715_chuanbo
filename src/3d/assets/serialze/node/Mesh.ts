import { GaussianSplattingMesh, Mesh, Scene, SceneSerializer } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';

export function serializeMeshNode(
  mesh: Mesh,
  meshData: CC.MeshNode,
  assetsManager: ICollectAssets,
  serializeAssets: boolean = true,
) {
  // 天空盒会创建一个skybox的mesh，过滤掉
  if (mesh instanceof GaussianSplattingMesh || mesh.isSkyBox) {
    return;
  }

  meshData.type = 'mesh';
  meshData.checkCollisions = mesh.checkCollisions;
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

export function deserializeMeshNode(
  data: CC.MeshNode,
  scene: Scene,
  assets: ILoaderAssets,
  padding: Array<Padding> = [],
) {
  const mesh = new Mesh(data.name, scene, {});
  mesh.checkCollisions = data.checkCollisions;
  if (data.geometry) {
    const getMesh = async () => {
      const g = await assets.getGeometry(data.geometry);
      g.applyToMesh(mesh);
      mesh.geometry.uuid = data.geometry;
      mesh.sideOrientation = 0;
    };
    padding.push(getMesh);
  }
  if (data.material) {
    const getMaterial = async () => {
      const m = await assets.getMaterial(data.material);
      mesh.material = m;
      mesh.markAsDirty();
    };
    padding.push(getMaterial);
  }
  return mesh;
}
