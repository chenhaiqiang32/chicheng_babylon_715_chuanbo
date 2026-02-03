import { Vector3, AbstractMesh } from "@babylonjs/core";
import {
	CollisionMeshType,
	ICollisionShape,
	CollisionShapeConfig,
	AnyShapeJSON,
} from "./types";
import {
	NoneCollisionShape,
	CubeCollisionShape,
	SphereCollisionShape,
	CylinderCollisionShape,
	CapsuleCollisionShape,
	ConvexHullCollisionShape,
	MeshCollisionShape,
} from "./shapes";
import { arrayToVector } from "./utils";

/**
 * 碰撞体形状工厂类
 * 提供统一的形状对象创建和序列化接口
 * 简化形状对象的创建流程
 */
export class CollisionShapeFactory {
	/**
	 * 创建碰撞体形状对象
	 * @param config - 形状配置对象
	 * @returns 具体的形状实例
	 * 
	 * @example
	 * //创建手动配置的立方体
	 * const cube = CollisionShapeFactory.create({
	 *   type: 'cube',
	 *   center: new Vector3(0, 1, 0)
	 * });
	 * 
	 * //创建自动计算尺寸的球体
	 * const sphere = CollisionShapeFactory.create({
	 *   type: 'sphere',
	 *   autoSize: true,
	 *   sourceMesh: myMesh
	 * });
	 */
	static create(config: CollisionShapeConfig): ICollisionShape {
		const center = config.center || Vector3.Zero();
		let shape: ICollisionShape;
		
		// 根据类型创建对应的形状实例
		switch (config.type) {
			case "cube":
				shape = new CubeCollisionShape(center);
				break;
			case "sphere":
				shape = new SphereCollisionShape(center);
				break;
			case "cylinder":
				shape = new CylinderCollisionShape(center);
				break;
			case "capsule":
				shape = new CapsuleCollisionShape(center);
				break;
			case "convexHull":
				shape = new ConvexHullCollisionShape(center);
				break;
			case "mesh":
				shape = new MeshCollisionShape(center);
				break;
			case "none":
			default:
				return new NoneCollisionShape(center);
		}
		
		//如果启用自动尺寸，根据源网格计算碰撞体尺寸
		if (config.autoSize && config.sourceMesh) {
			shape.calculateAutoSize(config.sourceMesh);
		}
		
		return shape;
	}

	/**
	 * 从 JSON 数据反序列化形状对象
	 * @param data - 序列化的形状数据
	 * @returns 反序列化的形状实例
	 * 
	 * 用于从保存的场景文件的数据中恢复形状对象
	 * 每个形状类都实现了自己的 fromJSON 静态方法
	 */
	static fromJSON(data: AnyShapeJSON): ICollisionShape {
		switch (data.type) {
			case "cube":
				return CubeCollisionShape.fromJSON(data);
			case "sphere":
				return SphereCollisionShape.fromJSON(data);
			case "cylinder":
				return CylinderCollisionShape.fromJSON(data);
			case "capsule":
				return CapsuleCollisionShape.fromJSON(data);
			case "convexHull":
				return ConvexHullCollisionShape.fromJSON(data);
			case "mesh":
				return MeshCollisionShape.fromJSON(data);
			case "none":
			default:
				return new NoneCollisionShape(arrayToVector(data.center));
		}
	}

	/**
	 * 创建默认形状（自动计算尺寸）
	 * @param type - 形状类型
	 * @param sourceMesh - 源网格
	 * @returns 形状实例
	 * 
	 * 如果提供源网格则自动计算尺寸
	 * 
	 * @example
	 * //创建自动匹配网格的碰撞体
	 * const shape = CollisionShapeFactory.createDefault('cube', myMesh);
	 */
	static createDefault(type: CollisionMeshType, sourceMesh?: AbstractMesh): ICollisionShape {
		return this.create({
			type,
			autoSize: !!sourceMesh,
			sourceMesh,
		});
	}
}
