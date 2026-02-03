<template>
  <SectionField title="Physics" :isProcessing="computingCollisionMesh">
    <!-- 物理系统总开关 -->
    <Switch label="Enable Physics" :object="mesh" property="checkCollisions" @change="onPhysicsEnabledChanged" />
    
    <div v-if="isPhysicsEnabled">
      <!-- =================碰撞器配置（Collider）================= -->
      <Block title="Collider">
        <Field title="碰撞体类型">
          <ElSelect 
            v-model="selectedCollisionType" 
            @change="onCollisionTypeChanged" 
            size="small" 
            style="width: 100%;"
          >
            <ElOption label="矩形" value="cube" />
            <ElOption label="圆形" value="sphere" />
            <ElOption label="圆柱" value="cylinder" />
            <ElOption label="胶囊" value="capsule" />
            <ElOption label="凸包" value="convexHull" />
            <ElOption label="网格" value="mesh" />
          </ElSelect>
        </Field>
        
        <!-- 触发器开关 -->
        <Switch 
          v-if="collisionMesh && collisionMesh.type !== 'none'" 
          label="是触发器 (Trigger)" 
          :object="collisionMesh" 
          property="isTrigger"
          :disabled="collisionMesh.type === 'mesh'"
          @change="onTriggerChanged"
        />
        
        <!-- 显示网格开关 -->
        <Switch 
          v-if="collisionMesh && collisionMesh.usesSimplifiedWireframe && collisionMesh.type !== 'convexHull' && collisionMesh.type !== 'mesh'" 
          label="显示网格" 
          :object="wireframeSettings"
          property="showFullWireframe"
          @change="onShowFullWireframeChanged" 
        />

        <!-- 碰撞体参数编辑 -->
        <div 
          v-if="collisionMesh && collisionMesh.type !== 'none' && collisionMesh.type !== 'convexHull' && collisionMesh.type !== 'mesh'" 
          class="collider-params"
        >
          <!-- 中心点 -->
          <Vector 
            label="中心点" 
            :object="collisionMesh.shape" 
            property="center" 
            @change="onShapeCenterChanged" 
          />
          
          <!-- 矩形参数 -->
          <template v-if="isCubeShape(collisionMesh.shape)">
            <Vector 
              label="尺寸" 
              :object="collisionMesh.shape" 
              property="size" 
              @change="onShapeParamsChanged" 
            />
          </template>
          
          <!-- 球体参数 -->
          <template v-else-if="isSphereShape(collisionMesh.shape)">
            <Number 
              label="半径" 
              :object="collisionMesh.shape" 
              property="radius" 
              :step="0.1" 
              :min="0.01" 
              @change="onShapeParamsChanged" 
            />
            <Field title="细分">
              <ElSelect
                v-model="(collisionMesh.shape as any).detail"
                @change="onShapeParamsChanged"
                size="small"
                style="width: 100%;"
              >
                <ElOption label="低" value="low" />
                <ElOption label="中" value="medium" />
                <ElOption label="高" value="high" />
              </ElSelect>
            </Field>
          </template>
          
          <!-- 圆柱体参数 -->
          <template v-else-if="isCylinderShape(collisionMesh.shape)">
            <Field title="轴向">
              <ElSelect 
                v-model="collisionMesh.shape.axis" 
                @change="onShapeParamsChanged" 
                size="small" 
                style="width: 100%;"
              >
                <ElOption label="X 轴" value="x" />
                <ElOption label="Y 轴" value="y" />
                <ElOption label="Z 轴" value="z" />
              </ElSelect>
            </Field>
            <Number 
              label="半径" 
              :object="collisionMesh.shape" 
              property="radius" 
              :step="0.1" 
              :min="0.01" 
              @change="onShapeParamsChanged" 
            />
            <Number 
              label="高度" 
              :object="collisionMesh.shape" 
              property="height" 
              :step="0.1" 
              :min="0.01" 
              @change="onShapeParamsChanged" 
            />
            <Field title="细分">
              <ElSelect
                v-model="(collisionMesh.shape as any).detail"
                @change="onShapeParamsChanged"
                size="small"
                style="width: 100%;"
              >
                <ElOption label="低" value="low" />
                <ElOption label="中" value="medium" />
                <ElOption label="高" value="high" />
              </ElSelect>
            </Field>
          </template>
          
          <!-- 胶囊体参数 -->
          <template v-else-if="isCapsuleShape(collisionMesh.shape)">
            <Field title="轴向">
              <ElSelect 
                v-model="collisionMesh.shape.axis" 
                @change="onShapeParamsChanged" 
                size="small" 
                style="width: 100%;"
              >
                <ElOption label="X 轴" value="x" />
                <ElOption label="Y 轴" value="y" />
                <ElOption label="Z 轴" value="z" />
              </ElSelect>
            </Field>
            <Number 
              label="高度" 
              :object="collisionMesh.shape" 
              property="height" 
              :step="0.1" 
              :min="0" 
              @change="onShapeParamsChanged" 
            />
            <Number 
              label="半径" 
              :object="collisionMesh.shape" 
              property="radius" 
              :step="0.1" 
              :min="0.01" 
              @change="onShapeParamsChanged" 
            />
            <Field title="细分">
              <ElSelect
                v-model="(collisionMesh.shape as any).detail"
                @change="onShapeParamsChanged"
                size="small"
                style="width: 100%;"
              >
                <ElOption label="低" value="low" />
                <ElOption label="中" value="medium" />
                <ElOption label="高" value="high" />
              </ElSelect>
            </Field>
          </template>
        </div>
      </Block>
      
      <!-- =================刚体配置（RigidBody）================= -->
      <Block title="RigidBody" v-if="collisionMesh && collisionMesh.type !== 'none'">
        <!-- 运动类型 -->
        <Field title="运动类型">
          <ElSelect 
            v-model="rigidbodyProps.motionType" 
            @change="onRigidbodyChanged" 
            size="small" 
            style="width: 100%;"
          >
            <ElOption label="静态 (Static)" value="static" />
            <ElOption label="动态 (Dynamic)" value="dynamic" />
            <ElOption label="运动学 (Kinematic)" value="kinematic" />
          </ElSelect>
        </Field>
        
        <!-- 动态物体的属性 -->
        <template v-if="rigidbodyProps.motionType === 'dynamic'">
          <Number 
            label="质量 (kg)" 
            :object="rigidbodyProps" 
            property="mass" 
            :step="0.1" 
            :min="0.001" 
            @change="onRigidbodyChanged" 
          />
          
          <Switch 
            label="启用重力" 
            :object="rigidbodyProps" 
            property="useGravity" 
            @change="onRigidbodyChanged" 
          />
          
          <Number 
            label="线性阻尼" 
            :object="rigidbodyProps" 
            property="linearDamping" 
            :step="0.01" 
            :min="0" 
            :max="1" 
            @change="onRigidbodyChanged" 
          />
          
          <Number 
            label="角阻尼" 
            :object="rigidbodyProps" 
            property="angularDamping" 
            :step="0.01" 
            :min="0" 
            :max="1" 
            @change="onRigidbodyChanged" 
          />
        </template>
        
        <!-- 物理材质 -->
        <Number 
          label="摩擦力" 
          :object="rigidbodyProps.material" 
          property="friction" 
          :step="0.05" 
          :min="0" 
          :max="1" 
          @change="onRigidbodyChanged" 
        />
        
        <Number 
          label="弹性系数" 
          :object="rigidbodyProps.material" 
          property="restitution" 
          :step="0.05" 
          :min="0" 
          :max="1" 
          @change="onRigidbodyChanged" 
        />
      </Block>
      
      <!-- 运行时物理测试 -->
      <Field title="运行时测试">
        <div style="display: flex; gap: 8px;">
          <ElButton
            size="small"
            type="success"
            @click="onTestRuntimePhysics"
            style="flex: 1;"
          >
            启动物理系统
          </ElButton>
          <ElButton
            size="small"
            type="warning"
            @click="onStopRuntimePhysics"
            style="flex: 1;"
          >
            停止物理系统
          </ElButton>
        </div>
      </Field>
    </div>
  </SectionField>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch, nextTick, reactive } from "vue";
