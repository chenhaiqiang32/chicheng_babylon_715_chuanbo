import { Node, TransformNode } from '@babylonjs/core';
import { Editor } from '@/3d/Editor';
import { ID } from '@/utils/id';
import { ref, toRaw } from 'vue';

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
  
  // 递归构建子节点，过滤掉标记为 isIgnore 的节点（如 CollisionMesh）
  const children = node.getChildren()
    ?.filter(child => !(child as any).isIgnore)
    .map(buildHierarchy) ?? [];
  
  return {
    name: node.name,
    type: node.getClassName(),
    id: node.uuid,
    children: children,
    isActive: isActive,
  };
}

export function useHierarchyModule() {
  const hierarchy = ref<HierarchyNode[]>([]);

  function setHierarchy(rootNodes: Node[]) {
    hierarchy.value = rootNodes.map(buildHierarchy);
    rootNodes.forEach((x) => {
      if (x.name == 'SubemitterSystemEmitter') {
        x.isIgnore = true;
      }
    });
    hierarchy.value = rootNodes.filter((node) => !node.isIgnore).map(buildHierarchy);
  }

  function addHierarchy(node: Node, parent: Node | null) {
    const newNode = buildHierarchy(node);
    // 由于 Node 没有 parent 属性，所以只能通过找 parent 然后设置 childrent lai实现层级关系
    if (parent) {
      const parentNode = Editor.Instance.getNodeById(parent.uuid);
      if (parentNode) {
        // 需要双向绑定
        node.parent = parent;
        parentNode._children?.push(node);
      } else {
        hierarchy.value.push(newNode);
      }
    } else {
      hierarchy.value.push(newNode);
    }
  }

  function removeHierarchy(node: Node) {
    const parent = node.parent;
    // 解除父子关系
    if (parent) {
      const parentNode = Editor.Instance.getNodeById(parent.uuid);
      if (parentNode) {
        node.parent = null;
        parentNode._children = parentNode._children?.filter((x) => x.id != node.uuid);
      }
    }
    // 删除节点
    hierarchy.value = hierarchy.value.filter((x) => x.id != node.uuid);
  }


  return {
    // state
    hierarchy,

    // function
    setHierarchy,
    addHierarchy,
    removeHierarchy,
  };
}
