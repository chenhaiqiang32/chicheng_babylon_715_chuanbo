import { Vector3, Scene, Geometry, AbstractMesh, Mesh } from "@babylonjs/core";

export type CollisionMeshType = "none" | "cube" | "sphere" | "cylinder" | "capsule" | "convexHull" | "mesh";
export type CollisionAxis = "x" | "y" | "z";
export type CollisionDetailLevel = "low" | "medium" | "high";

/**
 * 碰撞体形状
 */
export interface ICollisionShape {
	readonly type: CollisionMeshType;	
	//形状中心点(相对于父网格的局部坐标)
	center: Vector3;	
	//根据源网格自动计算碰撞体尺寸
	calculateAutoSize(sourceMesh: AbstractMesh): void;	
	//创建碰撞体几何体
	createGeometry(scene: Scene, parentScale?: Vector3): Geometry;	
	//将形状参数应用到网格(设置位置、旋转、缩放)
	applyToMesh(mesh: AbstractMesh): void;	
	//深度克隆形状对象
	clone(): ICollisionShape;	
	//序列化为JSON
	toJSON(): CollisionShapeJSON;
}

export interface ICubeShape extends ICollisionShape {
	readonly type: "cube";
	//尺寸(宽、高、深)
	size: Vector3;
}

export interface ISphereShape extends ICollisionShape {
	readonly type: "sphere";
	radius: number;
	//细分级别
	detail?: CollisionDetailLevel;
}

export interface ICylinderShape extends ICollisionShape {
	readonly type: "cylinder";
	radius: number;
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

export interface ICapsuleShape extends ICollisionShape {
	readonly type: "capsule";
	radius: number;
	//总高度(包括两个半球)
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

/**
 * 凸包,依靠原网格
 */
export interface IConvexHullShape extends ICollisionShape {
	readonly type: "convexHull";
	//从源网格创建凸包几何体
	createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null>;
}

/**
 * 精确网格形状
 */
export interface IMeshShape extends ICollisionShape {
	readonly type: "mesh";
	//从源网格创建几何体
	createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null>;
}

/**
 * 无碰撞体
 */
export interface INoneShape extends ICollisionShape {
	readonly type: "none";
}

/**
 * 碰撞形状JSON
 */
export interface CollisionShapeJSON {
	type: CollisionMeshType;
	center: readonly [number, number, number];
}

export interface CubeShapeJSON extends CollisionShapeJSON {
	type: "cube";
	size: readonly [number, number, number];
}

export interface SphereShapeJSON extends CollisionShapeJSON {
	type: "sphere";
	radius: number;
	detail?: CollisionDetailLevel;
}

export interface CylinderShapeJSON extends CollisionShapeJSON {
	type: "cylinder";
	radius: number;
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

export interface CapsuleShapeJSON extends CollisionShapeJSON {
	type: "capsule";
	radius: number;
	height: number;
	axis: CollisionAxis;
	detail?: CollisionDetailLevel;
}

export interface ConvexHullShapeJSON extends CollisionShapeJSON {
	type: "convexHull";
}

export interface MeshShapeJSON extends CollisionShapeJSON {
	type: "mesh";
}

export interface NoneShapeJSON extends CollisionShapeJSON {
	type: "none";
}

export type AnyShapeJSON = 
	| CubeShapeJSON 
	| SphereShapeJSON 
	| CylinderShapeJSON 
	| CapsuleShapeJSON 
	| ConvexHullShapeJSON
	| MeshShapeJSON 
	| NoneShapeJSON;

/**
 * 碰撞体网格
 * 管理碰撞体的可视化网格和形状配置
 */
export interface ICollisionMesh {
	//网格名称
	readonly name: string;
	//碰撞体类型
	readonly type: CollisionMeshType;
	//碰撞形状对象
	shape: ICollisionShape;
	//是否为触发器
	isTrigger: boolean;	
	//设置碰撞体类型并创建相应的几何体 
	setType(type: CollisionMeshType, sourceMesh: AbstractMesh, useAutoSize?: boolean): Promise<void>;	
	//更新碰撞体形状
	updateShape(shape: ICollisionShape): void;	
	//重建几何体(当形状参数改变时)
	rebuildGeometry(): void;	
	//更新实例(同步源网格的实例)
	updateInstances(sourceMesh: AbstractMesh): void;	
	//销毁碰撞体及其资源
	dispose(): void;
}

/**
 * 碰撞体网格配置
 */
export interface CollisionMeshConfig {
	//网格名称
	name: string;
	//场景对象
	scene: Scene;
	//父网格
	parent?: AbstractMesh | null;
	//初始形状
	initialShape?: ICollisionShape;
}

/**
 * 碰撞体创建配置
 */
export interface CollisionShapeConfig {
	//碰撞体类型
	type: CollisionMeshType;
	//中心点
	center?: Vector3;
	//是否自动计算尺寸
	autoSize?: boolean;
	//源网格(用于计算自动尺寸的)
	sourceMesh?: AbstractMesh;
}


export function isCubeShape(shape: ICollisionShape): shape is ICubeShape {
	return shape.type === "cube";
}

export function isSphereShape(shape: ICollisionShape): shape is ISphereShape {
	return shape.type === "sphere";
}

export function isCylinderShape(shape: ICollisionShape): shape is ICylinderShape {
	return shape.type === "cylinder";
}

export function isCapsuleShape(shape: ICollisionShape): shape is ICapsuleShape {
	return shape.type === "capsule";
}

export function isConvexHullShape(shape: ICollisionShape): shape is IConvexHullShape {
	return shape.type === "convexHull";
}

export function isMeshShape(shape: ICollisionShape): shape is IMeshShape {
	return shape.type === "mesh";
}

export function isNoneShape(shape: ICollisionShape): shape is INoneShape {
	return shape.type === "none";
}
