import { Quaternion, type TransformNode } from '@babylonjs/core';
import type { CC } from '../../BaseRes';

export function serializeTransformNode(
  trans: TransformNode,
  node: CC.TransformNode,
): Partial<CC.TransformNode> {
  try {
    node.position = trans.position.asArray();
    node.rotation = trans.rotation.asArray();
    node.scale = trans.scaling?.asArray();
    return node;
  } catch (error) {
    console.error('序列化变换节点时出错:', node);
    return {};
  }
}
export function deserializeTransformNode(node: CC.TransformNode, trans: TransformNode) {
  trans.position.set(node.position[0], node.position[1], node.position[2]);
  trans.rotation.set(node.rotation[0], node.rotation[1], node.rotation[2]);
  trans.scaling.set(node.scale[0], node.scale[1], node.scale[2]);
}
