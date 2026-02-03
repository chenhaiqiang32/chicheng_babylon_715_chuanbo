/**
 * 刚体模块入口
 * @module rigidbody
 * 
 * @description
 * 本模块提供刚体物理属性管理，包括：
 * - 运动类型：静态(static)、动态(dynamic)、运动学(kinematic)
 * - 物理属性：质量、阻尼、重力
 * - 材质属性：摩擦力、弹性系数
 * 
 * @example
 * import { RigidBody, DEFAULT_RIGIDBODY_PROPERTIES } from '@/tools/node/physics/rigidbody';
 * 
 * // 创建默认动态刚体
 * const rigidbody = new RigidBody(mesh);
 * 
 * // 创建自定义刚体
 * const staticRB = new RigidBody(mesh, {
 *   motionType: 'static',
 *   material: { friction: 0.8, restitution: 0.1 }
 * });
 * 
 * // 从metadata加载
 * const rb = RigidBody.fromMetadata(mesh);
 */

// 刚体类型、接口、默认值
export * from "./types";

// 刚体属性管理类
export { RigidBody } from "./rigidbody";