import { ElSelect, ElOption, ElButton, ElMessage } from 'element-plus';
import SectionField from '@/component/common/SectionField.vue';
import Block from '@/component/common/Block.vue';
import Field from '@/component/common/Field.vue';
import Switch from "@/component/base/Switch.vue";
import Vector from "@/component/base/Vector.vue";
import Number from "@/component/base/Number.vue";
import { AbstractMesh, Tools, HavokPlugin } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { UniqueNumber } from "@/tools/guards/tools";
import { isInstancedMesh, isMesh } from "@/tools/guards/nodes";
import {
  CollisionMesh,
  CollisionMeshType,
  isCubeShape,
  isSphereShape,
  isCylinderShape,
  isCapsuleShape,
  RigidBody,
  IRigidBodyProperties,
  DEFAULT_RIGIDBODY_PROPERTIES,
  RuntimePhysicsFactory,
} from "@/tools/node/physics";


const props = defineProps<{ object: AbstractMesh }>();


/**
 * 获取实际的网格对象
 * @description 处理实例化网格，返回源网格对象用于物理配置
 * 实例网格共享源网格的物理配置
 */
const mesh = computed<AbstractMesh>(() => {
  let m: any = props.object._masterMesh ?? props.object;
  if (isInstancedMesh(m)) m = m.sourceMesh;
  return m;
});

