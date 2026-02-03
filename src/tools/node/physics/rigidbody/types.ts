import { AbstractMesh } from "@babylonjs/core";
import { AnyShapeJSON } from "../collision";

/**
 * 物理运动类型
 * static: 静态物体，不受力影响，不移动
 * dynamic: 动态物体，受力影响，参与物理模拟
 * kinematic: 运动学物体，可通过代码控制移动，不受力影响
 */
export type PhysicsMotionType = "static" | "dynamic" | "kinematic";

/**
 * 物理材质属性
 */
export interface IPhysicsMaterial {
	//摩擦力系数 (0-1，0=无摩擦，1=最大摩擦)
	friction: number;
	//弹性系数/恢复系数 (0-1，0=完全非弹性，1=完全弹性) 
	restitution: number;
}

/**
 * 刚体属性接口
 */
export interface IRigidBodyProperties {
	//物理运动类型
	motionType: PhysicsMotionType;	
	//质量 (kg)，仅动态物体使用
	mass: number;
	//线性阻尼 (0-1，值越大速度衰减越快)
	linearDamping: number;
	//角阻尼 (0-1，值越大旋转速度衰减越快)
	angularDamping: number;
	//是否启用重力
	useGravity: boolean;
	//物理材质
	material: IPhysicsMaterial;
}

export interface RigidBodyJSON {
	motionType: PhysicsMotionType;
	mass: number;
	linearDamping: number;
	angularDamping: number;
	useGravity: boolean;
	material: {
		friction: number;
		restitution: number;
	};
}

/**
 * 完整物理配置（碰撞器 + 刚体）
 */
export interface PhysicsConfigJSON {
	//碰撞器配置
	collider: AnyShapeJSON;
	//刚体配置
	rigidbody: RigidBodyJSON;
}

/**
 * 默认物理材质
 * 摩擦力和弹性
 */
export const DEFAULT_PHYSICS_MATERIAL: IPhysicsMaterial = {
	friction: 0.5,       
	restitution: 0.3,    
};

/**
 * 默认刚体属性
 */
export const DEFAULT_RIGIDBODY_PROPERTIES: IRigidBodyProperties = {
	motionType: "dynamic",    
	mass: 1.0,                
	linearDamping: 0.01,      
	angularDamping: 0.01,     
	useGravity: true,         
	material: { ...DEFAULT_PHYSICS_MATERIAL },
};

export function isStaticBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "static";
}

export function isDynamicBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "dynamic";
}

export function isKinematicBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "kinematic";
}

/**
 * 刚体接口
 */
export interface IRigidBody {
	//所属网格
	readonly mesh: AbstractMesh;
	//刚体属性
	properties: IRigidBodyProperties;
	toJSON(): RigidBodyJSON;
	fromJSON(data: RigidBodyJSON): void;
	clone(): IRigidBody;
}
