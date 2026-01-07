import { TransformNode, Mesh, Camera, Light, Scene, Node } from '@babylonjs/core';
import type { CC } from '../../BaseRes';
import { deserializeMeshNode, serializeMeshNode } from './Mesh';
import { deserializeCamera, serializeCamera } from './Camera';
import { deserializeTransformNode, serializeTransformNode } from './Transform';
import { deserializeLight, serializeLight } from './Light';
import { ICollectAssets, ILoaderAssets } from '../../AssetsManager';
import { ID } from '@/utils/id';
import { ParticleContainer } from '@/3d/core/Extension/ParticleContainer';
import { deserializeParticleNode, serializeParticleNode } from './ParticleContainer';

export function serializeNode(
  node: TransformNode,
  assets: ICollectAssets,
  padding: Array<Padding> = [],
): CC.ObjectNode {
  try {
    if (!node.uuid) {
      node.uuid = ID.generateUUID();
    }
    const reuslt: Partial<CC.ObjectNode> = {
      uuid: node.uuid,
      name: node.name,
      visible: node.isVisible,
      children: [],
      isIgnore: node.isIgnore,
    };
    if (node instanceof Mesh) {
      serializeMeshNode(node, reuslt as CC.MeshNode, assets, padding);
    } else if (node instanceof Camera) {
      serializeCamera(node, reuslt as CC.CameraNode, assets);
    } else if (node instanceof Light) {
      serializeLight(node, reuslt as CC.LightNode, assets);
    } else {
      reuslt.type = 'object';
    }
    if (node instanceof TransformNode) {
      serializeTransformNode(node, reuslt as CC.TransformNode, assets);
    }
    if (node instanceof ParticleContainer) {
      await serializeParticleNode(node, reuslt as CC.ParticleContainer, assets);
    }
    if (node.metadata) {
      reuslt.metadata = node.metadata;
    }

    const children = node.getChildren();

    for (let index = 0; index < children.length; index++) {
      const element = children[index];
      const node = serializeNode(element as TransformNode, assets, padding);
      reuslt.children.push(node);
    }

    return reuslt as CC.ObjectNode;
  } catch (error) {
    console.error('序列化节点时出错:', error);
    return {} as CC.ObjectNode;
  }
}

export function deserializeNode(
  node: CC.ObjectNode,
  scene: Scene,
  assets: ILoaderAssets,
  parent?: Node,
  clone?: boolean,
  padding: Array<Padding> = [],
) {
  let currentNode: Node;
  if (node.type === 'mesh') {
    currentNode = deserializeMeshNode(node as CC.MeshNode, scene, assets, padding);
  } else if (node.type === 'camera') {
    currentNode = deserializeCamera(node as CC.CameraNode, scene, assets);
  } else if (node.type === 'light') {
    currentNode = deserializeLight(node as CC.LightNode, scene, assets);
  } else if (node.type === 'particle') {

    currentNode = new ParticleContainer(node.name, scene);
  }
  else {
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
    deserializeTransformNode(node as CC.TransformNode, currentNode as TransformNode, assets);
  }
  if (currentNode instanceof ParticleContainer) {
    deserializeParticleNode(node as CC.ParticleContainer, currentNode as ParticleContainer, assets);
  }
  currentNode.inheritVisibility = true;
  currentNode.isVisible = node.visible;
  currentNode.isIgnore = node.isIgnore;
  if (node.metadata) {
    currentNode.metadata = node.metadata;
  }
  for (let index = 0; index < node.children.length; index++) {
    const element = node.children[index];
    deserializeNode(element, scene, assets, currentNode, clone, padding);
  }
  return currentNode;
}