// ==================== 响应式状态 ====================
/** 碰撞体网格对象（存储在源网格的 collisionMesh 属性中） */
const collisionMesh = ref<CollisionMesh | null>(null);

/** 是否正在计算碰撞网格（用于显示加载状态） */
const computingCollisionMesh = ref(false);

/** 当前选择的碰撞体类型 */
const selectedCollisionType = ref<CollisionMeshType>('cube');

/** 物理系统是否启用（对应 mesh.checkCollisions） */
const isPhysicsEnabled = ref(false);

/** 线框显示设置 */
const wireframeSettings = ref({ showFullWireframe: false });

/** 刚体属性（质量、阻尼、材质等） */
const rigidbodyProps = reactive<IRigidBodyProperties>({
  ...DEFAULT_RIGIDBODY_PROPERTIES
});

/** 运行时物理对象列表（仅用于测试，实际运行时由游戏引擎管理） */
const runtimePhysicsBodies = ref<any[]>([]);


/**
 * 将碰撞网格同步到源网格对象
 * 碰撞网格配置存储在源网格的 collisionMesh 属性中，供序列化和运行时使用
 */
const syncCollisionMeshToMesh = (): void => {
  (mesh.value as any).collisionMesh = collisionMesh.value;
};

/**
 * 从源网格加载碰撞网格配置
 * 在切换选中对象或初始化时调用
 */
const loadCollisionMeshFromMesh = (): void => {
  if (!mesh.value) {
    collisionMesh.value = null;
    return;
  }
  collisionMesh.value = (mesh.value as any).collisionMesh || null;
};

/**
 * 从源网格的 metadata 加载刚体配置
 * 刚体配置（质量、阻尼等）存储在 mesh.metadata.rigidbody 中
 */
const loadRigidbodyFromMesh = (): void => {
  if (!mesh.value) {
    Object.assign(rigidbodyProps, DEFAULT_RIGIDBODY_PROPERTIES);
    return;
  }
  const rb = RigidBody.fromMetadata(mesh.value);
  if (rb) {
    Object.assign(rigidbodyProps, rb.properties);
  } else {
    Object.assign(rigidbodyProps, DEFAULT_RIGIDBODY_PROPERTIES);
  }
};

/**
 * 将刚体配置保存到源网格的 metadata
 * 每次修改刚体属性时调用
 */
const saveRigidbodyToMesh = (): void => {
  new RigidBody(mesh.value, rigidbodyProps);
};

/**
 * 设置碰撞网格的可见性
 * 统一控制主网格、实例和线框的可见性
 */
