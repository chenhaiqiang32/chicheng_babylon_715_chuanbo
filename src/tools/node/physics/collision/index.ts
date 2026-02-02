// ==================== Collision Module Entry Point ====================
/**
 * 碰撞检测模块入口
 * @module collision
 * 
 * @description
 * 本模块提供完整的碰撞体系统，包括：
 * - 7种碰撞体形状：立方体、球体、圆柱、胶囊、凸包、精确网格、无碰撞
 * - 碰撞体可视化网格
 * - 形状序列化/反序列化
 * - 工厂模式创建器
 * 
 * @example
 * ```ts
 * import { CollisionMesh, CollisionShapeFactory } from '@/tools/node/physics/collision';
 * 
 * // 创建碰撞体网格
 * const collisionMesh = new CollisionMesh('MyCollider', scene, sourceMesh);
 * await collisionMesh.setType('sphere', sourceMesh, true);
 * 
 * // 使用工厂创建形状
 * const shape = CollisionShapeFactory.createDefault('cube', sourceMesh);
 * ```
 */

// ==================== 类型系统 ====================
// 类型定义、接口和类型守卫函数
export * from "./types";

// ==================== 工具函数 ====================
// 轴向转换、向量序列化等工具函数
export * from "./utils";

// ==================== 形状类 ====================
// 各种碰撞体形状的实现类
export {
	NoneCollisionShape,
	CubeCollisionShape,
	SphereCollisionShape,
	CylinderCollisionShape,
	CapsuleCollisionShape,
	ConvexHullCollisionShape,
	MeshCollisionShape,
} from "./shapes";

// ==================== 工厂类 ====================
// 统一的形状对象创建接口
export { CollisionShapeFactory } from "./factory";

// ==================== 碰撞网格 ====================
// 碰撞体可视化和管理类
export { CollisionMesh } from "./mesh";
