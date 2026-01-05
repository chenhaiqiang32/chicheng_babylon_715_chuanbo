import { CC } from "@/3d/assets/BaseRes";
import { RuntimeLibrary } from "@/3d/assets/RuntimeLibrary";
import { deserializeNode, serializeNode } from "@/3d/assets/serialze/node/Node";
import { Editor } from "@/3d/Editor";
import { useScene } from "@/store/useScene"
import { ArrayUtils } from "@/utils/Array";
import { Node } from "@babylonjs/core"

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
        const serializedNode = await serializeNode(
            node as any,
            RuntimeLibrary.Instance,
            false
        );
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
        progressCallback?: (percent: number) => void
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
            padding
        );

        if(padding.length > 0) {
            const groupPadding = ArrayUtils.groupArray(padding, 20);
            for(let index = 0; index < groupPadding.length; index++) {
                await Promise.all(groupPadding[index].map((f) => f()));
                progressCallback?.((index + 1) / groupPadding.length);
            }
        }

        if(!clonedNode.name.toLocaleLowerCase().endsWith('(clone)')) {
            clonedNode.name = clonedNode.name + '(clone)';
        }
        // hierarchy层面添加
        useScene().addHierarchy(clonedNode, parentNode || null);
        return clonedNode;
    }

    /**
     * 在BJS和Hierarchy中删除该Node
     */
    function deleteNode(node:Node){
        // 1.在层级面板删除
        useScene().removeHierarchy(node);
        // 2.在bjs中删除该Node
        Editor.Instance.Scene.getNodes().find((x) =>x.uuid == node.uuid)?.dispose();
    }

    /**
     * 更新 Node 的新层级
     */
    function updateNodeHierarchy(node:Node, newParent:Node | null, type:"before" | "after" | "inner") {
        if(type == 'before') {
            // @ts-ignore
            node.setParent(newParent.parent);
        } else if(type == 'after') {
            // @ts-ignore
            node.setParent(newParent.parent);
        } else if(type == 'inner') {
            // inner 不需要考虑顺序
            // @ts-ignore
            node.setParent(newParent);
        }
    }

    
    return {
        copyNode,
        pasteNode,
        deleteNode,
        updateNodeHierarchy,
    }
}
