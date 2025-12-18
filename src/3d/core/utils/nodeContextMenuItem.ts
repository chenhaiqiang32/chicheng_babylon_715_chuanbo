import { Editor } from "@/3d/Editor";
import { useScene } from "@/store/useScene";
import { MeshBuilder, Node, Quaternion, TransformNode } from "@babylonjs/core";
import { nextTick } from "vue";

/**
 * 获取层级面板的右键菜单配置
 */
export function getHierarchyContextMenuCommands(parentNode?: Node | null): ContextMenuItem[] {
  return [
    {
      name: '添加场景',
      callback: () => {
        console.log('添加场景');
      },
    },
    {
      name: '添加节点',
      callback: () => {
        const node = new TransformNode("empty", Editor.Instance.Scene);
        node.rotationQuaternion = new Quaternion(0,0,0);
        useScene().addHierarchy(node, parentNode);
      },
    },
    {
        name: '添加灯光',
        subCommand: [
            {
                name: '定向光',
                callback: () => {
                    const light = Editor.Instance.createLight("directional", Editor.Instance.Scene);
                    useScene().addHierarchy(light, parentNode);
                }
            },
            {
                name: '点光源',
                callback: () => {
                    const light = Editor.Instance.createLight("point", Editor.Instance.Scene);
                    useScene().addHierarchy(light, parentNode);
                }
            },
            {
                name: '聚光灯',
                callback: () => {
                    const light = Editor.Instance.createLight("spot", Editor.Instance.Scene);
                    useScene().addHierarchy(light, parentNode);
                }
            }
        ],
    },
    {
      name: '添加相机',
      subCommand: [
        {
          name: '第一人称相机',
          callback: () => {
            const camera = Editor.Instance.addUniversalCamera();
            nextTick(() => {
              useScene().addHierarchy(camera, parentNode);
            })
          },
        },
        {
          name: '第三人称相机',
          callback: () => {
            const camera = Editor.Instance.addCamera();
            nextTick(() => {
              useScene().addHierarchy(camera, parentNode);
            })
          },
        },
      ],
    },
    {
        name: '添加模型',
        subCommand: [
            {
                name: 'Box',
                callback: () => {
                    const mesh = MeshBuilder.CreateBox('Box');
                    mesh.rotationQuaternion = new Quaternion(0,0,0);
                    useScene().addHierarchy(mesh, parentNode);
                }
            },
            {
                name: 'Sphere',
                callback: () => {
                    var mesh = MeshBuilder.CreateSphere('Sphere');
                    mesh.rotationQuaternion = new Quaternion(0,0,0);
                    useScene().addHierarchy(mesh, parentNode);
                }
            },
        ]
    },
  ];
}

