import { BaseTexture, Material } from '@babylonjs/core';
import { Geometry } from '@babylonjs/core/Meshes';
import { ICollectAssets } from '../AssetsManager';
import { Assets } from './Assets';

export class MultiCollectAssets implements ICollectAssets {
  constructor(private assets: Assets[]) {
    assets.forEach((x) => (x.saveTexture = async (texture) => this.addTexture(texture)));
  }
  addTexture(texture: BaseTexture): void {
    const assets = this.assets.find((x) => x.hasTexture(texture.uuid));
    if (assets) {
      assets.addTexture(texture, true);
    }
  }
  addMaterial(material: Material): void {
    const assets = this.assets.find((x) => x.hasMaterial(material.uuid));
    if (assets) {
      assets.addMaterial(material, true);
    }
  }
  addGeometry(geometry: Geometry): void {}
}
