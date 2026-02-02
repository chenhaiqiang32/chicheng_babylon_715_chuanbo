import { Vector3, Scene, Geometry, AbstractMesh, Mesh } from "@babylonjs/core";

// ==================== 基础类型 ====================
/** 碰撞体类型 */
export type CollisionMeshType = "none" | "cube" | "sphere" | "cylinder" | "capsule" | "convexHull" | "mesh";

/** 碰撞体轴向 */
export type CollisionAxis = "x" | "y" | "z";

/** 碰撞体细分级别（仅影响编辑器可视化，不影响运行时物理精度） */
export type CollisionDetailLevel = "low" | "medium" | "high";

// ==================== 形状接口 ====================
/**
 * 碰撞体形状基础接口
 * 所有碰撞形状都必须实现此接口
 */
export interface ICollisionShape {
	/** 形状类型（只读） */
	readonly type: CollisionMeshType;
	
	/** 形状中心点（相对于父网格的局部坐标） */
	center: Vector3;
	
	/** 根据源网格自动计算碰撞体尺寸 */
	calculateAutoSize(sourceMesh: AbstractMesh): void;
	
	/** 创建碰撞体几何体 */
	createGeometry(scene: Scene, parentScale?: Vector3): Geometry;
	
	/** 将形状参数应用到网格（设置位置、旋转、缩放） */
	applyToMesh(mesh: AbstractMesh): void;
	
	/** 克隆形状对象 */
	clone(): ICollisionShape;
	
	/** 序列化为 JSON */
	toJSON(): CollisionShapeJSON;
}

// ==================== 具体形状接口 ====================
/**
 * 立方体形状
 */
export interface ICubeShape extends ICollisionShape {
	readonly type: "cube";
	/** 立方体尺寸（宽度、高度、深度） */
	size: Vector3;
}

/**
 * 球体形状
 */
export interface ISphereShape extends ICollisionShape {
	readonly type: "sphere";
	/** 球体半径 */
	radius: number;
	/** 细分级别（仅影响编辑器可视化） */
	detail?: CollisionDetailLevel;
}

/**
 * 圆柱体形状
 */
export interface ICylinderShape extends ICollisionShape {
	readonly type: "cylinder";
	/** 圆柱半径 */
	radius: number;
	/** 圆柱高度 */
	height: number;
	/** 圆柱轴向 */
	axis: CollisionAxis;
	/** 细分级别（仅影响编辑器可视化） */
	detail?: CollisionDetailLevel;
}

/**
 * 胶囊体形状
 * height 是总高度（包括两个半球）
 */
export interface ICapsuleShape extends ICollisionShape {
	readonly type: "capsule";
	/** 胶囊半径 */
	radius: number;
	/** 胶囊总高度（包括两个半球） */
	height: number;
	/** 胶囊轴向 */
	axis: CollisionAxis;
	/** 细分级别（仅影响编辑器可视化） */
	detail?: CollisionDetailLevel;
}

/**
 * 凸包形状
 */
export interface IConvexHullShape extends ICollisionShape {
	readonly type: "convexHull";
	/** 从源网格创建凸包几何体 */
	createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null>;
}

/**
 * 精确网格形状
 */
export interface IMeshShape extends ICollisionShape {
	readonly type: "mesh";
	/** 从源网格创建几何体 */
	createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null>;
}

/**
 * 无碰撞体
 */
export interface INoneShape extends ICollisionShape {
	readonly type: "none";
}

// ==================== JSON 序列化接口 ====================
/**
 * 碰撞形状 JSON 基础接口
 */
export interface CollisionShapeJSON {
	type: CollisionMeshType;
	center: readonly [number, number, number];
}

/**
 * 立方体形状 JSON
 */
export interface CubeShapeJSON extends CollisionShapeJSON {
	type: "cube";
	size: readonly [number, number, number];
}

/**
 * 球体形状 JSON
 */
export interface SphereShapeJSON extends CollisionShapeJSON {
	type: "sphere";
	radius: number;
	detail?: CollisionDetailLevel;
}

/**
 * 圆柱体形状 JSON
 */