const setCollisionMeshVisible = (visible: boolean): void => {
  if (!collisionMesh.value) return;
  collisionMesh.value.setVisibility(visible);
};

/**
 * 销毁碰撞网格及其资源
 * 在切换碰撞体类型或禁用物理时调用
 */
const disposeCollisionMesh = (): void => {
  if (collisionMesh.value) {
    collisionMesh.value.dispose();
    collisionMesh.value = null;
    syncCollisionMeshToMesh();
  }
};

/**
 * 物理启用状态改变处理
 * 当用户切换 "Enable Physics" 开关时触发
 */
const onPhysicsEnabledChanged = async (enabled: boolean): Promise<void> => {
  isPhysicsEnabled.value = enabled;
  
  if (enabled) {
    if (collisionMesh.value && collisionMesh.value.type !== 'none') {
      setCollisionMeshVisible(true);
    } else if (!collisionMesh.value) {
      //首次启用物理：创建默认碰撞体（cube）
      await onCollisionTypeChanged(selectedCollisionType.value);
    }
  } else {
    //禁用物理：隐藏碰撞体可视化（但保留配置）
    setCollisionMeshVisible(false);
  }
};

/**
 * 碰撞体类型改变处理
 * 在下拉框中选择不同的碰撞体类型时触发
 */
const onCollisionTypeChanged = async (type: CollisionMeshType): Promise<void> => {
  // 处理"无碰撞"类型
  if (type === 'none') {
    disposeCollisionMesh();
    return;
  }

  //如果类型未变化，无需重建
  if (collisionMesh.value?.type === type) {
    return;
  }

  computingCollisionMesh.value = true;

  //清理旧的碰撞网格
  if (collisionMesh.value) {
    collisionMesh.value.dispose(false, false);
  }
  
  //创建新的碰撞网格
  const cm = new CollisionMesh(`${mesh.value.name} Collider`, mesh.value.getScene(), mesh.value);
  cm.id = Tools.RandomId();
  cm.uniqueId = UniqueNumber.Get();
  collisionMesh.value = cm;
  syncCollisionMeshToMesh();
  
  //设置碰撞体类型并自动计算尺寸
  await cm.setType(type, mesh.value, true);
  
  //mesh 类型碰撞体不支持触发器功能
  if (type === 'mesh') {
    cm.isTrigger = false;
  }
  
  //确保刚体配置已初始化（新建碰撞体时自动创建默认刚体配置）
  if (!mesh.value.metadata?.rigidbody) {
    saveRigidbodyToMesh();
  }
  
  computingCollisionMesh.value = false;

  //如果物理已启用，显示碰撞网格
  if (mesh.value.checkCollisions) {
    setCollisionMeshVisible(true);
  }
  
  //确保 DOM 更新后再应用线框状态
  await nextTick();
  reapplyWireframeState();
};

/**
 * 形状中心点更新处理
 * 中心点改变只需要更新位置，不需要重建几何体
 */
const onShapeCenterChanged = (): void => {
  if (!collisionMesh.value) return;
  
  const shapeType = collisionMesh.value.shape.type;
  
  collisionMesh.value.position.copyFrom(collisionMesh.value.shape.center);
  if (shapeType === 'cube' || shapeType === 'sphere' || shapeType === 'cylinder' || shapeType === 'capsule') {
    //简单形状：只更新位置即可
    collisionMesh.value.position.copyFrom(collisionMesh.value.shape.center);
  } else if (shapeType === 'mesh' || shapeType === 'convexHull') {
    //复杂形状：完整变换
    collisionMesh.value.shape.applyToMesh(collisionMesh.value as unknown as AbstractMesh);
  }
  
  collisionMesh.value.ensureMaterialConfig();
  syncCollisionMeshToMesh();
};

/**
 * 形状参数更新处理
 * 处理尺寸、半径、高度、轴向、细分等参数的变化
 * 这些参数改变需要重建几何体来反映新的形状
 */
const onShapeParamsChanged = (): void => {
  if (!collisionMesh.value) return;
  collisionMesh.value.rebuildGeometry();
  syncCollisionMeshToMesh();
};

