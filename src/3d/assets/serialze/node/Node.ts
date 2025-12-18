import { TransformNode, Mesh, Camera, Light, Scene, Node } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { deserializeMeshNode, serializeMeshNode } from './Mesh';
import { deserializeCamera, serializeCamera } from './Camera';
import { deserializeTransformNode, serializeTransformNode } from './Transform';
import { deserializeLight, serializeLight } from './Light';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';
import { ID } from '@/utils/id';

export function serializeNode(
  node: TransformNode,
  assets: ICollectAssets,
  serializeAssets: boolean,
): CC.ObjectNode {
  try {
    if (!node.uuid) {
      node.uuid = ID.generateUUID();
    }
    const reuslt: Partial<CC.ObjectNode> = {
      uuid: node.uuid,
      name: node.name,
      visible: node.isVisible,
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
    currentNode.uuid = node.uuid;
  } else {
    currentNode.uuid = ID.generateUUID();
  }
  if (parent) {
    currentNode.parent = parent;
  }
  if (currentNode instanceof TransformNode) {
    deserializeTransformNode(node as CC.TransformNode, currentNode as TransformNode);
  }
  currentNode.inheritVisibility = true;
  currentNode.isVisible = node.visible;
  if (node.type === 'light') {
    currentNode.isVisible = false;
  }
  for (let index = 0; index < node.children.length; index++) {
    const element = node.children[index];
    await deserializeNode(element, scene, assets, currentNode, clone, padding);
  }
  return currentNode;
}
