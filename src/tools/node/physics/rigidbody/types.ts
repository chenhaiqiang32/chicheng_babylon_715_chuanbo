import { AbstractMesh } from "@babylonjs/core";
import { AnyShapeJSON } from "../collision";

// ==================== 物理运动类型 ====================
/**
 * 物理运动类型
 * - static: 静态物体，不受力影响，不移动
 * - dynamic: 动态物体，受力影响，参与物理模拟
 * - kinematic: 运动学物体，可通过代码控制移动，不受力影响
 */
export type PhysicsMotionType = "static" | "dynamic" | "kinematic";

// ==================== 物理材质属性 ====================
/**
 * 物理材质属性
 */
export interface IPhysicsMaterial {
	/** 摩擦力系数 (0-1，0=无摩擦，1=最大摩擦) */
	friction: number;
	
	/** 弹性系数/恢复系数 (0-1，0=完全非弹性，1=完全弹性) */
	restitution: number;
}

// ==================== 刚体属性 ====================
/**
 * 刚体属性接口
 */
export interface IRigidBodyProperties {
	/** 运动类型 */
	motionType: PhysicsMotionType;
	
	/** 质量 (kg)，仅动态物体使用 */
	mass: number;
	
	/** 线性阻尼 (0-1，值越大速度衰减越快) */
	linearDamping: number;
	
	/** 角阻尼 (0-1，值越大旋转速度衰减越快) */
	angularDamping: number;
	
	/** 是否启用重力 */
	useGravity: boolean;
	
	/** 物理材质 */
	material: IPhysicsMaterial;
}

// ==================== JSON 序列化 ====================
/**
 * 刚体 JSON 序列化格式
 */
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
	/** 碰撞器配置 */
	collider: AnyShapeJSON;
	
	/** 刚体配置 */
	rigidbody: RigidBodyJSON;
}

// ==================== 默认值 ====================
/**
 * 默认物理材质
 */
export const DEFAULT_PHYSICS_MATERIAL: IPhysicsMaterial = {
	friction: 0.5,       // 中等摩擦力
	restitution: 0.3,    // 轻微弹性
};

/**
 * 默认刚体属性
 */
export const DEFAULT_RIGIDBODY_PROPERTIES: IRigidBodyProperties = {
	motionType: "dynamic",    // 动态物体
	mass: 1.0,                // 1kg
	linearDamping: 0.01,      // 轻微线性阻尼
	angularDamping: 0.01,     // 轻微角阻尼
	useGravity: true,         // 启用重力
	material: { ...DEFAULT_PHYSICS_MATERIAL },
};

// ==================== 类型守卫 ====================
/**
 * 判断是否为静态刚体
 */
export function isStaticBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "static";
}

/**
 * 判断是否为动态刚体
 */
export function isDynamicBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "dynamic";
}

/**
 * 判断是否为运动学刚体
 */
export function isKinematicBody(props: IRigidBodyProperties): boolean {
	return props.motionType === "kinematic";
}

// ==================== 刚体接口 ====================
/**
 * 刚体接口
 */
export interface IRigidBody {
	/** 所属网格 */
	readonly mesh: AbstractMesh;
	
	/** 刚体属性 */
	properties: IRigidBodyProperties;
	
	/** 序列化为JSON */
	toJSON(): RigidBodyJSON;
	
	/** 从JSON反序列化 */
	fromJSON(data: RigidBodyJSON): void;
	
	/** 克隆 */
	clone(): IRigidBody;
}
