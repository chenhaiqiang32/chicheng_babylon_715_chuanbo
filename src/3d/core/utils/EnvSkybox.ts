import { Editor } from '@/3d/Editor';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { Utils } from '@/utils';
import {
  BaseTexture,
  CreateBox,
  CubeTexture,
  EXRCubeTexture,
  HDRCubeTexture,
  Layer,
  Mesh,
  Node,
  Nullable,
  PBRMaterial,
  PhotoDome,
  Scene,
  StandardMaterial,
  Texture,
  Vector2,
} from '@babylonjs/core';

let hdrSkybox: Mesh;
let bgImageLayer: Layer;
let dome: PhotoDome;

/**
 * 将环境贴图导入为贴图资产
 */
export async function importSkyboxTexture() {
  const scene = Editor.Instance.Scene;
  const fileList = await Utils.chooseFile('.hdr,.exr,.env', true);
  for (let i = 0; i < fileList.length; i++) {
    await RuntimeLibrary.Instance.addEnvTexture(fileList[0]);
  }
}

/**
 * 将环境贴图应用到当前场景的天空盒上
 * @param name 环境贴图的名字，需要根据其后缀判断贴图类型
 */
export async function loadSkyBox(scene: Scene, texture: BaseTexture) {
  if (!texture) return;
  const skyBox = createSkybox(texture, scene);

  // 有时候虽然加载了环境图，但是scene.bgTexture没有赋值，所以构造一个，环境贴图只关心 name 和 sourceUUID
  let bgTexture = new Texture('');
  bgTexture.name = texture.name;
  bgTexture.sourceUUID = texture.sourceUUID;
  bgTexture.prevUrl = texture.prevUrl;
  scene.bgTexture = bgTexture;
}

export function loadSkyboxWithExt(
  scene: Scene,
  url: string,
  ext: string,
  size: number,
): Promise<BaseTexture> {
  switch (ext) {
    case 'hdr':
      return loadHdrSkybox(scene, url, size);

    case 'exr':
      return loadExrSkybox(scene, url, size);

    case 'env':
      return loadEnvSkybox(scene, url);
  }
}

function loadHdrSkybox(scene: Scene, url: string, size = 128): Promise<BaseTexture> {
  const hdr = new HDRCubeTexture(url, scene, size);
  return new Promise((resolve) => {
    hdr.onLoadObservable.addOnce(() => {
      resolve(hdr);
    });
  });
}

function loadExrSkybox(scene: Scene, url: string, size = 128): Promise<BaseTexture> {
  const exr = new EXRCubeTexture(url, scene, size);
  return new Promise((resolve) => {
    exr.onLoadObservable.addOnce(() => {
      resolve(exr);
    });
  });
}

function loadEnvSkybox(scene: Scene, url: string): Promise<BaseTexture> {
  const envTexture = CubeTexture.CreateFromPrefilteredData(url, scene, '.env');
  return new Promise((resolve) => {
    envTexture.onLoadObservable.addOnce(() => {
      resolve(envTexture);
    });
  });
}

/**
 * 由于bjs的 createDefaultSkybox 会改变 environmentTexture 属性，所以实现一个只创建skybox网格的
 */
function createSkybox(
  texture: BaseTexture,
  scene: Scene,
  pbr = false,
  scale = 1000,
  blur = 0,
  setGlobalEnvTexture = true,
): Nullable<Mesh> {
  /// Skybox
  closeEnv();
  hdrSkybox = CreateBox('hdrSkyBox', { size: scale }, scene);
  if (pbr) {
    const hdrSkyboxMaterial = new PBRMaterial('skyBox', scene);
    hdrSkyboxMaterial.backFaceCulling = false;
    hdrSkyboxMaterial.reflectionTexture = texture;
    if (hdrSkyboxMaterial.reflectionTexture) {
      hdrSkyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    }
    hdrSkyboxMaterial.microSurface = 1.0 - blur;
    hdrSkyboxMaterial.disableLighting = true;
    hdrSkyboxMaterial.twoSidedLighting = true;
    hdrSkybox.material = hdrSkyboxMaterial;
  } else {
    const skyboxMaterial = new StandardMaterial('skyBox', scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = texture;
    if (skyboxMaterial.reflectionTexture) {
      skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    }
    skyboxMaterial.disableLighting = true;
    hdrSkybox.material = skyboxMaterial;
  }
  hdrSkybox.isPickable = false;
  hdrSkybox.infiniteDistance = true;
  hdrSkybox.ignoreCameraMaxZ = true;
  setIgnoreForAllChildren(hdrSkybox);
  return hdrSkybox;
}

export function loadImageBG(tex: Texture, scene: Scene) {
  closeEnv();
  const bgTex = new Texture(tex.url, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);

  // 创建一个背景 layer
  bgImageLayer = new Layer('bgImage', bgTex.url, scene, true);
  scene.bgTexture = tex;
}

export function load360ImageBG(tex: string, scene: Scene) {
  closeEnv();
  dome = new PhotoDome('360ImageBG', tex, { resolution: 128, size: 1000 }, scene);
  setIgnoreForAllChildren(dome);
  dome.mesh.material.backFaceCulling = false;
  // scene.bgTexture = tex;
}

export function closeEnv() {
  if (hdrSkybox) {
    hdrSkybox.dispose();
    hdrSkybox = null;
  }
  if (bgImageLayer) {
    bgImageLayer.dispose();
    bgImageLayer = null;
  }
  if (dome) {
    dome.dispose();
    dome = null;
  }
}

// 给自身和所有子节点添加 isIgnore 属性，不在hirarchy显示
function setIgnoreForAllChildren(node: Node) {
  if (node) node.isIgnore = true;

  const children = node.getChildren();
  if (children && children.length > 0) {
    children.forEach((child) => {
      setIgnoreForAllChildren(child);
    });
  }
}
