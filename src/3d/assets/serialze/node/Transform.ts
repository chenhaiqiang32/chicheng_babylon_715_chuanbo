import { ParticleSystemSet, Quaternion, type TransformNode } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';

export function serializeTransformNode(
  trans: TransformNode,
  node: CC.TransformNode,
  assetsManager: ICollectAssets,
): Partial<CC.TransformNode> {
  try {
    node.position = trans.position.asArray();
    node.rotation = trans.rotationQuaternion?.asArray() || trans.rotation?.asArray() || [];
    node.scale = trans.scaling?.asArray();
    console.log(node.particleSet);

    if (trans.particleSystem) {
      node.particleSet = trans.particleSystem.serialize();
      trans.particleSystem.systems.forEach((p, i) => {
        //p.particleTexture
        if (p.particleTexture) {
          console.log(p.particleTexture);
          assetsManager.addTexture(p.particleTexture);
        }
        node.particleSet.systems[i].particleTextureMap = p.particleTexture?.uuid;
        delete node.particleSet.systems[i].particleTexture
      });

      console.log(node.particleSet);

    }
    return node;
  } catch (error) {
    console.error('序列化变换节点时出错:', node);
    return {};
  }
}
export function deserializeTransformNode(node: CC.TransformNode, trans: TransformNode, assetsManager: ILoaderAssets) {
  trans.position.set(node.position[0], node.position[1], node.position[2]);
  trans.rotationQuaternion = new Quaternion(
    node.rotation[0],
    node.rotation[1],
    node.rotation[2],
    node.rotation[3],
  );
  trans.scaling.set(node.scale[0], node.scale[1], node.scale[2]);
  if (node.particleSet) {
    trans.particleSystem = ParticleSystemSet.Parse(node.particleSet, trans.getScene());
    node.particleSet.systems.forEach((p: { particleTextureMap: any; }, i: number) => {
      if (p.particleTextureMap) {
        assetsManager.getTexture(p.particleTextureMap).then(texture => {
          trans.particleSystem.systems[i].particleTexture = texture;
        });

      }
    });
  }
}
