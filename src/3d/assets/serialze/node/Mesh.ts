import {
  AbstractMesh,
  BaseTexture,
  GaussianSplattingMesh,
  Mesh,
  Scene,
  SceneSerializer,
  Tools,
} from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';
import { CollisionMesh, CollisionShapeFactory } from '@/tools/node/physics';
import { UniqueNumber } from '@/tools/guards/tools';

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
  meshData.receiveShadows = mesh.receiveShadows;
  meshData.castShadows = mesh.castShadows;

  // 保存物理配置（collisionMesh）
  const collisionMesh = (mesh as any).collisionMesh;
  if (collisionMesh && collisionMesh.shape) {
    // 确保 metadata 存在
    mesh.metadata = mesh.metadata || {};
    // 保存碰撞体配置到 metadata
    mesh.metadata.physics = mesh.metadata.physics || {};
    mesh.metadata.physics.collider = {
      type: collisionMesh.shape.type,
      shape: collisionMesh.shape.toJSON(),
      isTrigger: collisionMesh.isTrigger,
    };
  }

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
  mesh.receiveShadows = data.receiveShadows;
  mesh.castShadows = data.castShadows;
  if (data.geometry) {
    const getMesh = async () => {
      const g = await assets.getGeometry(data.geometry);
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

  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;
  mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;

  // // 恢复物理配置（collisionMesh）
  // if (data.metadata?.physics?.collider) {
  //   const restorePhysics = async () => {
  //     try {
  //       const colliderData = data.metadata.physics.collider;

  //       // 创建 CollisionMesh 实例
  //       const collisionMesh = new CollisionMesh(`${mesh.name} Collider`, scene, mesh);
  //       collisionMesh.id = Tools.RandomId();
  //       collisionMesh.uniqueId = UniqueNumber.Get();

  //       // 标记为编辑器辅助工具，不参与场景逻辑和序列化
  //       (collisionMesh as any).isIgnore = true;
  //       collisionMesh.doNotSerialize = true;

  //       // 从 JSON 恢复形状数据并重建几何体
  //       await collisionMesh.setType(colliderData.type, mesh, false);

  //       // 应用保存的形状参数（覆盖默认值）
  //       const savedShape = CollisionShapeFactory.fromJSON(colliderData.shape);
  //       Object.assign(collisionMesh.shape, savedShape);

  //       // 根据恢复的参数重建几何体
  //       collisionMesh.rebuildGeometry();

  //       // 恢复触发器状态
  //       collisionMesh.isTrigger = colliderData.isTrigger || false;

  //       // 保存到网格属性（供编辑器和运行时使用）
  //       (mesh as any).collisionMesh = collisionMesh;

  //       // 默认隐藏碰撞体可视化（用户启用物理时会显示）
  //       collisionMesh.setVisibility(false);
  //     } catch (error) {
  //       console.warn(`恢复物理配置失败 "${mesh.name}":`, error);
  //     }
  //   };
  //   padding.push(restorePhysics);
  // }

  return mesh;
}
