import { TransformNode, Mesh, Camera, Light, Scene, Node } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { deserializeMeshNode, serializeMeshNode } from './Mesh';
import { deserializeCamera, serializeCamera } from './Camera';
import { deserializeTransformNode, serializeTransformNode } from './Transform';
import { deserializeLight, serializeLight } from './Light';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';

export function serializeNode(
  node: TransformNode,
  assets: ICollectAssets,
  serializeAssets: boolean,
): CC.ObjectNode {
  try {
    const reuslt: Partial<CC.ObjectNode> = {
      id: node.uniqueId,
      name: node.name,
      children: node
        .getChildren()
        ?.map((item) => serializeNode(item as TransformNode, assets, serializeAssets)),
    };
    if (node instanceof Mesh) {
      serializeMeshNode(node, reuslt as CC.MeshNode, assets, serializeAssets);
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
    reuslt.visible = node.isVisible;
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
  clone?: boolean,
  padding: Array<Promise<any>> = [],
) {
  let currentNode: Node;
  if (node.type === 'mesh') {
    currentNode = await deserializeMeshNode(node as CC.MeshNode, scene, assets, padding);
  } else if (node.type === 'camera') {
    currentNode = deserializeCamera(node as CC.CameraNode, scene, assets);
  } else if (node.type === 'light') {
    currentNode = deserializeLight(node as CC.LightNode, scene, assets);
  } else {
    currentNode = new TransformNode(node.name, scene);
  }
  if (!clone) {
    currentNode.uniqueId = node.id;
  }
  if (parent) {
    currentNode.parent = parent;
  }
  if (currentNode instanceof TransformNode) {
    deserializeTransformNode(node as CC.TransformNode, currentNode as TransformNode);
  }
  currentNode.inheritVisibility = true;
  currentNode.isVisible = node.visible;
  for (let index = 0; index < node.children.length; index++) {
    const element = node.children[index];
    await deserializeNode(element, scene, assets, currentNode, clone, padding);
  }
}
