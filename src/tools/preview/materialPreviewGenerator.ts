import {
  AbstractEngine,
  Color4,
  CubeTexture,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  Material,
  Mesh,
  MeshBuilder,
  RenderTargetTexture,
  Scene,
  ScreenshotTools,
  StandardMaterial,
  Tools,
  Vector3,
} from '@babylonjs/core';

let scene: Scene;
let camera: FreeCamera;
let sphere: Mesh;
const size = 128;
let cache: Map<string, string> = new Map();
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
