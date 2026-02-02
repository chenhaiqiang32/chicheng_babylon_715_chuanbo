import { Editor } from '@/3d/Editor';
import { useScene } from '@/store/useScene';
import {
  MeshBuilder,
  Node,
  PBRMaterial,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
  Mesh,
  Color3,
} from '@babylonjs/core';
import { nextTick } from 'vue';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { Utils } from '@/utils';
import { addParticleSystem } from '@/tools/particles/particles';
import { importSkyboxTexture } from '@/3d/core/utils/EnvSkybox';
import { nodeCRUD } from '@/3d/core/utils/nodeCRUD';
import { CollisionMesh } from '@/tools/node/physics/collision';
import { RigidBody } from '@/tools/node/physics/rigidbody';

/**
 * 获取层级面板的右键菜单配置
 */
export function getHierarchyContextMenuCommands(parentNode?: Node | null): ContextMenuItem[] {
  return [
    {
      name: '添加节点',
      callback: () => {
        const node = new TransformNode('empty', Editor.Instance.Scene);
        node.rotationQuaternion = new Quaternion(0, 0, 0);
        useScene().addHierarchy(node, parentNode);
      },
    },
    {
      name: '添加灯光',
      subCommand: [
        {
          name: '定向光',
          callback: () => {
            const light = Editor.Instance.createLight('directional', Editor.Instance.Scene);
            useScene().addHierarchy(light, parentNode);
          },
        },
        {
          name: '点光源',
          callback: () => {
            const light = Editor.Instance.createLight('point', Editor.Instance.Scene);
            useScene().addHierarchy(light, parentNode);
          },
        },
        {
          name: '聚光灯',
          callback: () => {
            const light = Editor.Instance.createLight('spot', Editor.Instance.Scene);
            useScene().addHierarchy(light, parentNode);
          },
        },
        {
          name: '面光',
          callback: () => {
            const light = Editor.Instance.createLight('area', Editor.Instance.Scene);
            useScene().addHierarchy(light, parentNode);
          },
        },
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
            });
          },
        },
        {
          name: '第三人称相机',
          callback: () => {
            const camera = Editor.Instance.addCamera();
            nextTick(() => {
              useScene().addHierarchy(camera, parentNode);
            });
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
            mesh.material = new PBRMaterial('BoxMat', Editor.Instance.Scene);
            mesh.rotationQuaternion = new Quaternion(0, 0, 0);
            useScene().addHierarchy(mesh, parentNode);
          },
        },
        {
          name: 'Sphere',
          callback: () => {
            var mesh = MeshBuilder.CreateSphere('Sphere');
            mesh.rotationQuaternion = new Quaternion(0, 0, 0);
            mesh.material = new PBRMaterial('SphereMat', Editor.Instance.Scene);
            useScene().addHierarchy(mesh, parentNode);
          },
        },
        {
          name: '测试物理场景',
          callback: async () => {
            await createPhysicsTestScene(parentNode);
          },
        },
      ],
    },
    {
      name: '添加粒子',
      subCommand: [
        {
          name: '添加默认粒子',
          callback: () => {
            addParticleSystem('default');
          },
        },
        // {
        //     name: '添加太阳',
        //     callback: () => {

        //         addParticleSystem("sun");
        //     }
        // },
        {
          name: '添加烟雾',
          callback: () => {
            addParticleSystem('smoke');
          },
        },
        {
          name: '添加雨',
          callback: () => {
            addParticleSystem('rain');
          },
        },
        {
          name: '添加火',
          callback: () => {
            addParticleSystem('fire');
          },
        },
        {
          name: '添加爆炸',
          callback: () => {
            addParticleSystem('explosion');
          },
        },
      ],
    },
    // 对节点进行操作
    ...(parentNode ? [
    {
      name: '删除',
      callback: () => {
        nodeCRUD().deleteNode(parentNode);
      },
    },
    {
      name: '复制',
      callback: async () => {
        const serializedNode = await nodeCRUD().copyNode(parentNode);
        useScene().currentCopy = serializedNode;
      }
    },
    ] : []),
    ...(useScene().currentCopy ? [
    {
      name: '粘贴',
      callback: async () => {
        const clone = await nodeCRUD().pasteNode(useScene().currentCopy, parentNode || null);
      }
    }
    ] : []),
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
            RuntimeLibrary.Instance.dispatch('onChanged');
          }
        });
      },
    },
  ];
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
        RuntimeLibrary.Instance.dispatch('onChanged');
      },
    },
    {
      name: '创建PBR材质',
      callback: () => {
        const material = new PBRMaterial('PBR', Editor.Instance.Scene);
        RuntimeLibrary.Instance.addMaterial(material);
        RuntimeLibrary.Instance.dispatch('onChanged');
      },
    },
  ];
}

