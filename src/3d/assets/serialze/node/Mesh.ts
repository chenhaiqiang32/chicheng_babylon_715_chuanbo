import { BaseTexture, GaussianSplattingMesh, Mesh, Scene, SceneSerializer } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';

export function serializeMeshNode(
  mesh: Mesh,
  meshData: CC.MeshNode,
  assetsManager: ICollectAssets,
  padding: Array<Padding> = [],
) {
  // 天空盒会创建一个skybox的mesh，过滤掉
  if (mesh instanceof GaussianSplattingMesh || mesh.isIgnore) {
    return;
  }
  meshData.type = 'mesh';
  meshData.checkCollisions = mesh.checkCollisions;
  meshData.material = mesh.material?.uuid || '';
  meshData.sideOrientation = mesh.sideOrientation;

  if (mesh.geometry) {
    const getGeometry = async () => {
      await assetsManager.addGeometry(mesh.geometry);
      meshData.geometry = mesh.geometry?.uuid || '';
    };
    padding.push(getGeometry);
  }
  if (mesh.material) {
    mesh.material.isDirty = true;
    for (const element in mesh.material) {
      //@ts-ignore
      const value = mesh.material[element];
      if (value instanceof BaseTexture) {
        value.isDirty = true;
      }
    }
    const getMaterial = async () => {
      await assetsManager.addMaterial(mesh.material);
      meshData.material = mesh.material?.uuid || '';
    };
    padding.push(getMaterial);
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
  mesh.sideOrientation = data.sideOrientation;
  if (data.geometry) {
    const getMesh = async () => {
      const g = await assets.getGeometry(data.geometry);
      console.log(g);
      g.applyToMesh(mesh);
      mesh.geometry.uuid = data.geometry;
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
