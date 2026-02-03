import {
	Scene,
	AbstractMesh,
	PhysicsShape,
	PhysicsShapeMesh,
	PhysicsShapeConvexHull,
	PhysicsBody,
	PhysicsMotionType as BabylonPhysicsMotionType,
	Mesh,
	Tools,
	Vector3,
} from "@babylonjs/core";
import { RigidBodyJSON, PhysicsMotionType } from "./rigidbody";
import { UniqueNumber } from "@/tools/guards/tools";
import { CollisionShapeFactory } from "./collision/factory";
import { MeshCollisionShape, ConvexHullCollisionShape } from "./collision/shapes";

/**
 * 运行时物理工厂
 * 
 * 负责将编辑器中配置的碰撞器和刚体转换为 Babylon.js 运行时物理对象
 * 
 * 核心原理：
 *  编辑器中：CollisionMesh 作为 sourceMesh 的子节点，继承父节点缩放
 *  运行时：PhysicsShapeMesh 固化顶点数据，需要手动应用源网格缩放
 *  不同形状类型有不同的缩放策略以保持几何特征（如球体保持球形）
 * 
 * - convexHull: 使用 PhysicsShapeConvexHull + 原始源网格
 * - 其他类型: 使用 PhysicsShapeMesh + 重新生成的几何体
 */
export class RuntimePhysicsFactory {
	
	// ==================== 公共方法 ====================
	
	/**
	 * 从编辑器的 collisionMesh 数据创建物理网格
	 * 
	 * @param collisionMeshData - 编辑器中的碰撞体配置数据
	 * @param sourceMesh - 源网格对象
	 * @param scene - 场景对象
	 * @returns 物理网格或 null
	 * 
	 * @public 公开此方法以便调试和可视化使用
	 */
	static async getCollisionMeshForPhysics(
		collisionMeshData: any,
		sourceMesh: AbstractMesh,
		scene: Scene
	): Promise<Mesh | null> {
		try {
			const shapeData = collisionMeshData.shape;
			if (!shapeData) {
				return null;
			}
			
			if (shapeData.type === "mesh") {
				return this._validateAndReturnSourceMesh(sourceMesh);
			}
			
			const shape = this._deserializeShape(shapeData);
			//convexHull 和 mesh 类型需要特殊处理
			if (shape instanceof ConvexHullCollisionShape || shape instanceof MeshCollisionShape) {
				return null;
			}
			
			//创建并配置物理网格
			return this._createPhysicsMeshFromShape(shape, sourceMesh, scene);
			
		} catch (error) {
			console.error(`创建碰撞器网格失败 ${sourceMesh.name}:`, error);
			return null;
		}
	}
	
	/**
	 * 创建物理形状对象
	 * 
	 * @param collisionMeshData - 碰撞体配置数据
	 * @param sourceMesh - 源网格对象
	 * @param scene - 场景对象
	 * @returns PhysicsShape 实例或 null
	 */
	static async createPhysicsShape(
		collisionMeshData: any,
		sourceMesh: AbstractMesh,
		scene: Scene
	): Promise<PhysicsShape | null> {
		try {
			const shapeType = collisionMeshData.shape?.type;
			if (!shapeType || shapeType === "none") {
				return null;
			}

			//convexHull 使用 Babylon.js 内置的凸包算法
			if (shapeType === "convexHull") {
				return this._createConvexHullShape(sourceMesh, scene);
			}

			//其他类型使用网格形状
			const collisionMesh = await this.getCollisionMeshForPhysics(collisionMeshData, sourceMesh, scene);
			if (!collisionMesh) {
				return null;
			}
			
			return this._createMeshShape(collisionMesh, sourceMesh, scene);
			
		} catch (error) {
			console.error("创建物理形状失败:", error);
			return null;
		}
	}
	
