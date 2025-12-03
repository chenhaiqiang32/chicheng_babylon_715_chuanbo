import { Material, BaseTexture } from '@babylonjs/core';
import { Geometry } from '@babylonjs/core/Meshes';
import { ILoaderAssets } from '../AssetsManager';
import { Assets } from './Assets';

export class MultiLoaderAssets implements ILoaderAssets {
  constructor(private assets: Assets[]) {
    assets.forEach((x) => (x.fineTexture = async (uuid) => this.getTexture(uuid)));
  }

  async getGeometry(uuid: string): Promise<Geometry> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const geo = await element.getGeometry(uuid);
      if (geo) {
        return Promise.resolve(geo);
      }
    }
    return Promise.reject('Geometry not found');
  }
  async getMaterial(uuid: string): Promise<Material> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const mat = await element.getMaterial(uuid);
      if (mat) {
        return Promise.resolve(mat);
      }
    }
    return Promise.reject('Material not found');
  }
  async getTexture(uuid: string): Promise<BaseTexture> {
    for (let index = 0; index < this.assets.length; index++) {
      const element = this.assets[index];
      const tex = await element.getTexture(uuid);
      if (tex) {
        return Promise.resolve(tex);
      }
    }
    return Promise.reject('Texture not found');
  }
}
