import { Node } from '@babylonjs/core';
import { Editor } from '@/3d/Editor';
import { ID } from '@/utils/id';
import { ref, toRef } from 'vue';

function buildHierarchy(node: Node): HierarchyNode {
  // 过滤掉
  if (node.isIgnore || node.isDeleted) {
    return null;
  }
  if (!node.uuid) {
    node.uuid = ID.generateUUID();
  }

  // todo:根据不同类型设置 isActive 字段
  var isActive = true;
  // 如果是摄像机，判断是否为 scene.activeCamera，如果是则=true
  if (node.getClassName() === 'ArcRotateCamera' || node.getClassName() === 'UniversalCamera') {
    isActive = Editor.Instance.Scene.activeCamera.uuid === node.uuid;
  }

  // 递归构建子节点，过滤掉标记为 isIgnore 的节点（如 CollisionMesh）
  const children =
    node
      .getChildren()
      ?.filter((child) => !(child as any).isIgnore)
      .map(buildHierarchy) ?? [];

  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uuid,
    children:
      node
        .getChildren()
        ?.map(buildHierarchy)
        .filter((x) => x != null) ?? [], // 如果是null则不加到数组里面
    isActive: isActive,
    isLeaf: node.getChildren()?.length == 0,
  };
}

export function useHierarchyModule() {
  const hierarchy = ref<HierarchyNode[]>([]);

  // uuid -> HierarchyNode
  const hierarchyMap: Map<string, HierarchyNode> = new Map();

  // 递归构建映射
  function buildMap(nodes: HierarchyNode[]) {
    for (const node of nodes) {
      hierarchyMap.set(node.id, node);
      if (node.children) {
        buildMap(node.children);
      }
    }
  }

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy).filter((x) => x != null);
    rootNodes.forEach((x) => {
      if (x.name == 'SubemitterSystemEmitter') {
        x.isIgnore = true;
      }
    });
    hierarchyMap.clear();
    buildMap(hierarchy.value);
  }

  function updateHierarchy(parentNode: Node) {
    if (parentNode) {
      let hNode = hierarchyMap.get(parentNode.uuid);
      const newhNode = buildHierarchy(parentNode);
      // 直接赋值会导致hierarchy引用断开
      hNode.children = newhNode?.children;
    } else {
      // 根节点
      setHierarchy(Editor.Instance.Scene.rootNodes);
    }
  }

  function addHierarchy(node: Node, parent: Node | null) {
    const newNode = buildHierarchy(node);
    // 由于 Node 没有 parent 属性，所以只能通过找 parent 然后设置 childrent lai实现层级关系
    if (parent) {
      const parentNode = hierarchyMap.get(parent.uuid);
      if (parentNode) {
        // 需要双向绑定
        node.parent = parent;
        const refNode = toRef(parentNode);
        refNode.value.children?.push(newNode);
      } else {
        hierarchy.value.push(newNode);
        hierarchyMap.set(node.uuid, newNode);
      }
    } else {
      hierarchy.value.push(newNode);
      hierarchyMap.set(node.uuid, newNode);
    }
  }

  return {
    // state
    hierarchy,

    // function
    setHierarchy,
    updateHierarchy,
    addHierarchy,
  };
}
