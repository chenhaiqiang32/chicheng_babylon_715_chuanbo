/**
 * 物理系统模块入口
 * @module physics
 * 
 * @description
 * 物理系统包括碰撞器和刚体
 * 
 * **核心组件：**
 *  **Collision（碰撞器）**: 定义物体的碰撞形状和检测范围
 *   7种碰撞体类型：cube, sphere, cylinder, capsule, convexHull, mesh, none
 *   编辑器可视化和参数调整
 *   触发器（Trigger）支持
 * 
 *  **RigidBody（刚体）**: 定义物体的物理属性
 *   运动类型：static（静态）、dynamic（动态）、kinematic（运动学）
 *   物理参数：质量、阻尼、重力
 *   材质属性：摩擦力、弹性系数
 * 
 * - **RuntimePhysicsFactory（运行时工厂）**: 将编辑器配置转换为Babylon.js物理对象
 * 
 * @example
 * import {
 *   CollisionMesh,
 *   CollisionShapeFactory,
 *   RigidBody,
 *   RuntimePhysicsFactory
 * } from '@/tools/node/physics';
 * 
 * //1. 编辑器：创建碰撞体
 * const collisionMesh = new CollisionMesh('Collider', scene, mesh);
 * await collisionMesh.setType('sphere', mesh, true);
 * 
 * //2. 编辑器：配置刚体
 * const rigidbody = new RigidBody(mesh, {
 *   motionType: 'dynamic',
 *   mass: 2.0,
 *   useGravity: true
 * });
 * 
 * //3. 运行时：创建物理对象
 * const physicsBody = await RuntimePhysicsFactory.createPhysicsBody(
 *   mesh,
 *   collisionMeshData,
 *   rigidbodyJSON,
 *   isTrigger,
 *   scene
 * );
 */

//导出碰撞体形状、碰撞网格、工厂类等
export * from "./collision";

//导出刚体类、属性类型、默认值等
export * from "./rigidbody";

//将编辑器配置转换为Babylon.js运行时物理对象
export { RuntimePhysicsFactory } from "./runtime";
