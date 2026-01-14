import { CC } from '@/3d/assets/BaseRes';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { deserializeNode, serializeNode } from '@/3d/assets/serialze/node/Node';
import { Editor } from '@/3d/Editor';
import { useScene } from '@/store/useScene';
import { ArrayUtils } from '@/utils/Array';
import { Node, TransformNode } from '@babylonjs/core';

/**
 * BJS和Hierarchy中Node的增删改查
 */
export function nodeCRUD() {
  // 拷贝节点采用序列化BJS.Node的方式，这样就不需要关注各个类型是否实现了clone
  /**
   * 拷贝 Node
   * @param node BJS层面的Node
   * @returns 序列化后的Node
   */
  async function copyNode(node: Node): Promise<CC.ObjectNode> {
    // 序列化该Node，
    const padding: Array<Padding> = [];
    const serializedNode = serializeNode(node as any, RuntimeLibrary.Instance, padding);
    if (padding.length > 0) {
      const groupPadding = ArrayUtils.groupArray(padding, 20);
      for (let index = 0; index < groupPadding.length; index++) {
        await Promise.all(groupPadding[index].map((f) => f()));
      }
    }
    return serializedNode;
  }

  /**
   * 粘贴生成新节点（非引用）
   * @param serializedNode 序列化后的主Node
   * @param parentNode 新生成的Node的parent
   * @param progressCallback 反序列化进度
   * @returns 反序列化后生成的BJS.Node对象
   */
  async function pasteNode(
    serializedNode: CC.ObjectNode,
    parentNode: Node | null,
    progressCallback?: (percent: number) => void,
  ): Promise<Node> {
    const scene = Editor.Instance.Scene;
    const padding: Array<Padding> = [];

    // bjs层面拷贝
    const clonedNode = deserializeNode(
      serializedNode,
      scene,
      RuntimeLibrary.Instance,
      parentNode,
      true,
      padding,
    );

    if (padding.length > 0) {
      const groupPadding = ArrayUtils.groupArray(padding, 20);
      for (let index = 0; index < groupPadding.length; index++) {
        await Promise.all(groupPadding[index].map((f) => f()));
        progressCallback?.((index + 1) / groupPadding.length);
      }
    }

    if (!clonedNode.name.toLocaleLowerCase().endsWith('(clone)')) {
      clonedNode.name = clonedNode.name + '(clone)';
    }
    // hierarchy层面添加
    useScene().addHierarchy(clonedNode, parentNode || null);
    return clonedNode;
  }

  /**
   * 在BJS和Hierarchy中删除该Node
   */
  function deleteNode(node: Node) {
    // 1.在层级面板删除
    useScene().removeHierarchy(node);
    // 2.在bjs中删除该Node
    Editor.Instance.Scene.getNodes()
      .find((x) => x.uuid == node.uuid)
      ?.dispose();
  }

  /**
   * 更新 Node 的新层级
   */
  function updateNodeHierarchy(
    node: Node,
    newParent: Node | null,
    type: 'before' | 'after' | 'inner',
  ) {
    const nodeNewParent = ['before', 'after'].includes(type) ? newParent.parent : newParent;
    if(node instanceof TransformNode){
      node.setParent(nodeNewParent);
    }
    else {
      node.parent = nodeNewParent;
    }
    // 由于 ElTree的源数据是BJS结构树的映射，而不是结构树本身，所以还是需要手动修改BJS结构树来改变顺序
    // 保证下次进来的顺序和 ElTree 一样
    // @ts-ignore
    const children = nodeNewParent ? nodeNewParent._children : Editor.Instance.Scene.rootNodes;
    switchNodePosInParent(node, newParent, type, children);
  }

  function switchNodePosInParent(from: Node, to: Node, type: 'before' | 'after' | 'inner', children: Node[]) {
    // inner 不需要改变顺序
    if(type === 'inner') return;

    // 遍历一次找到from和to的下标
    let fromIndex, toIndex;
    for(let i=0; i<children.length; i++) {
      if(children[i].uuid == from.uuid)
        fromIndex = i;
      else if(children[i].uuid == to.uuid)
        toIndex = i;
    }

    // 从数组中删除from
    const item = children.splice(fromIndex, 1)[0];
    // 从后往前插入
    if(fromIndex > toIndex && type === 'after') {
      toIndex += 1;
    }
    // 从前往后插入
    else if(fromIndex < toIndex && type === 'before') {
      toIndex -= 1;
    }
    // 插入元素
    children.splice(toIndex, 0, item);
  }

  return {
    copyNode,
    pasteNode,
    deleteNode,
    updateNodeHierarchy,
  };
}
