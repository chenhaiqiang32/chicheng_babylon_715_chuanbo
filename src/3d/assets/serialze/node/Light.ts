import { CascadedShadowGenerator, Light, Scene, ShadowGenerator } from '@babylonjs/core';
import { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';
import { Editor } from '@/3d/Editor';
import { isCascadedShadowGenerator } from '@/tools/light/shadows';

export function serializeLight(light: Light, node: CC.LightNode, assetsManager: ICollectAssets) {
  node.type = 'light';
  node.data = light.serialize();
  const shadowGenerator = light.getShadowGenerator();
  if (shadowGenerator) {
    node.shadowGenerator = shadowGenerator.serialize();
    node.isShadowGenerator = !isCascadedShadowGenerator(shadowGenerator);
    console.log(node.isShadowGenerator);
  }
}

export function deserializeLight(node: CC.LightNode, scene: Scene, assetsManager: ILoaderAssets) {
  const light = Light.Parse(node.data, scene);
  
  if (node.shadowGenerator) {
    const generator = node.isShadowGenerator
      ? ShadowGenerator.Parse(node.shadowGenerator, scene)
      : CascadedShadowGenerator.Parse(node.shadowGenerator, scene);
    Editor.Instance.shadow.addShadowGeneratorMap(node.uuid, generator);
  }
  
  return light;
}


