import {
  AbstractMesh,
  ArcRotateCamera,
  Camera,
  Node,
  Scalar,
  Scene,
  Vector3,
} from '@babylonjs/core';

/** 摄像机聚焦到 Node  */
export function focusOnNode(
  camera: Camera,
  node: Node,
  scene: Scene,
  defaultRadius: number = 2,
  duration: number = 0.3,
) {
  if (node == null) return;
  const position = getNodeWorldPosition(node);
  const radius = getNodeRadius(node, defaultRadius);
  if (camera instanceof ArcRotateCamera) {
    focusArcRotateCamera(camera, scene, position, radius, duration);
    return;
  }
}

function getNodeWorldPosition(node: Node): Vector3 {
  // 如果 node 有 mesh，直接返回包围盒中心点
  if (node instanceof AbstractMesh) {
    return node.getBoundingInfo().boundingSphere.centerWorld.clone();
  }

  const transform = node;

  if (transform.getWorldMatrix) {
    const m = transform.getWorldMatrix();
    return new Vector3(m.m[12], m.m[13], m.m[14]);
  }

  console.error("Can't find focus object center, focus on zero");
  return Vector3.Zero();
}

function getNodeRadius(node: Node, defaultValue: number): number {
  if (node instanceof AbstractMesh) {
    return node.getBoundingInfo().boundingSphere.radiusWorld;
  }
  return defaultValue;
}

function focusArcRotateCamera(
  cam: ArcRotateCamera,
  scene: Scene,
  target: Vector3,
  radius: number,
  duration: number,
) {
  const startTarget = cam.target.clone();
  const startRadius = cam.radius;
  const endTarget = target.clone();
  const endRadius = radius * 2.2;

  animate(scene, duration, (t) => {
    cam.target = Vector3.Lerp(startTarget, endTarget, t);
    cam.radius = Scalar.Lerp(startRadius, endRadius, t);
  });
}

/** 摄像机聚焦过渡动画 */
function animate(scene: Scene, duration: number, update: (t: number) => void) {
  let time = 0;

  const anim = scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() / 1000;
    const t = Math.min(time / duration, 1);

    update(t);
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(anim);
    }
  });
}
