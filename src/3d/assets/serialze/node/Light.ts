import { CascadedShadowGenerator, Light, Scene, ShadowGenerator } from '@babylonjs/core';
import { CC } from '../../BaseRes';
import { ILoaderAssets, ICollectAssets } from '../../AssetsManager';
import { Editor } from '@/3d/Editor';
import { isCascadedShadowGenerator } from '@/tools/light/shadows';

export function serializeLight(light: Light, node: CC.LightNode, assetsManager: ICollectAssets) {
  node.type = 'light';
  node.data = light.serialize();
  console.log(111);
  
  if (light.getShadowGenerator()) {
    node.shadowGenerator = light.getShadowGenerator().serialize();
    node.isShadowGenerator = !isCascadedShadowGenerator(light.getShadowGenerator());
    console.log(node.isShadowGenerator);
  }



}

export function deserializeLight(node: CC.LightNode, scene: Scene, assetsManager: ILoaderAssets) {
  console.log(222);
  const light = Light.Parse(node.data, scene);
  if (node.shadowGenerator) {
  if (node.isShadowGenerator) {
    Editor.Instance.shadow.addShadowGeneratorMap(node.uuid, ShadowGenerator.Parse(node.shadowGenerator, scene));
  } else  {
    Editor.Instance.shadow.addShadowGeneratorMap(node.uuid, CascadedShadowGenerator.Parse(node.shadowGenerator, scene));
  }
}
  return light;
}


