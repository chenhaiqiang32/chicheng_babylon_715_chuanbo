import {
  AssetContainer,
  AssetsManager,
  Geometry,
  ImportMeshAsync,
  ISceneLoaderAsyncResult,
  Material,
  Scene,
  Texture,
} from '@babylonjs/core';
import { Editor } from '../Editor';
import { Dispatch } from '@/utils/dispatch';
interface RuntimeAssetsEventBus {
  onChanged: () => void;
}

export interface ResContainer extends ISceneLoaderAsyncResult {
  uuid: string;
  name: string;
  createTime: string;
}

export class RuntimeAssets extends Dispatch<RuntimeAssetsEventBus> {
  getAsset(target: string) {
    return this.sceneAssets.find((asset) => asset.uuid === target);
  }
  private static instance: RuntimeAssets;

  static get Instance() {
    if (!RuntimeAssets.instance) {
      RuntimeAssets.instance = new RuntimeAssets();
    }
    return this.instance;
  }

  public sceneAssets: ResContainer[];

  constructor() {
    super();
    this.sceneAssets = [];
  }

  async importMesh(file: File) {
    const data = await ImportMeshAsync(file, Editor.Instance.Scene);
    this.dispatch('onChanged');
  }

  generateName(baseName: string) {
    const names = this.sceneAssets.map((asset) => asset.name);
    if (!names.includes(baseName)) {
      return baseName;
    }
    let i = 1;
    while (names.includes(`${baseName} (${i})`)) {
      i++;
    }
    return `${baseName} (${i})`;
  }
}
