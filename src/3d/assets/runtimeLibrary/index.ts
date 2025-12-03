import { ImportMeshAsync, InternalTexture, Texture, Tools } from '@babylonjs/core';
import { Editor } from '../../Editor';
import { Dispatch } from '@/utils/dispatch';
import { serializeNode } from '../serialze/node/Node';
import { CC } from '../BaseRes';
import { ZipFile } from '@/utils/Zip';
import { Assets } from './Assets';
import { IFile } from '../file/IFile';

interface RuntimeAssetsEventBus {
  onChanged: () => void;
}

export class RuntimeLibrary extends Dispatch<RuntimeAssetsEventBus> {
  getAsset(target: string) {
    return this.sceneAssets.find((asset) => asset.uuid === target);
  }
  private sceneList: CC.Scene[] = [];
  private static instance: RuntimeLibrary;
  static get Instance() {
    if (!RuntimeLibrary.instance) {
      RuntimeLibrary.instance = new RuntimeLibrary();
    }
    return this.instance;
  }

  public sceneAssets: Assets[];

  constructor() {
    super();
    Texture.UseSerializedUrlIfAny = true;
    Texture.SerializeBuffers = false;
    Texture.ForceSerializeBuffers = false;
    this.sceneAssets = [];
  }

  async importMesh(file: File) {
    const scene = Editor.Instance.newResScene();
    const data = await ImportMeshAsync(file, scene, {});
    const assets = new Assets();
    const all = [...data.meshes, ...data.transformNodes];
    const root = all.find((x) => x.name == '__root__');
    root.name = file.name.split('.')[0];
    assets.rootNode = serializeNode(root, assets, true);
    this.sceneAssets.push(assets);
    return assets;
  }

  async loadAssets(fileSystem: IFile) {
    const assetsJson = await fileSystem.getFileText('assets.json');
    if (assetsJson) {
      const assetsData = JSON.parse(assetsJson);
      for (let index = 0; index < assetsData.length; index++) {
        const element = assetsData[index];
        const assets = await Assets.create(element, fileSystem);
        this.sceneAssets.push(assets);
      }
    }
    const sceneJson = await fileSystem.getFileText('scene.json');
    if (sceneJson) {
      this.sceneList = JSON.parse(sceneJson) as CC.Scene[];
      this.sceneList = this.sceneList.filter((x) => x);
    }
    return this.sceneList;
  }

  async saveAll() {
    const files: ZipFile[] = [];
    const asssetsData: any[] = [];
    for (let index = 0; index < this.sceneAssets.length; index++) {
      const assets = this.sceneAssets[index];
      const { data, geoFiles, textureFile } = await assets.exportFile();
      if (geoFiles) {
        geoFiles.forEach((x) => files.push([assets.uuid + '/' + x[0], x[1]]));
      }
      if (textureFile) {
        textureFile.forEach((x) => files.push([assets.uuid + '/' + x[0], x[1]]));
      }
      asssetsData.push(data);
    }
    files.push(['assets.json', JSON.stringify(asssetsData)]);
    return files;
  }
}

export async function serializeTextureBuffer(buffer: InternalTexture['_buffer']) {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  } else if (typeof buffer === 'string') {
    return new TextEncoder().encode(buffer);
  } else if (buffer instanceof Blob) {
    return buffer;
  } else if (buffer instanceof ImageBitmap || buffer instanceof HTMLImageElement) {
    return await imgToBlob(buffer);
  } else {
    return buffer;
  }
}

function imgToBlob(img: HTMLImageElement | ImageBitmap) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      resolve(blob);
    });
  });
}