	/**
	 * 创建完整的物理刚体
	 * 
	 * @param mesh - 网格对象
	 * @param collisionMeshData - 碰撞体配置数据
	 * @param rigidbodyJSON - 刚体属性配置
	 * @returns PhysicsBody 实例或 null
	 */
	static async createPhysicsBody(
		mesh: AbstractMesh,
		collisionMeshData: any,
		rigidbodyJSON: RigidBodyJSON,
		isTrigger: boolean,
		scene: Scene
	): Promise<PhysicsBody | null> {
		const shape = await this.createPhysicsShape(collisionMeshData, mesh, scene);
		if (!shape) {
			return null;
		}

		const motionType = this._convertMotionType(rigidbodyJSON.motionType);
		const body = new PhysicsBody(mesh, motionType, false, scene);
		body.shape = shape;

		this._configureBodyProperties(body, rigidbodyJSON);
		this._configureMaterial(shape, rigidbodyJSON);
		
		if (isTrigger) {
			shape.isTrigger = true;
		}

		return body;
	}
	
	/**
	 * 从网格的 metadata 初始化物理
	 * 
	 * @param mesh - 网格对象
	 * @param scene - 场景对象
	 * @returns PhysicsBody 实例或 null
	 */
	static async initializeFromMetadata(
		mesh: AbstractMesh,
		scene: Scene
	): Promise<PhysicsBody | null> {
		const collisionMeshData = (mesh as any).collisionMesh;
		const rigidbodyConfig = mesh.metadata?.rigidbody;

		if (!collisionMeshData?.shape || !rigidbodyConfig) {
			return null;
		}

		const isTrigger = collisionMeshData.isTrigger === true;
		return this.createPhysicsBody(mesh, collisionMeshData, rigidbodyConfig, isTrigger, scene);
	}
	
	/**
	 * 验证并返回源网格（用于 mesh 类型碰撞体）
	 */
	private static _validateAndReturnSourceMesh(sourceMesh: AbstractMesh): Mesh | null {
		if (sourceMesh.getClassName() !== "Mesh") {
			console.warn("网格碰撞体必须要有[Mesh],", sourceMesh.getClassName());
			return null;
		}
		return sourceMesh as Mesh;
	}
	
	/**
	 * 反序列化 shape 数据
	 * 兼容编辑器会话中的对象和序列化后的 JSON
	 */
	private static _deserializeShape(shapeData: any): any {
		//检查是否已经是 shape 对象
		if (shapeData.center && typeof shapeData.center.x === 'number') {
			return shapeData;
		}
		//否则从 JSON 反序列化
		return CollisionShapeFactory.fromJSON(shapeData);
	}
	
	/**
	 * 从 shape 对象创建物理网格
	 */
	private static _createPhysicsMeshFromShape(
		shape: any,
		sourceMesh: AbstractMesh,
		scene: Scene
	): Mesh {
		//创建几何体（胶囊需要父节点缩放信息来烘焙轴向缩放）
		const sourceScaling = sourceMesh.scaling;
		const geometry = shape.type === 'capsule' 
			? shape.createGeometry(scene, sourceScaling)
			: shape.createGeometry(scene);
		
		//创建临时网格
		const tempMesh = new Mesh(`${sourceMesh.name}_physics`, scene);
		tempMesh.id = Tools.RandomId();
		tempMesh.uniqueId = UniqueNumber.Get();
		
		//应用几何体和 shape 变换
		geometry.applyToMesh(tempMesh);
		shape.applyToMesh(tempMesh);
		
		//根据形状类型应用源网格缩放
		this._applySourceScaling(tempMesh, shape, sourceScaling);
		
		//烘焙变换到顶点并重置变换矩阵
		this._bakeAndResetTransform(tempMesh);
		
		return tempMesh;
	}
	
	/**
	 * 根据形状类型应用源网格缩放
	 * @description 将编辑器中的缩放应用到运行时物理网格
	 * @param tempMesh - 临时物理网格
	 * @param shape - 碰撞形状对象
	 * @param sourceScaling - 源网格的缩放
	 * @private
	 * 
	 * @remarks
	 * **不同形状的缩放策略：**
	 * - **cube**: 支持非均匀缩放（每个轴独立）
	 * - **sphere**: 取最大缩放值保持球形（避免椭球）
	 * - **cylinder**: 圆形截面保持正圆，高度方向独立缩放
	 * - **capsule**: 圆形部分保持正圆，轴向缩放已烘焙进几何体
	 * 
	 * 编辑器中碰撞体继承父节点缩放，运行时需要固化到顶点数据
	 */
	private static _applySourceScaling(
		tempMesh: Mesh,
		shape: any,
		sourceScaling: Vector3
	): void {
		const shapeType = shape.type;
		
		if (shapeType === 'cube') {
			this._applyCubeScaling(tempMesh, sourceScaling);
		} else if (shapeType === 'sphere') {
			this._applySphereScaling(tempMesh, sourceScaling);
		} else if (shapeType === 'cylinder') {
			this._applyCylinderScaling(tempMesh, shape, sourceScaling);
		} else if (shapeType === 'capsule') {
			this._applyCapsuleScaling(tempMesh, shape, sourceScaling);
		}
	}
	
