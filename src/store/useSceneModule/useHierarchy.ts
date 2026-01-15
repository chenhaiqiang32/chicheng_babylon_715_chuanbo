import { Node } from '@babylonjs/core';
import { Editor } from '@/3d/Editor';
import { ID } from '@/utils/id';
import { ref, toRaw } from 'vue';
import { shallowRef } from 'vue';

function buildHierarchy(node: Node): HierarchyNode {
  if (!node.uuid) {
    node.uuid = ID.generateUUID();
  }

  // todo:根据不同类型设置 isActive 字段
  var isActive = true;
  // 如果是摄像机，判断是否为 scene.activeCamera，如果是则=true
  if (node.getClassName() === 'ArcRotateCamera' || node.getClassName() === 'UniversalCamera') {
    isActive = Editor.Instance.Scene.activeCamera.uuid === node.uuid;
  }
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uuid,
    children: node.getChildren()?.map(buildHierarchy) ?? [],
    isActive: isActive,
  };
}

export function useHierarchyModule() {
  const hierarchy = ref<HierarchyNode[]>([]);
  // uuid -> HeirarchyNode 映射
  const hierarchyMap = new Map<string, HierarchyNode>();
  // uuid -> BJS.Node 映射
  const nodeMap: Map<string, Node> = new Map();

  // 递归构建映射
  function buildMap(nodes: HierarchyNode[]) {
    for (const node of nodes) {
      hierarchyMap.set(node.id, node);
      if (node.children) {
        buildMap(node.children);
      }
    }
  }

  function buildBJSNodeMap(nodes: Node[]) {
    for (const node of nodes) {
      nodeMap.set(node.uuid, node);
      buildBJSNodeMap(node.getChildren());
    }
  }

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
    hierarchyMap.clear();
    nodeMap.clear();
    rootNodes.forEach((x) => {
      if (x.name == 'SubemitterSystemEmitter') {
        x.isIgnore = true;
      }
    });
    hierarchy.value = rootNodes.filter((node) => !node.isIgnore).map(buildHierarchy);
    buildMap(toRaw(hierarchy.value));
    buildBJSNodeMap(rootNodes);
  }

  function addHierarchy(node: Node, parent: Node | null) {
    const newNode = buildHierarchy(node);
    // 由于 Node 没有 parent 属性，所以只能通过找 parent 然后设置 childrent lai实现层级关系
    if (parent) {
      const parentNode = hierarchyMap.get(parent.uuid);
      //const parentNode = hierarchy.value.find((n) => n.id == parent.uuid);
      if (parentNode) {
        // 需要双向绑定
        node.parent = parent;
        parentNode.children?.push(newNode);
      } else {
        hierarchy.value.push(newNode);
      }
    } else {
      hierarchy.value.push(newNode);
    }
    hierarchyMap.set(newNode.id, newNode);
    nodeMap.set(newNode.id, node);
  }

  function removeHierarchy(node: Node) {
    const parent = node.parent;
    // 接触父子关系
    if (parent) {
      const parentNode = hierarchyMap.get(parent.uuid);
      if (parentNode) {
        node.parent = null;
        parentNode.children = parentNode.children?.filter((x) => x.id != node.uuid);
      }
    }
    // 删除节点
    hierarchy.value = hierarchy.value.filter((x) => x.id != node.uuid);
    hierarchyMap.delete(node.uuid);
  }

  /**
   * 根据传入的uuid返回BJS.Node
   */
  function getNode(nodeUuid: string): Node {
    return nodeMap.get(nodeUuid);
  }

  return {
    // state
    hierarchy,
    hierarchyMap,

    // function
    setHierarchy,
    addHierarchy,
    removeHierarchy,
    getNode,
  };
}
