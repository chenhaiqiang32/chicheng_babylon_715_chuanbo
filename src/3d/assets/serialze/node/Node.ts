import { TransformNode, Mesh, Camera, Light, Scene, Node } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { deserializeMeshNode, serializeMeshNode } from './Mesh';
import { deserializeCamera, serializeCamera } from './Camera';
import { deserializeTransformNode, serializeTransformNode } from './Transform';
import { deserializeLight, serializeLight } from './Light';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';

export function serializeNode(node: TransformNode, assets: ICollectAssets): CC.ObjectNode {
  try {
    const reuslt: Partial<CC.ObjectNode> = {
      id: node.uniqueId,
      name: node.name,
      children: node.getChildren()?.map((item) => serializeNode(item as TransformNode, assets)),
    };
    if (node instanceof Mesh) {
      serializeMeshNode(node, reuslt as CC.MeshNode, assets);
    } else if (node instanceof Camera) {
      serializeCamera(node, reuslt as CC.CameraNode, assets);
    } else if (node instanceof Light) {
      serializeLight(node, reuslt as CC.LightNode, assets);
    } else {
      reuslt.type = 'object';
    }
    if (node instanceof TransformNode) {
      serializeTransformNode(node, reuslt as CC.TransformNode);
    }
    return reuslt as CC.ObjectNode;
  } catch (error) {
    console.error('序列化节点时出错:', error);
    return {} as CC.ObjectNode;
  }
}

export async function deserializeNode(
  node: CC.ObjectNode,
  scene: Scene,
  assets: ILoaderAssets,
  parent?: Node,
) {
  let currentNode: Node;
  if (node.type === 'mesh') {
    currentNode = await deserializeMeshNode(node as CC.MeshNode, scene, assets);
    deserializeTransformNode(node as CC.TransformNode, currentNode as TransformNode);
  } else if (node.type === 'camera') {
    currentNode = deserializeCamera(node as CC.CameraNode, scene, assets);
  } else if (node.type === 'light') {
    currentNode = deserializeLight(node as CC.LightNode, scene, assets);
  } else {
    currentNode = new TransformNode(node.name, scene);
    deserializeTransformNode(node as CC.TransformNode, currentNode as TransformNode);
  }
  currentNode.uniqueId = node.id;
  if (parent) {
    currentNode.parent = parent;
  }
  node.children?.forEach((item) => deserializeNode(item, scene, assets, currentNode));
}