/**
 * 完整线框显示切换处理
 * @description 控制是否显示完整的碰撞体网格（而非简化的线框）
 */
const onShowFullWireframeChanged = (show: boolean): void => {
  if (!collisionMesh.value) return;
  collisionMesh.value.setShowFullMesh(show);
};

/**
 * 重新应用线框状态
 * 在碰撞体类型改变后恢复线框显示设置
 */
const reapplyWireframeState = (): void => {
  if (!collisionMesh.value || !wireframeSettings.value.showFullWireframe) return;
  collisionMesh.value.setShowFullMesh(true);
};

/**
 * 触发器状态改变处理
 * 触发器不产生物理响应，只触发碰撞事件
 */
const onTriggerChanged = (): void => {
  syncCollisionMeshToMesh();
};

/**
 * 刚体属性改变处理
 * 处理质量、阻尼、摩擦力、弹性系数等属性的变化
 */
const onRigidbodyChanged = (): void => {
  saveRigidbodyToMesh();
};

/**
 * 测试运行时物理系统
 * 遍历场景中所有配置了物理的网格，创建 Babylon.js 物理对象
 * 这是一个测试功能，用于在编辑器中预览物理效果
 * 实际游戏运行时由游戏引擎自动初始化物理系统
 */
const onTestRuntimePhysics = async (): Promise<void> => {
  console.log('[Physics] Starting runtime physics test...');
  
  try {
    const scene = mesh.value.getScene();
    
    // 1. 初始化物理引擎（如果尚未初始化）
    if (!scene.getPhysicsEngine()) {
      console.log('[Physics] 正在初始化物理引擎...');
      ElMessage.info('正在初始化物理引擎...');
      
      const havokInstance = await HavokPhysics({
        locateFile: () => '/lib/havok/HavokPhysics.wasm'
      });
      const havokPlugin = new HavokPlugin(true, havokInstance);
      scene.enablePhysics(undefined, havokPlugin);
      
      console.log('[Physics] 物理引擎初始化成功');
      ElMessage.success('物理引擎初始化成功');
    } else {
      console.log('[Physics] 物理引擎已经初始化了');
    }
    
    // 2. 清理之前的物理对象
    onStopRuntimePhysics();
    
    // 3. 遍历场景中的所有网格，创建物理对象
    const meshes = scene.meshes.filter(m => isMesh(m) && !isInstancedMesh(m));
    let successCount = 0;
    let failCount = 0;
    
    console.log(`[Physics] 在场景中找到 ${meshes.length} 个网格, 正在扫描物理配置...`);
    ElMessage.info(`开始初始化物理系统，共 ${meshes.length} 个网格...`);
    
    for (const sceneMesh of meshes) {
      //检查是否启用了物理（Enable Physics 必须为 true）
      if (!sceneMesh.checkCollisions) {
        continue;
      }
      
      //检查是否配置了碰撞体和刚体
      const collisionMeshData = (sceneMesh as any).collisionMesh;
      const rigidbodyData = sceneMesh.metadata?.rigidbody;
      
      if (!collisionMeshData || !rigidbodyData) {
        console.warn(`[Physics] 网格 "${sceneMesh.name}" 物理启用的 但是没有物理的配置`);
        continue;
      }
      
      try {
        const isTrigger = collisionMeshData.isTrigger === true;
        
        // 创建物理对象
        const physicsBody = await RuntimePhysicsFactory.createPhysicsBody(
          sceneMesh as AbstractMesh,
          collisionMeshData,
          rigidbodyData,
          isTrigger,
          scene
        );
        
        if (physicsBody) {
          runtimePhysicsBodies.value.push(physicsBody);
          successCount++;
          console.log(`[Physics] 创建刚体成功 "${sceneMesh.name}" (${collisionMeshData.shape.type}, ${rigidbodyData.motionType})`);
        } else {
          failCount++;
          console.warn(`[Physics] 创建刚体失败 "${sceneMesh.name}"`);
        }
      } catch (error) {
        failCount++;
        console.error(`[Physics] 创建刚体失败 "${sceneMesh.name}":`, error);
      }
    }
    
    // 4. 显示结果
    console.log(`[Physics] 测试完成: ${successCount} succeeded, ${failCount} failed`);
    
    if (successCount > 0) {
      ElMessage.success(`物理系统启动成功！已创建 ${successCount} 个物理对象${failCount > 0 ? `，${failCount} 个失败` : ''}`);
    } else {
      ElMessage.warning('没有找到配置了物理的网格');
    }
  } catch (error) {
    console.error('[Physics] 物理系统初始化失败:', error);
    ElMessage.error('物理系统初始化失败：' + (error as Error).message);
  }
};