export function getAssetsTextureContextMenuCommands() {
  return [
    {
      name: '添加贴图',
      callback: async () => {
        const fileList = await Utils.chooseFile('image/*', true);
        const array = [...fileList].filter(
          (x) => x.type == 'image/png' || x.type == 'image/jpeg' || x.type == 'image/webp',
        );

        for (let index = 0; index < array.length; index++) {
          const element = array[index];
          await RuntimeLibrary.Instance.importTexture(element);
        }
        RuntimeLibrary.Instance.dispatch('onChanged');
      },
    },
  ];
}

export function getAssetsHdrContextMenuCommands() {
  return [
    {
      name: '添加环境贴图',
      callback: async () => {
        await importSkyboxTexture();
        RuntimeLibrary.Instance.dispatch('onChanged');
      },
    },
  ];
}

/**
 * 创建测试物理场景
 * 包含多个基础几何体的静态刚体，用于测试物理系统
 */
async function createPhysicsTestScene(parentNode?: Node | null) {
  const scene = Editor.Instance.Scene;
  
  // 创建根节点
  const rootNode = new TransformNode('PhysicsTestScene', scene);
  rootNode.position = new Vector3(0, 0, 0);
  rootNode.rotationQuaternion = new Quaternion(0, 0, 0, 1);
  
  // 定义场景结构：丰富的物理测试场景
  const physicsObjects = [
    // ========== 地面和边界 ==========
    // 主地面 - 超大平板
    {
      name: 'Ground',
      type: 'box' as const,
      size: new Vector3(50, 1, 50),
      position: new Vector3(0, -0.5, 0),
      collisionType: 'cube' as const,
    },
    // 后墙
    {
      name: 'BackWall',
      type: 'box' as const,
      size: new Vector3(50, 10, 1),
      position: new Vector3(0, 5, -25),
      collisionType: 'cube' as const,
    },
    // 前墙
    {
      name: 'FrontWall',
      type: 'box' as const,
      size: new Vector3(50, 10, 1),
      position: new Vector3(0, 5, 25),
      collisionType: 'cube' as const,
    },
    // 左墙
    {
      name: 'LeftWall',
      type: 'box' as const,
      size: new Vector3(1, 10, 50),
      position: new Vector3(-25, 5, 0),
      collisionType: 'cube' as const,
    },
    // 右墙
    {
      name: 'RightWall',
      type: 'box' as const,
      size: new Vector3(1, 10, 50),
      position: new Vector3(25, 5, 0),
      collisionType: 'cube' as const,
    },

    // ========== 平台和楼梯区域（左侧） ==========
    // 低平台
    {
      name: 'Platform_Low',
      type: 'box' as const,
      size: new Vector3(8, 1, 8),
      position: new Vector3(-15, 1, -15),
      collisionType: 'cube' as const,
    },
    // 中平台
    {
      name: 'Platform_Mid',
      type: 'box' as const,
      size: new Vector3(8, 1, 8),
      position: new Vector3(-15, 3, -8),
      collisionType: 'cube' as const,
    },
    // 高平台
    {
      name: 'Platform_High',
      type: 'box' as const,
      size: new Vector3(8, 1, 8),
      position: new Vector3(-15, 5, -1),
      collisionType: 'cube' as const,
    },

    // ========== 斜坡区域（中央） ==========
    // 主斜坡
    {
      name: 'MainRamp',
      type: 'box' as const,
      size: new Vector3(10, 0.8, 12),
      position: new Vector3(0, 3, 0),
      rotation: new Vector3(0, 0, Math.PI / 6), // 30度倾斜
      collisionType: 'cube' as const,
    },
    // 侧斜坡
    {
      name: 'SideRamp',
      type: 'box' as const,
      size: new Vector3(8, 0.8, 8),
      position: new Vector3(8, 2, -10),
      rotation: new Vector3(Math.PI / 8, Math.PI / 4, 0), // 复合角度
      collisionType: 'cube' as const,
    },

    // ========== 圆柱障碍物区域（右侧） ==========
    // 大圆柱
    {
      name: 'Cylinder_Large',
      type: 'cylinder' as const,
      diameter: 4,
      height: 8,
      position: new Vector3(15, 4, 15),
      collisionType: 'cylinder' as const,
    },
    // 中圆柱1
    {
      name: 'Cylinder_Medium_1',
      type: 'cylinder' as const,
      diameter: 2.5,
      height: 5,
      position: new Vector3(18, 2.5, 8),
      collisionType: 'cylinder' as const,
    },
    // 中圆柱2
    {
      name: 'Cylinder_Medium_2',
      type: 'cylinder' as const,
      diameter: 2.5,
      height: 5,
      position: new Vector3(12, 2.5, 10),
      collisionType: 'cylinder' as const,
    },
    // 小圆柱（横向）
    {
      name: 'Cylinder_Horizontal',
      type: 'cylinder' as const,
      diameter: 2,
      height: 10,
      position: new Vector3(15, 1.5, 0),
      rotation: new Vector3(0, 0, Math.PI / 2), // 横向放置
      collisionType: 'cylinder' as const,
    },

    // ========== 球形障碍物 ==========
    // 大球
    {
      name: 'Sphere_Large',
      type: 'sphere' as const,
      diameter: 5,
      position: new Vector3(-8, 5, 10),
      collisionType: 'sphere' as const,
    },
    // 中球1
    {
      name: 'Sphere_Medium_1',
      type: 'sphere' as const,
      diameter: 3,
      position: new Vector3(5, 3.5, 15),
      collisionType: 'sphere' as const,
    },
    // 中球2
    {
      name: 'Sphere_Medium_2',
      type: 'sphere' as const,
      diameter: 3,
      position: new Vector3(-3, 3.5, 18),
      collisionType: 'sphere' as const,
    },
    // 小球
    {
      name: 'Sphere_Small',
      type: 'sphere' as const,
      diameter: 1.5,
      position: new Vector3(0, 2, -5),
      collisionType: 'sphere' as const,
    },

    // ========== 立方体障碍物 ==========
    // 大立方体
    {
      name: 'Cube_Large',
      type: 'box' as const,
      size: new Vector3(6, 6, 6),
      position: new Vector3(8, 3, -18),
      rotation: new Vector3(0, Math.PI / 4, 0), // 旋转45度
      collisionType: 'cube' as const,
    },
    // 长方体1
    {
      name: 'Box_Long_1',
      type: 'box' as const,
      size: new Vector3(2, 2, 8),
      position: new Vector3(-10, 1, 5),
      collisionType: 'cube' as const,
    },
    // 长方体2（横向）
    {
      name: 'Box_Long_2',
      type: 'box' as const,
      size: new Vector3(10, 1.5, 2),
      position: new Vector3(0, 1.25, -15),
      collisionType: 'cube' as const,
    },
    // 小立方体1
    {
      name: 'Cube_Small_1',
      type: 'box' as const,
      size: new Vector3(2, 2, 2),
      position: new Vector3(3, 1, 8),
      rotation: new Vector3(Math.PI / 6, Math.PI / 6, Math.PI / 6),
      collisionType: 'cube' as const,
    },
    // 小立方体2
    {
      name: 'Cube_Small_2',
      type: 'box' as const,
      size: new Vector3(2, 2, 2),
      position: new Vector3(-5, 1, -8),
      rotation: new Vector3(0, Math.PI / 3, 0),
      collisionType: 'cube' as const,
    },

    // ========== 台阶结构 ==========
    {
      name: 'Step_1',
      type: 'box' as const,
      size: new Vector3(6, 1, 3),
      position: new Vector3(-18, 0.5, 8),
      collisionType: 'cube' as const,
    },
    {
      name: 'Step_2',
      type: 'box' as const,
      size: new Vector3(6, 1, 3),
      position: new Vector3(-18, 1.5, 11),
      collisionType: 'cube' as const,
    },
    {
      name: 'Step_3',
      type: 'box' as const,
      size: new Vector3(6, 1, 3),
      position: new Vector3(-18, 2.5, 14),
      collisionType: 'cube' as const,
    },
    {
      name: 'Step_4',
      type: 'box' as const,
      size: new Vector3(6, 1, 3),
      position: new Vector3(-18, 3.5, 17),
      collisionType: 'cube' as const,
    },

    // ========== 通道/拱门 ==========
    // 拱门左柱
    {
      name: 'Arch_Left',
      type: 'box' as const,
      size: new Vector3(2, 8, 2),
      position: new Vector3(-5, 4, -18),
      collisionType: 'cube' as const,
    },
    // 拱门右柱
    {
      name: 'Arch_Right',
      type: 'box' as const,
      size: new Vector3(2, 8, 2),
      position: new Vector3(5, 4, -18),
      collisionType: 'cube' as const,
    },
    // 拱门顶部
    {
      name: 'Arch_Top',
      type: 'box' as const,
      size: new Vector3(12, 1.5, 2),
      position: new Vector3(0, 8.25, -18),
      collisionType: 'cube' as const,
    },

    // ========== 悬浮平台 ==========
    {
      name: 'FloatingPlatform_1',
      type: 'box' as const,
      size: new Vector3(5, 0.8, 5),
      position: new Vector3(18, 6, -8),
      collisionType: 'cube' as const,
    },
    {
      name: 'FloatingPlatform_2',
      type: 'box' as const,
      size: new Vector3(4, 0.8, 4),
      position: new Vector3(-12, 7, 0),
      collisionType: 'cube' as const,
    },
  ];

  // 创建所有物理对象
  for (const objConfig of physicsObjects) {
    let mesh: Mesh;
    
    // 创建几何体
    if (objConfig.type === 'box') {
      mesh = MeshBuilder.CreateBox(
        objConfig.name,
        { 
          width: objConfig.size!.x, 
          height: objConfig.size!.y, 
          depth: objConfig.size!.z 
        },
        scene
      );
    } else if (objConfig.type === 'cylinder') {
      mesh = MeshBuilder.CreateCylinder(
        objConfig.name,
        { 
          diameter: objConfig.diameter!, 
          height: objConfig.height! 
        },
        scene
      );
    } else if (objConfig.type === 'sphere') {
      mesh = MeshBuilder.CreateSphere(
        objConfig.name,
        { diameter: objConfig.diameter! },
        scene
      );
    } else {
      continue;
    }

    // 设置材质（根据物体类型设置不同颜色）
    const material = new PBRMaterial(objConfig.name + '_Mat', scene);
    
    // 根据名称前缀设置颜色
    if (objConfig.name.includes('Ground') || objConfig.name.includes('Wall')) {
      // 地面和墙壁 - 深灰色
      material.albedoColor = new Color3(0.5, 0.5, 0.5);
    } else if (objConfig.name.includes('Platform')) {
      // 平台 - 棕色
      material.albedoColor = new Color3(0.7, 0.5, 0.3);
    } else if (objConfig.name.includes('Ramp')) {
      // 斜坡 - 橙色
      material.albedoColor = new Color3(0.9, 0.6, 0.2);
    } else if (objConfig.name.includes('Cylinder')) {
      // 圆柱 - 蓝色
      material.albedoColor = new Color3(0.3, 0.5, 0.9);
    } else if (objConfig.name.includes('Sphere')) {
      // 球体 - 红色
      material.albedoColor = new Color3(0.9, 0.3, 0.3);
    } else if (objConfig.name.includes('Cube') || objConfig.name.includes('Box')) {
      // 立方体 - 绿色
      material.albedoColor = new Color3(0.3, 0.8, 0.4);
    } else if (objConfig.name.includes('Step')) {
      // 台阶 - 紫色
      material.albedoColor = new Color3(0.6, 0.4, 0.8);
    } else if (objConfig.name.includes('Arch')) {
      // 拱门 - 青色
      material.albedoColor = new Color3(0.3, 0.7, 0.7);
    } else if (objConfig.name.includes('Floating')) {
      // 悬浮平台 - 黄色
      material.albedoColor = new Color3(0.9, 0.9, 0.3);
    } else {
      // 默认 - 灰色
      material.albedoColor = new Color3(0.7, 0.7, 0.7);
    }
    
    material.metallic = 0.2;
    material.roughness = 0.8;
    mesh.material = material;

    // 设置位置和旋转
    mesh.position = objConfig.position.clone();
    mesh.rotationQuaternion = Quaternion.FromEulerAngles(
      objConfig.rotation?.x || 0,
      objConfig.rotation?.y || 0,
      objConfig.rotation?.z || 0
    );

    // 设置父节点
    mesh.parent = rootNode;

    // 启用物理检测
    mesh.checkCollisions = true;

    // 创建碰撞体
    const collisionMesh = new CollisionMesh(
      objConfig.name + '_Collision',
      scene,
      mesh
    );
    
    // 设置碰撞体类型（自动计算尺寸）
    await collisionMesh.setType(objConfig.collisionType, mesh, true);
    
    // 设置触发器状态
    collisionMesh.isTrigger = false;
    
    // 默认隐藏碰撞体可视化（可在 Physics 面板中通过开关打开）
    collisionMesh.setVisibility(false);
    
    // 标记为不在层级面板中显示（编辑器辅助工具，不应干扰场景层级）
    (collisionMesh as any).isIgnore = true;
    
    // 标记碰撞体网格为不可序列化
    collisionMesh.doNotSerialize = true;
    
    // 保存碰撞体实例到网格（Physics.vue 需要 CollisionMesh 实例）
    (mesh as any).collisionMesh = collisionMesh;

    // 创建静态刚体
    const rigidbody = new RigidBody(mesh, {
      motionType: 'static',
      mass: 0,
      linearDamping: 0,
      angularDamping: 0,
      useGravity: false,
      material: {
        friction: 0.5,
        restitution: 0.3,
      },
    });
  }

  // 将根节点添加到场景层级
  useScene().addHierarchy(rootNode, parentNode);
  
  console.log('物理测试场景已创建');
}