	/**
	 * 应用立方体缩放
	 * @description 直接乘以源网格缩放，支持非均匀缩放
	 * @private
	 */
	private static _applyCubeScaling(tempMesh: Mesh, sourceScaling: Vector3): void {
		tempMesh.scaling.multiplyInPlace(sourceScaling);
		tempMesh.position.multiplyInPlace(sourceScaling);
	}
	
	/**
	 * 应用球体缩放
	 * @description 取最大缩放值保持球形（避免椭球导致的物理不准确）
	 * @private
	 */
	private static _applySphereScaling(tempMesh: Mesh, sourceScaling: Vector3): void {
		const maxScale = Math.max(sourceScaling.x, sourceScaling.y, sourceScaling.z);
		tempMesh.scaling.scaleInPlace(maxScale);
		tempMesh.position.scaleInPlace(maxScale);
	}
	
	/**
	 * 应用圆柱缩放
	 * @description 圆形截面保持正圆，高度方向独立缩放
	 * @private
	 * 
	 * @remarks
	 * Babylon.js 变换顺序：Scale -> Rotate -> Translate
	 * 几何体是 Y 轴圆柱，缩放在本地坐标系应用（X,Z=直径，Y=高度）
	 */
	private static _applyCylinderScaling(
		tempMesh: Mesh,
		shape: any,
		sourceScaling: Vector3
	): void {
		const axis = shape.axis || 'y';
		const { diameterScale, heightScale } = this._getCylinderScales(axis, sourceScaling);
		
		//在本地坐标系中应用缩放（Y轴圆柱：X,Z=圆，Y=高度）
		const currentScaling = tempMesh.scaling.clone();
		tempMesh.scaling.set(
			currentScaling.x * diameterScale,
			currentScaling.y * heightScale,
			currentScaling.z * diameterScale
		);
		tempMesh.position.multiplyInPlace(sourceScaling);
	}
	
	/**
	 * 应用胶囊缩放
	 * @description 圆形部分保持正圆，轴向缩放已烘焙进几何体
	 * @private
	 * 
	 * @remarks
	 * 胶囊几何体在创建时已烘焙轴向缩放，这里只需应用半径缩放
	 * 几何体是 radius=1 的归一化胶囊，需要缩放到目标世界半径
	 */
	private static _applyCapsuleScaling(
		tempMesh: Mesh,
		shape: any,
		sourceScaling: Vector3
	): void {
		const axis = shape.axis || 'y';
		const safeRadius = Math.max(shape.radius, 1e-4);
		const diameterScale = this._getMaxDiameterScale(axis, sourceScaling);
		
		//统一缩放到目标世界半径
		const targetWorldRadius = safeRadius * diameterScale;
		tempMesh.scaling.setAll(targetWorldRadius);
		tempMesh.position.multiplyInPlace(sourceScaling);
	}
	
	/**
	 * 获取圆柱的直径和高度缩放
	 */
	private static _getCylinderScales(
		axis: string,
		sourceScaling: Vector3
	): { diameterScale: number; heightScale: number } {
		switch (axis) {
			case 'x':
				return {
					diameterScale: Math.max(sourceScaling.y, sourceScaling.z),
					heightScale: sourceScaling.x
				};
			case 'y':
				return {
					diameterScale: Math.max(sourceScaling.x, sourceScaling.z),
					heightScale: sourceScaling.y
				};
			case 'z':
				return {
					diameterScale: Math.max(sourceScaling.x, sourceScaling.y),
					heightScale: sourceScaling.z
				};
			default:
				return { diameterScale: 1, heightScale: 1 };
		}
	}
	
