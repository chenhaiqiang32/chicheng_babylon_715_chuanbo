import { Mesh, ParticleSystemSet, Quaternion, type TransformNode } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';
import { ParticleContainer } from '@/3d/core/Extension/ParticleContainer';

export  function serializeParticleNode(
    trans: ParticleContainer,
    node: CC.ParticleContainer,
    assetsManager: ICollectAssets,
    padding:Array<Padding> = [],
): CC.ParticleContainer {
    try {
        node.position = trans.position.asArray();
        node.rotation = trans.rotationQuaternion?.asArray() || trans.rotation?.asArray() || [];
        node.scale = trans.scaling?.asArray();
        node.type = 'particle';

        if (trans.particleSystems) {
            node.particleSet = trans.particleSystems.serialize();

            for (let index = 0; index < trans.particleSystems.systems.length; index++) {
                const p = trans.particleSystems.systems[index];
                if (p.particleTexture) {
                    const addTexture = async () => {
                        await assetsManager.addTexture(p.particleTexture);
                        node.particleSet.systems[index].particleTextureMap = p.particleTexture?.uuid;
                      };
                      padding.push(addTexture);
                    delete node.particleSet.systems[index].particleTexture;
                }

            }
        }
        return node;
    } catch (error) {
        console.error('序列化变换节点时出错:', node);
        return null;
    }
}
export function deserializeParticleNode(
    node: CC.ParticleContainer,
    trans: ParticleContainer,
    assetsManager: ILoaderAssets,
) {
    trans.position.set(node.position[0], node.position[1], node.position[2]);
    trans.rotationQuaternion = new Quaternion(
        node.rotation[0],
        node.rotation[1],
        node.rotation[2],
        node.rotation[3],
    );
    trans.scaling.set(node.scale[0], node.scale[1], node.scale[2]);
    if (node.particleSet) {
        trans.particleSystems = ParticleSystemSet.Parse(node.particleSet, trans.getScene());
        trans.particleSystems.emitterNode = trans.position;
        node.particleSet.systems.forEach((p: { particleTextureMap: any }, i: number) => {
            if (p.particleTextureMap) {
                assetsManager.getTexture(p.particleTextureMap).then((texture) => {
                    trans.particleSystems.systems[i].particleTexture = texture;
                });
            }
        });
    }
}