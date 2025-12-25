import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { loadSkyboxWithExt } from '@/3d/core/utils/EnvFileHelper';
import {
  AbstractEngine,
  BackgroundMaterial,
  BaseTexture,
  Color3,
  Color4,
  CubeTexture,
  DirectionalLight,
  EXRCubeTexture,
  FreeCamera,
  HDRCubeTexture,
  HemisphericLight,
  Material,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  Texture,
  Tools,
  Vector3,
} from '@babylonjs/core';

let scene: Scene;
let camera: FreeCamera;
let sphere: Mesh;
let plane: Mesh;
const size = 128;
let cache: Map<string, string> = new Map();
let envCache: Map<string, string> = new Map();


function initScene(engine: AbstractEngine) {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  camera = new FreeCamera('MaterialPreviewCamera', new Vector3(0, 0, -2), scene);
  scene.activeCamera = camera;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;

  const dir = new DirectionalLight('dir', new Vector3(-1, -2, -1), scene);
  dir.position = new Vector3(2, 4, 2);
  dir.intensity = 0.8;
  sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1, segments: 32 }, scene);
  plane = MeshBuilder.CreatePlane('plane', {width:2, height: 1});
  scene.createDefaultEnvironment();
}

export function renderMaterail(material: Material, useCache = true, engine: AbstractEngine) {
  // 默认使用缓存
  if (useCache) {
    const url = cache.get(material.uuid);
    if (url) {
      return url;
    }
  }
  if (!scene) {
    initScene(engine);
  }

  sphere.isVisible = true;
  plane.isVisible = false;
  const mat = material.clone(material.name + 'preview');
  //@ts-ignore
  mat._scene = scene;
  sphere.material = mat;

  return new Promise((resolve) => {
    Tools.CreateScreenshotUsingRenderTarget(
      engine,
      camera,
      size,
      (data) => {
        mat.dispose();
        cache.set(material.uuid, data);
        resolve(data);
      },
      'image/png',
    );
  });
}

export async function renderEnvTexture(uuid:string, url: string, ext:string, useCache = true, engine: AbstractEngine) {
    if (useCache) {
        const url = envCache.get(uuid);
        if (url) 
          return url;
    }
    if (!scene) {
      initScene(engine);
    }

    sphere.isVisible = false;
    plane.isVisible = true;
    // 环境贴图不能直接作用于材质，要先将其转换为对应的CubeTexture才能使用
    // todo:由于要加载，所以会导致加载性能下降
    const env = await loadSkyboxWithExt(scene, url,ext, 128);

    const mat = new StandardMaterial("envMat", scene);
    mat.reflectionTexture = env;
    plane.material = mat;

    return new Promise((resolve) => {
        plane.material = mat;
          Tools.CreateScreenshotUsingRenderTarget(
              engine,
              camera,
              size,
              (data) => {
                plane.material = null;
                envCache.set(uuid, data);
                resolve(data);
              },
              'image/png',
            );
    })
}