import { Editor } from "@/3d/Editor";
import { useScene } from "@/store/useScene";
import { MeshBuilder, Node, PBRMaterial, Quaternion, StandardMaterial, TransformNode } from "@babylonjs/core";
import { nextTick } from "vue";
import { EnvFileHelper } from "./EnvFileHelper";
import { RuntimeLibrary } from "@/3d/assets/runtimeLibrary";
import { Utils } from "@/utils";

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
            }
        ]
    },

  ];
}

/**
 * 资产-模型面板的右键
 */
export function getAssetsModelContextMenuCommands() {
return [
    {
      name: '导入模型',
      callback: () => {
        Utils.chooseFile('.glb,.fbx').then(async (fileList) => {
          if (fileList[0]) {
              const node = await RuntimeLibrary.Instance.importMesh(fileList[0]);
              RuntimeLibrary.Instance.dispatch("onChanged");
          }
        })
      }
    }
  ]
}

/**
 * 资产-材质面板的右键
 */
export function getAssetsMaterialContextMenuCommands() {
  return [
    {
      name: '创建Standard材质',
      callback: () => {
        // 创建材质
        const material = new StandardMaterial('Standard', Editor.Instance.Scene);
        RuntimeLibrary.Instance.addMaterial(material);
        // Assets.vue会监听 onChanged 然后创建预览球
        RuntimeLibrary.Instance.dispatch("onChanged");
      },
    },
    {
      name: '创建PBR材质',
      callback: () => {
        const material = new PBRMaterial("PBR", Editor.Instance.Scene);
        RuntimeLibrary.Instance.addMaterial(material);
        RuntimeLibrary.Instance.dispatch("onChanged");
      },
    }
  ]
}

export function getAssetsTextureContextMenuCommands() {
  return [
    {
      name:'添加贴图',
      callback: async () => {
        const fileList = await Utils.chooseFile('image/*', true);
        const array = [...fileList].filter(x => x.type == 'image/png' || x.type == 'image/jpeg' || x.type == 'image/webp')
    
        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            await RuntimeLibrary.Instance.importTexture(element)
        }
        RuntimeLibrary.Instance.dispatch("onChanged");
      }
    }
  ]
}

export function getAssetsHdrContextMenuCommands() {
  return [
    {
      name: '添加环境贴图',
      callback: async () => {
        var helper = new EnvFileHelper();
        //helper.loadSkyBox();
        await helper.importSkyboxTexture();
        RuntimeLibrary.Instance.dispatch("onChanged");
      }
    }
  ]
}



