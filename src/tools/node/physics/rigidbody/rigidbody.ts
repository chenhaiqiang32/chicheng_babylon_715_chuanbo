import { AbstractMesh } from "@babylonjs/core";
import {
	IRigidBody,
	IRigidBodyProperties,
	RigidBodyJSON,
	DEFAULT_RIGIDBODY_PROPERTIES,
} from "./types";

/**
 * 刚体类
 * 
 * 管理网格的物理属性（编辑器阶段），包括：
 * - 运动类型（静态/动态/运动学）
 * - 质量和阻尼
 * - 重力和物理材质
 * 
 * 属性自动保存到网格的 metadata 中，运行时可通过 RuntimePhysicsFactory 转换为物理对象
 */
export class RigidBody implements IRigidBody {
	/** 所属网格 */
	public readonly mesh: AbstractMesh;
	
	/** 刚体属性 */
	public properties: IRigidBodyProperties;

	constructor(mesh: AbstractMesh, properties?: Partial<IRigidBodyProperties>) {
		this.mesh = mesh;
		this.properties = {
			...DEFAULT_RIGIDBODY_PROPERTIES,
			...properties,
		};
		this._saveToMetadata();
	}

	/**
	 * 保存到网格的 metadata
	 */
	private _saveToMetadata(): void {
		this.mesh.metadata = this.mesh.metadata || {};
		this.mesh.metadata.rigidbody = this.toJSON();
	}

	/**
	 * 从网格的 metadata 加载刚体配置
	 * @returns 刚体实例，如果 metadata 中没有配置则返回 null
	 */
	static fromMetadata(mesh: AbstractMesh): RigidBody | null {
		if (mesh.metadata?.rigidbody) {
			const data = mesh.metadata.rigidbody;
			// 直接使用 metadata 中的数据创建，避免覆盖
			const rb = new RigidBody(mesh, {
				motionType: data.motionType,
				mass: data.mass,
				linearDamping: data.linearDamping,
				angularDamping: data.angularDamping,
				useGravity: data.useGravity,
				material: {
					friction: data.material.friction,
					restitution: data.material.restitution,
				},
			});
			return rb;
		}
		return null;
	}

	/**
	 * 序列化为 JSON
	 */
	toJSON(): RigidBodyJSON {
		return {
			motionType: this.properties.motionType,
			mass: this.properties.mass,
			linearDamping: this.properties.linearDamping,
			angularDamping: this.properties.angularDamping,
			useGravity: this.properties.useGravity,
			material: {
				friction: this.properties.material.friction,
				restitution: this.properties.material.restitution,
			},
		};
	}

	/**
	 * 从 JSON 反序列化
	 */
	fromJSON(data: RigidBodyJSON): void {
		this.properties = {
			motionType: data.motionType,
			mass: data.mass,
			linearDamping: data.linearDamping,
			angularDamping: data.angularDamping,
			useGravity: data.useGravity,
			material: {
				friction: data.material.friction,
				restitution: data.material.restitution,
			},
		};
		this._saveToMetadata();
	}

	/**
	 * 克隆刚体对象
	 */
	clone(): RigidBody {
		return new RigidBody(this.mesh, { ...this.properties });
	}

	/**
	 * 更新属性并保存到 metadata
	 */
	updateProperties(properties: Partial<IRigidBodyProperties>): void {
		this.properties = {
			...this.properties,
			...properties,
		};
		this._saveToMetadata();
	}

	/**
	 * 设置运动类型
	 * 静态物体自动禁用重力
	 */
	setMotionType(type: "static" | "dynamic" | "kinematic"): void {
		this.properties.motionType = type;
		
		if (type === "static") {
			this.properties.useGravity = false;
		}
		
		this._saveToMetadata();
	}

	/**
	 * 设置质量（最小值 0.001kg）
	 */
	setMass(mass: number): void {
		this.properties.mass = Math.max(0.001, mass);
		this._saveToMetadata();
	}

	/**
	 * 设置摩擦力（范围 0-1）
	 */
	setFriction(friction: number): void {
		this.properties.material.friction = Math.max(0, Math.min(1, friction));
		this._saveToMetadata();
	}

	/**
	 * 设置弹性系数（范围 0-1）
	 */
	setRestitution(restitution: number): void {
		this.properties.material.restitution = Math.max(0, Math.min(1, restitution));
		this._saveToMetadata();
	}
}