export interface CylinderShapeJSON extends CollisionShapeJSON {
	type: "cylinder";
	radius: number;
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

/**
 * 胶囊体形状 JSON
 */
export interface CapsuleShapeJSON extends CollisionShapeJSON {
	type: "capsule";
	radius: number;
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

/**
 * 凸包形状 JSON
 */
export interface ConvexHullShapeJSON extends CollisionShapeJSON {
	type: "convexHull";
}

/**
 * 精确网格形状 JSON
 */
export interface MeshShapeJSON extends CollisionShapeJSON {
	type: "mesh";
}

/**
 * 无碰撞体 JSON
 */
export interface NoneShapeJSON extends CollisionShapeJSON {
	type: "none";
}

/**
 * 所有形状 JSON 的联合类型
 */
export type AnyShapeJSON = 
	| CubeShapeJSON 
	| SphereShapeJSON 
	| CylinderShapeJSON 
	| CapsuleShapeJSON 
	| ConvexHullShapeJSON
	| MeshShapeJSON 
	| NoneShapeJSON;

// ==================== 碰撞网格接口 ====================
/**
 * 碰撞体网格接口
 * 管理碰撞体的可视化网格和形状配置
 */
export interface ICollisionMesh {
	/** 网格名称 */
	readonly name: string;
	/** 碰撞体类型 */
	readonly type: CollisionMeshType;
	/** 碰撞形状对象 */
	shape: ICollisionShape;
	/** 是否为触发器（触发器不产生物理响应） */
	isTrigger: boolean;
	
	/** 设置碰撞体类型并创建相应的几何体 */
	setType(type: CollisionMeshType, sourceMesh: AbstractMesh, useAutoSize?: boolean): Promise<void>;
	
	/** 更新碰撞体形状 */
	updateShape(shape: ICollisionShape): void;
	
	/** 重建几何体（当形状参数改变时） */
	rebuildGeometry(): void;
	
	/** 更新实例（同步源网格的实例） */
	updateInstances(sourceMesh: AbstractMesh): void;
	
	/** 销毁碰撞体及其资源 */
	dispose(): void;
}

// ==================== 配置接口 ====================
/**
 * 碰撞体网格配置
 */
export interface CollisionMeshConfig {
	/** 网格名称 */
	name: string;
	/** 场景对象 */
	scene: Scene;
	/** 父网格 */
	parent?: AbstractMesh | null;
	/** 初始形状 */
	initialShape?: ICollisionShape;
}

/**
 * 碰撞体创建配置
 */
export interface CollisionShapeConfig {
	/** 碰撞体类型 */
	type: CollisionMeshType;
	/** 中心点（可选） */
	center?: Vector3;
	/** 是否自动计算尺寸 */
	autoSize?: boolean;
	/** 源网格（用于自动计算尺寸） */
	sourceMesh?: AbstractMesh;
}

// ==================== 类型守卫 ====================
/**
 * 类型守卫函数，用于类型安全的形状判断
 */

/** 判断是否为立方体形状 */
export function isCubeShape(shape: ICollisionShape): shape is ICubeShape {
	return shape.type === "cube";
}

/** 判断是否为球体形状 */
export function isSphereShape(shape: ICollisionShape): shape is ISphereShape {
	return shape.type === "sphere";
}

/** 判断是否为圆柱体形状 */
export function isCylinderShape(shape: ICollisionShape): shape is ICylinderShape {
	return shape.type === "cylinder";
}

/** 判断是否为胶囊体形状 */
export function isCapsuleShape(shape: ICollisionShape): shape is ICapsuleShape {
	return shape.type === "capsule";
}

/** 判断是否为凸包形状 */
export function isConvexHullShape(shape: ICollisionShape): shape is IConvexHullShape {
	return shape.type === "convexHull";
}

/** 判断是否为精确网格形状 */
export function isMeshShape(shape: ICollisionShape): shape is IMeshShape {
	return shape.type === "mesh";
}

/** 判断是否为无碰撞体 */
export function isNoneShape(shape: ICollisionShape): shape is INoneShape {
	return shape.type === "none";
}