	/**
	 * 获取垂直于轴向平面的最大缩放（用于保持圆形）
	 */
	private static _getMaxDiameterScale(axis: string, sourceScaling: Vector3): number {
		switch (axis) {
			case 'x':
				return Math.max(sourceScaling.y, sourceScaling.z);
			case 'y':
				return Math.max(sourceScaling.x, sourceScaling.z);
			case 'z':
				return Math.max(sourceScaling.x, sourceScaling.y);
			default:
				return 1;
		}
	}
	
	/**
	 * 烘焙变换到顶点并重置变换矩阵
	 */
	private static _bakeAndResetTransform(tempMesh: Mesh): void {
		tempMesh.bakeCurrentTransformIntoVertices();
		
		if (tempMesh.parent) {
			tempMesh.parent = null;
		}
		
		tempMesh.position.setAll(0);
		tempMesh.rotation.setAll(0);
		tempMesh.scaling.setAll(1);
		tempMesh.rotationQuaternion = null;
		
		tempMesh.refreshBoundingInfo();
		tempMesh.computeWorldMatrix(true);
	}
	
	/**
	 * 创建凸包形状
	 * @description 使用 Babylon.js 内置的凸包算法
	 * @private
	 */
	private static _createConvexHullShape(
		sourceMesh: AbstractMesh,
		scene: Scene
	): PhysicsShape | null {
		if (sourceMesh.getClassName() !== "Mesh") {
			console.warn("[RuntimePhysicsFactory] 凸包形状必须依赖[Mesh]:", sourceMesh.getClassName());
			return null;
		}
		return new PhysicsShapeConvexHull(sourceMesh as any, scene);
	}
	
	/**
	 * 创建网格形状并处理临时网格清理
	 * PhysicsShapeMesh 构造时同步复制顶点数据
	 */
	private static _createMeshShape(
		collisionMesh: Mesh,
		sourceMesh: AbstractMesh,
		scene: Scene
	): PhysicsShape {
		const physicsShape = new PhysicsShapeMesh(collisionMesh, scene);
		
		if (collisionMesh !== sourceMesh) {
			collisionMesh.dispose(false, true);
		}
		return physicsShape;
	}
	
	/**
	 * 转换运动类型枚举
	 * 将编辑器的运动类型转换为 Babylon.js 的枚举值
	 * 
	 * @remarks
	 *  static -> STATIC: 静态物体，不受力影响
	 *  dynamic -> DYNAMIC: 动态物体，完全受物理模拟控制
	 *  kinematic -> ANIMATED: 运动学物体，可通过代码控制但不受力影响
	 */
	private static _convertMotionType(motionType: PhysicsMotionType): number {
		switch (motionType) {
			case "static":
				return BabylonPhysicsMotionType.STATIC;
			case "dynamic":
				return BabylonPhysicsMotionType.DYNAMIC;
			case "kinematic":
				return BabylonPhysicsMotionType.ANIMATED;
			default:
				return BabylonPhysicsMotionType.DYNAMIC;
		}
	}
	
	/**
	 * 配置刚体物理属性
	 * 设置质量、阻尼、重力等动力学参数
	 */
	private static _configureBodyProperties(
		body: PhysicsBody,
		config: RigidBodyJSON
	): void {
		//设置质量（静态物体无需质量）
		if (config.motionType !== "static") {
			body.setMassProperties({ mass: config.mass });
		}
		
		//设置线性和角阻尼
		body.setLinearDamping(config.linearDamping);
		body.setAngularDamping(config.angularDamping);
		
		//设置重力
		if (config.useGravity) {
			body.setGravityFactor(1);
			body.disablePreStep = false;
		} else {
			body.setGravityFactor(0);
			body.disablePreStep = true;  //禁用重力时跳过预处理步骤
		}
	}
	
	/**
	 * 配置物理材质
	 * @description 设置摩擦力和弹性系数
	 * @private
	 */
	private static _configureMaterial(
		shape: PhysicsShape,
		config: RigidBodyJSON
	): void {
		shape.material = {
			friction: config.material.friction,        //摩擦力系数 (0-1)
			restitution: config.material.restitution,  //弹性系数 (0-1)
		};
	}
}