/**
 * 停止运行时物理系统
 * 清理所有测试创建的物理对象
 */
const onStopRuntimePhysics = (): void => {
  if (runtimePhysicsBodies.value.length === 0) {
    return;
  }
  
  try {
    let disposeCount = 0;
    let failCount = 0;
    
    // 清理所有物理对象
    runtimePhysicsBodies.value.forEach((body, index) => {
      try {
        body.dispose();
        disposeCount++;
      } catch (error) {
        failCount++;
        console.warn(`[Physics] 卸载physicsbody失败 #${index}:`, error);
      }
    });
    
    runtimePhysicsBodies.value = [];
    
    console.log(`[Physics] 物理系统已停止: ${disposeCount} disposed, ${failCount} failed`);
    ElMessage.info('物理系统已停止');
  } catch (error) {
    console.error('[Physics] 停止物理系统失败:', error);
    ElMessage.error('停止物理系统失败');
  }
};


/**
 * 监听网格对象变化，加载配置
 * 在场景中选择不同对象时触发
 */
watch(() => mesh.value, (newMesh, oldMesh) => {
  //切换对象时，先隐藏旧对象的碰撞体可视化
  const oldCollisionMesh = collisionMesh.value;
  if (oldCollisionMesh) {
    oldCollisionMesh.setVisibility(false);
  }
  
  //加载新对象的配置
  loadCollisionMeshFromMesh();
  loadRigidbodyFromMesh();
  
  selectedCollisionType.value = collisionMesh.value?.type ?? 'cube';
  isPhysicsEnabled.value = mesh.value?.checkCollisions ?? false;
  
  //如果没有选中对象，不显示任何碰撞体
  if (!newMesh) {
    return;
  }
  
  // 根据新对象的物理状态显示碰撞体
  if (isPhysicsEnabled.value && collisionMesh.value) {
    setCollisionMeshVisible(true);
  } else if (collisionMesh.value) {
    setCollisionMeshVisible(false);
  }
}, { immediate: true });

/**
 * 监听碰撞网格变化，同步类型选择
 */
watch(() => collisionMesh.value, () => {
  selectedCollisionType.value = collisionMesh.value?.type ?? 'cube';
}, { immediate: true });

/**
 * 监听物理检测开关，更新可见性
 * 响应用户在其他面板或代码中修改 checkCollisions 属性
 */
watch(() => mesh.value?.checkCollisions, (enabled) => {
  isPhysicsEnabled.value = enabled ?? false;
  
  if (enabled && collisionMesh.value && collisionMesh.value.type !== 'none') {
    setCollisionMeshVisible(true);
  } else {
    setCollisionMeshVisible(false);
  }
}, { immediate: true });

/**
 * 监听碰撞体类型，强制约束规则
 * Mesh类型的碰撞体不支持触发器功能
 */
watch(() => collisionMesh.value?.type, (type) => {
  if (type === 'mesh' && collisionMesh.value) {
    collisionMesh.value.isTrigger = false;
  }
});

// ==================== 生命周期 ====================
/**
 * 组件卸载前的清理工作
 */
onBeforeUnmount(() => {
  //隐藏碰撞体可视化
  if (collisionMesh.value) {
    collisionMesh.value.setVisibility(false);
  }
  
  //清理测试创建的运行时物理对象
  onStopRuntimePhysics();
});
</script>

<style scoped>
.collider-params {
  margin-top: 8px;
}
</style>
