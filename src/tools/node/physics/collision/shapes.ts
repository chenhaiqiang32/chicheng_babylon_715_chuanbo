import {
	AbstractMesh,
	CreateBoxVertexData,
	CreateCapsuleVertexData,
	CreateCylinderVertexData,
	CreateSphereVertexData,
	Geometry,
	Mesh,
	Scene,
	Tools,
	Vector3,
	VertexData,
} from "@babylonjs/core";
import { UniqueNumber } from "@/tools/guards/tools";
import {
	CollisionMeshType,
	CollisionAxis,
	ICollisionShape,
	ICubeShape,
	ISphereShape,
	ICylinderShape,
	ICapsuleShape,
	IConvexHullShape,
	IMeshShape,
	INoneShape,
	CollisionShapeJSON,
	CubeShapeJSON,
	SphereShapeJSON,
	CylinderShapeJSON,
	CapsuleShapeJSON,
	ConvexHullShapeJSON,
	MeshShapeJSON,
	NoneShapeJSON,
	CollisionDetailLevel,
} from "./types";
import {
	getAxisRotation,
	vectorToArray,
	arrayToVector,
} from "./utils";
import QuickHull from "quickhull3d";

/**
 * 可视化细分配置常量
 * 影响碰撞体网格的精度
 */
const VISUALIZATION_DETAIL = {
	SPHERE: { low: 12, medium: 18, high: 32 },
	CYLINDER: { low: 12, medium: 24, high: 48 },
	CAPSULE: {
		low: { tessellation: 12, capSubdivisions: 6 },
		medium: { tessellation: 24, capSubdivisions: 12 },
		high: { tessellation: 32, capSubdivisions: 16 },
	},
} as const;

/**
 * 根据细分级别获取球体分段数
 * 球体的经纬线分段数
 */
function getSphereSegments(detail: CollisionDetailLevel | undefined): number {
	return VISUALIZATION_DETAIL.SPHERE[detail || "medium"];
}

/**
 * 根据细分级别获取圆柱体细分数
 * 圆柱体圆周的细分数
 */
function getCylinderTessellation(detail: CollisionDetailLevel | undefined): number {
	return VISUALIZATION_DETAIL.CYLINDER[detail || "medium"];
}

/**
 * 根据细分级别获取胶囊体细分配置
 * 胶囊体的圆周和端盖细分数配置
 */
function getCapsuleTessellation(detail: CollisionDetailLevel | undefined): { tessellation: number; capSubdivisions: number } {
	return VISUALIZATION_DETAIL.CAPSULE[detail || "medium"];
}

/**
 * 碰撞体形状抽象基类
 * 提供所有碰撞形状的通用接口和基础实现
 */
abstract class CollisionShapeBase implements ICollisionShape {
	//形状
	public readonly type: CollisionMeshType;	
	//形状在本地空间的中心点(不包括缩放)
	public center: Vector3;

	constructor(type: CollisionMeshType, center: Vector3 = Vector3.Zero()) {
		this.type = type;
		this.center = center.clone();
	}

	//根据源网格的包围盒自动计算碰撞体尺寸
	abstract calculateAutoSize(sourceMesh: AbstractMesh): void;	

	/**
	 * 创建碰撞体几何体	 
	 * @param parentScale 父节点的世界缩放
	 */

	abstract createGeometry(scene: Scene, parentScale?: Vector3): Geometry;	
	/**
	 * 将形状参数应用到网格(设置位置、旋转、缩放)
	 * @param mesh - 目标网格对象
	 */

	abstract applyToMesh(mesh: AbstractMesh): void;	

	//深拷贝
	abstract clone(): ICollisionShape;
	abstract toJSON(): CollisionShapeJSON;
}

/**
 * 无碰撞体形状
 * 物体不参与碰撞检测，用于禁用物理碰撞
 */
export class NoneCollisionShape extends CollisionShapeBase implements INoneShape {
	public readonly type = "none" as const;

	constructor(center: Vector3 = Vector3.Zero()) {
		super("none", center);
	}

	calculateAutoSize(_sourceMesh: AbstractMesh): void {

	}

	createGeometry(_scene: Scene, _parentScale?: Vector3): Geometry {
		throw new Error("无碰撞体类型不可创建几何体");
	}

	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		mesh.scaling.setAll(1);
	}

	clone(): NoneCollisionShape {
		return new NoneCollisionShape(this.center.clone());
	}

	toJSON(): NoneShapeJSON {
		return {
			type: "none",
			center: vectorToArray(this.center),
		};
	}

	/**
	 * 从JSON数据反序列化创建实例
	 * @param data - JSON 数据对象
	 * @returns 新的 NoneCollisionShape 实例
	 */
	static fromJSON(data: NoneShapeJSON): NoneCollisionShape {
		return new NoneCollisionShape(arrayToVector(data.center));
	}
}

/**
 * 长方体碰撞体形状
 * 使用三维尺寸向量定义宽高深
 */
export class CubeCollisionShape extends CollisionShapeBase implements ICubeShape {
	public readonly type = "cube" as const;
	//尺寸x,y,z
	public size: Vector3;

	constructor(center: Vector3 = Vector3.Zero(), size: Vector3 = Vector3.One()) {
		super("cube", center);
		this.size = size.clone();
	}

	/**
	 * 根据源网格的包围盒自动计算立方体尺寸
	 * @description 使用本地空间的包围盒，碰撞体作为子节点会自动继承父节点的变换
	 */
	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,//变形
			applySkeleton: true,//骨架
		});

		const bb = sourceMesh.getBoundingInfo();
		this.center = bb.boundingBox.center.clone();
		this.size = bb.boundingBox.extendSize.scale(2);
	}

	/**
	 * 创建单位立方体几何体
	 * @description 创建边长为1的立方体，实际尺寸通过 applyToMesh 中的缩放实现
	 */
	createGeometry(scene: Scene, _parentScale?: Vector3): Geometry {
		return new Geometry(
			Tools.RandomId(),
			scene,
			CreateBoxVertexData({ size: 1 })
		);
	}

	/**
	 * 应用立方体变换到网格
	 * @description 设置位置为中心点，缩放为目标尺寸
	 */
	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		mesh.scaling.copyFrom(this.size);
	}

	clone(): CubeCollisionShape {
		return new CubeCollisionShape(
			this.center.clone(),
			this.size.clone()
		);
	}

	toJSON(): CubeShapeJSON {
		return {
			type: "cube",
			center: vectorToArray(this.center),
			size: vectorToArray(this.size),
		};
	}

	/**
	 * 从 JSON 数据反序列化创建实例
	 * @param data - JSON 数据对象
	 * @returns 新的 CubeCollisionShape 实例
	 */
	static fromJSON(data: CubeShapeJSON): CubeCollisionShape {
		return new CubeCollisionShape(
			arrayToVector(data.center),
			arrayToVector(data.size)
		);
	}
}

/**
 * 球体碰撞体形状
 * 使用半径定义球体大小，支持非等比缩放时保持正圆
 */
export class SphereCollisionShape extends CollisionShapeBase implements ISphereShape {
	public readonly type = "sphere" as const;
	public radius: number;
	public detail: CollisionDetailLevel;

	constructor(
		center: Vector3 = Vector3.Zero(),
		radius: number = 0.5,
		detail: CollisionDetailLevel = "medium",
	) {
		super("sphere", center);
		this.radius = radius;
		this.detail = detail;
	}

	/**
	 * 根据源网格的包围盒自动计算球体半径
	 * 使用最大半径确保球体能完全包裹住物体
	 */
	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,
			applySkeleton: true,
		});

		const bb = sourceMesh.getBoundingInfo();
		this.center = bb.boundingBox.center.clone();
		
		const extendSize = bb.boundingBox.extendSize;
		this.radius = Math.max(extendSize.x, extendSize.y, extendSize.z);
	}

	/**
	 * 创建单位球体几何体（直径为1）
	 * 实际大小通过 applyToMesh 中的缩放来实现
	 */
	createGeometry(scene: Scene, _parentScale?: Vector3): Geometry {
		const segments = getSphereSegments(this.detail);
		return new Geometry(
			Tools.RandomId(),
			scene,
			CreateSphereVertexData({
				diameter: 1,
				segments,
			})
		);
	}

	/**
	 * 应用球体变换到网格
	 * 支持非等比缩放时保持正圆（使用最大缩放）
	 */
	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		
		if (mesh.parent) {
			//获取父节点的世界缩放
			const parentWorldScale = (mesh.parent as AbstractMesh).absoluteScaling;
			const maxScale = Math.max(parentWorldScale.x, parentWorldScale.y, parentWorldScale.z);
			
			//计算局部缩放以实现目标世界大小
			const targetSize = this.radius * 2 * maxScale;
			mesh.scaling.set(
				targetSize / parentWorldScale.x,
				targetSize / parentWorldScale.y,
				targetSize / parentWorldScale.z
			);
		} else {
			mesh.scaling.setAll(this.radius * 2);
		}
	}

	clone(): SphereCollisionShape {
		return new SphereCollisionShape(
			this.center.clone(),
			this.radius,
			this.detail,
		);
	}

	toJSON(): SphereShapeJSON {
		return {
			type: "sphere",
			center: vectorToArray(this.center),
			radius: this.radius,
			detail: this.detail,
		};
	}

	static fromJSON(data: SphereShapeJSON): SphereCollisionShape {
		return new SphereCollisionShape(
			arrayToVector(data.center),
			data.radius,
			data.detail || "medium",
		);
	}
}

/**
 * 圆柱体碰撞体形状
 * 支持 X/Y/Z 三个轴向，使用内切圆半径确保圆柱在网格内部
 */
export class CylinderCollisionShape extends CollisionShapeBase implements ICylinderShape {
	public readonly type = "cylinder" as const;
	
	public radius: number;
	public height: number;
	public axis: CollisionAxis;
	public detail: CollisionDetailLevel;

	constructor(
		center: Vector3 = Vector3.Zero(),
		radius: number = 0.5,
		height: number = 1,
		axis: CollisionAxis = "y",
		detail: CollisionDetailLevel = "medium",
	) {
		super("cylinder", center);
		this.radius = radius;
		this.height = height;
		this.axis = axis;
		this.detail = detail;
	}

	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,
			applySkeleton: true,
		});

		const bb = sourceMesh.getBoundingInfo();
		//使用本地坐标，因为碰撞网格是源网格的子节点
		this.center = bb.boundingBox.center.clone();
		const boxSize = bb.boundingBox.extendSize.scale(2);

		switch (this.axis) {
			case "x":
				//使用内切圆半径，确保圆柱在网格内部
				this.radius = Math.min(boxSize.y, boxSize.z) / 2;
				this.height = boxSize.x;
				break;
			case "y":
				this.radius = Math.min(boxSize.x, boxSize.z) / 2;
				this.height = boxSize.y;
				break;
			case "z":
				this.radius = Math.min(boxSize.x, boxSize.y) / 2;
				this.height = boxSize.z;
				break;
		}
	}

	/**
	 * 创建Y轴单位圆柱几何体（高度和直径均为1）
	 * 实际方向和大小通过 applyToMesh 中的旋转和缩放来实现
	 */
	createGeometry(scene: Scene, _parentScale?: Vector3): Geometry {
		return new Geometry(
			Tools.RandomId(),
			scene,
			CreateCylinderVertexData({
				height: 1,
				diameter: 1,
				tessellation: getCylinderTessellation(this.detail),
			})
		);
	}

	/**
	 * 应用圆柱体变换到网格
	 * 先缩放，再旋转到目标轴向，支持非等比缩放时保持正圆截面
	 */
	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		
		if (mesh.parent && (mesh.parent as AbstractMesh).absoluteScaling) {
			const parentScale = (mesh.parent as AbstractMesh).absoluteScaling;
			
			//根据旋转后的轴向，确定圆在哪个平面，高度在哪个方向
			let diameterScales: [number, number];//圆所在平面的两个缩放
			let heightScale: number;//高度方向的缩放
			
			switch (this.axis) {
				case "x":
					//X轴圆柱：旋转后圆在YZ平面，高度在X方向
					diameterScales = [parentScale.y, parentScale.z];
					heightScale = parentScale.x;
					break;
				case "y":
					//Y轴圆柱：XZ平面，高度Y
					diameterScales = [parentScale.x, parentScale.z];
					heightScale = parentScale.y;
					break;
				case "z":
					//Z轴圆柱：XY平面，高度Z
					diameterScales = [parentScale.x, parentScale.y];
					heightScale = parentScale.z;
					break;
			}
			
			//圆形截面取最大缩放，保持正圆
			const maxDiameterScale = Math.max(...diameterScales);
			const targetWorldDiameter = this.radius * 2 * maxDiameterScale;
			const targetWorldHeight = this.height * heightScale;
			
			//几何体是Y轴圆柱（圆在XZ平面，高度在Y），需要根据旋转调整局部缩放
			//变换顺序：Scale -> Rotate -> Translate
			let localScaling: Vector3;
			
			switch (this.axis) {
				case "x":
					//绕Z旋转90°：局部X->世界Y, 局部Y->世界X, 局部Z->世界Z
					localScaling = new Vector3(
						targetWorldDiameter / parentScale.y,  //局部X（圆）->世界Y
						targetWorldHeight / parentScale.x,    //局部Y（高）->世界X
						targetWorldDiameter / parentScale.z   //局部Z（圆）->世界Z
					);
					break;
				case "y":
					//不旋转：局部X->世界X, 局部Y->世界Y, 局部Z->世界Z
					localScaling = new Vector3(
						targetWorldDiameter / parentScale.x,  //局部X（圆）->世界X
						targetWorldHeight / parentScale.y,    //局部Y（高）->世界Y
						targetWorldDiameter / parentScale.z   //局部Z（圆）->世界Z
					);
					break;
				case "z":
					//绕X旋转90°：局部X->世界X, 局部Y->世界Z, 局部Z->世界Y
					localScaling = new Vector3(
						targetWorldDiameter / parentScale.x,  //局部X（圆）->世界X
						targetWorldHeight / parentScale.z,    //局部Y（高）->世界Z
						targetWorldDiameter / parentScale.y   //局部Z（圆）->世界Y
					);
					break;
			}
			
			mesh.scaling.copyFrom(localScaling);
		} else {
			const diameter = this.radius * 2;
			mesh.scaling.set(diameter, this.height, diameter);
		}
		
		//最后设置旋转来控制轴向
		const rotation = getAxisRotation(this.axis);
		mesh.rotation.copyFrom(rotation);
	}

	clone(): CylinderCollisionShape {
		return new CylinderCollisionShape(
			this.center.clone(),
			this.radius,
			this.height,
			this.axis,
			this.detail,
		);
	}

	toJSON(): CylinderShapeJSON {
		return {
			type: "cylinder",
			center: vectorToArray(this.center),
			radius: this.radius,
			height: this.height,
			axis: this.axis,
			detail: this.detail,
		};
	}

	static fromJSON(data: CylinderShapeJSON): CylinderCollisionShape {
		return new CylinderCollisionShape(
			arrayToVector(data.center),
			data.radius,
			data.height,
			data.axis || "y",
			data.detail || "medium",
		);
	}
}

/**
 * 胶囊体碰撞体形状
 * 胶囊 = 圆柱 + 顶部半球 + 底部半球
 * 
 * @param height - 总高度（包括两个半球）
 * @param radius - 圆柱和两个半球的半径
 * 圆柱高度 = height - 2 * radius（当 height < 2*radius 时，圆柱高度为0）
 */
export class CapsuleCollisionShape extends CollisionShapeBase implements ICapsuleShape {
	public readonly type = "capsule" as const;
	public radius: number;
	public height: number;
	public axis: CollisionAxis;
	public detail: CollisionDetailLevel;

	constructor(
		center: Vector3 = Vector3.Zero(),
		radius: number = 0.5,
		height: number = 1,
		axis: CollisionAxis = "y",
		detail: CollisionDetailLevel = "medium",
	) {
		super("capsule", center);
		this.radius = radius;
		this.height = height;
		this.axis = axis;
		this.detail = detail;
	}

	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,
			applySkeleton: true,
		});

		const bb = sourceMesh.getBoundingInfo();
		this.center = bb.boundingBox.center.clone();
		const boxSize = bb.boundingBox.extendSize.scale(2);
		let axisLength: number;
		let otherDimensions: [number, number];

		switch (this.axis) {
			case "x":
				axisLength = boxSize.x;
				otherDimensions = [boxSize.y, boxSize.z];
				break;
			case "y":
				axisLength = boxSize.y;
				otherDimensions = [boxSize.x, boxSize.z];
				break;
			case "z":
				axisLength = boxSize.z;
				otherDimensions = [boxSize.x, boxSize.y];
				break;
		}

		//对于1*1*1的Box，高度应该是1，半径应该是0.5
		this.radius = Math.min(...otherDimensions) / 2;
		this.height = axisLength;
	}

	/**
	 * 创建胶囊体几何体
	 * 
	 * 策略：
	 * 1. 轴向和总高度烘焙进几何体（通过 orientation 和 height 参数）
	 * 2. 半径统一用 scaling 控制（创建 radius=1 的归一化胶囊体）
	 * 3. 父节点轴向缩放通过总高度生效，垂直缩放通过半径生效
	 * 4. 这样可以确保半球保持球形，轴向缩放只影响圆柱部分
	 */
	createGeometry(scene: Scene, parentScale?: Vector3): Geometry {
		const safeRadius = Math.max(this.radius, 1e-4);

		//计算父节点在轴向和垂直方向的缩放
		let axisScale = 1;
		let diameterScales: [number, number] = [1, 1];

		if (parentScale) {
			switch (this.axis) {
				case "x":
					axisScale = parentScale.x;
					diameterScales = [parentScale.y, parentScale.z];
					break;
				case "y":
					axisScale = parentScale.y;
					diameterScales = [parentScale.x, parentScale.z];
					break;
				case "z":
					axisScale = parentScale.z;
					diameterScales = [parentScale.x, parentScale.y];
					break;
			}
		}

		//垂直于轴向的缩放：决定世界空间里的"目标半径"
		const maxDiameterScale = Math.max(...diameterScales);
		const worldRadius = safeRadius * maxDiameterScale;

		//轴向缩放：决定世界空间里的“目标总高度”
		//规则：
		//基础总高度 = this.height
		//轴向缩放 > 1 时拉长总高度
		//轴向缩放 < 1 时：总高度不会小于 2 * worldRadius（圆柱部分长度不为负）
		const baseTotalHeight = this.height;
		const scaledTotalHeight = baseTotalHeight * axisScale;
		const worldTotalHeight = Math.max(2 * worldRadius, scaledTotalHeight);

		//归一化高度：以 worldRadius 为 1 时的总高度
		//几何体使用 radius=1，后续再用 scaling 把半径缩放到 worldRadius
		const normalizedHeight = worldTotalHeight / worldRadius;
		const { tessellation, capSubdivisions } = getCapsuleTessellation(this.detail);
		const orientation = this._getAxisDirection();

		return new Geometry(
			Tools.RandomId(),
			scene,
			CreateCapsuleVertexData({
				orientation,
				height: normalizedHeight,
				radius: 1,
				tessellation,
				capSubdivisions,
				topCapSubdivisions: capSubdivisions,
			})
		);
	}

	/**
	 * 应用胶囊体变换到网格
	 * 轴向已在几何体中烘焙（通过 orientation），这里只设置缩放
	 * 避免「非等比缩放 + 旋转」导致的变换剪切问题
	 */
	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		mesh.rotation.copyFrom(Vector3.Zero());
		mesh.rotationQuaternion = null;

		const safeRadius = Math.max(this.radius, 1e-4);

		if (mesh.parent && (mesh.parent as AbstractMesh).absoluteScaling) {
			const parentScale = (mesh.parent as AbstractMesh).absoluteScaling;

			//垂直于轴向的缩放：决定世界空间里的“目标半径”
			let diameterScales: [number, number];
			switch (this.axis) {
				case "x":
					diameterScales = [parentScale.y, parentScale.z];
					break;
				case "y":
					diameterScales = [parentScale.x, parentScale.z];
					break;
				case "z":
					diameterScales = [parentScale.x, parentScale.y];
					break;
			}

			const maxDiameterScale = Math.max(...diameterScales);
			const targetWorldRadius = safeRadius * maxDiameterScale; //几何体 radius=1，对应的世界半径

			mesh.scaling.set(
				targetWorldRadius / parentScale.x,
				targetWorldRadius / parentScale.y,
				targetWorldRadius / parentScale.z,
			);
		} else {
			//无父节点：直接用 uniform scale 把 radius=1 的几何体缩放到目标半径
			mesh.scaling.setAll(safeRadius);
		}
	}

	private _getAxisDirection(): Vector3 {
		switch (this.axis) {
			case "x": return Vector3.Right();
			case "y": return Vector3.Up();
			case "z": return Vector3.Forward();
		}
	}

	clone(): CapsuleCollisionShape {
		return new CapsuleCollisionShape(
			this.center.clone(),
			this.radius,
			this.height,
			this.axis,
			this.detail,
		);
	}

	toJSON(): CapsuleShapeJSON {
		return {
			type: "capsule",
			center: vectorToArray(this.center),
			radius: this.radius,
			height: this.height,
			axis: this.axis,
			detail: this.detail,
		};
	}

	static fromJSON(data: CapsuleShapeJSON): CapsuleCollisionShape {
		let height: number;
		
		if (data.height !== undefined) {
			height = data.height;
		}
		else {
			height = 1;
		}
		
		return new CapsuleCollisionShape(
			arrayToVector(data.center),
			data.radius,
			height,
			data.axis || "y",
			data.detail || "medium",
		);
	}
}

/**
 * 凸包碰撞体形状
 * Havok拿不到凸包算法，使用 QuickHull 算法从源网格计算凸包
 */
export class ConvexHullCollisionShape extends CollisionShapeBase implements IConvexHullShape {
	public readonly type = "convexHull" as const;

	constructor(center: Vector3 = Vector3.Zero()) {
		super("convexHull", center);
	}

	/**
	 * 凸包使用源网格的顶点，已在正确的本地空间
	 * 不需要偏移中心点
	 */
	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,
			applySkeleton: true,
		});
		this.center = Vector3.Zero();
	}

	createGeometry(_scene: Scene, _parentScale?: Vector3): Geometry {
		throw new Error("[ConvexHullCollisionShape] 凸包几何的生成必须有网格[Mesh]");
	}

	async createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null> {
		if (!sourceMesh.geometry) {
			return null;
		}

		const convexHullMesh = await this._createConvexHullMesh(sourceMesh);
		if (!convexHullMesh || !convexHullMesh.geometry) {
			return null;
		}

		const geometry = convexHullMesh.geometry;
		geometry.id = Tools.RandomId();
		geometry.uniqueId = UniqueNumber.Get();
		geometry.releaseForMesh(convexHullMesh);
		convexHullMesh.dispose(false, false);

		return geometry;
	}

	private async _createConvexHullMesh(sourceMesh: Mesh): Promise<Mesh | null> {
		try {
			const positions = sourceMesh.getVerticesData("position");
			if (!positions) {
				return null;
			}

			//将顶点数组转换为 Vector3 数组
			const vertices: Vector3[] = [];
			for (let i = 0; i < positions.length; i += 3) {
				vertices.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]));
			}

			//计算凸包
			const convexHull = this._computeConvexHull(vertices);
			
			//创建凸包网格
			const convexMesh = new Mesh(Tools.RandomId(), sourceMesh.getScene());
			const vertexData = new VertexData();
			vertexData.positions = convexHull.positions;
			vertexData.indices = convexHull.indices;
			vertexData.applyToMesh(convexMesh);
			
			return convexMesh;
		} catch (error) {
			console.error("[ConvexHullCollisionShape] 创建凸包碰撞网格失败:", error);
			return null;
		}
	}

	/**
	 * 计算凸包顶点和索引
	 * 使用 QuickHull3D 算法，失败时降级为包围盒
	 */
	private _computeConvexHull(vertices: Vector3[]): { positions: Float32Array; indices: Uint32Array } {
		try {
			//将 Vector3 数组转换为 quickhull3d 需要的格式
			const points = vertices.map(v => new Float32Array([v.x, v.y, v.z]));

			//使用 quickhull3d 计算凸包，返回面的索引数组 [[i1,i2,i3], ...]
			const faces = QuickHull(points);

			//构建索引数组（每个面有3个顶点索引）
			const indices: number[] = [];
			faces.forEach(face => {
				indices.push(face[0], face[1], face[2]);
			});

			//构建顶点位置数组
			const positions = new Float32Array(vertices.length * 3);
			vertices.forEach((v, i) => {
				positions[i * 3] = v.x;
				positions[i * 3 + 1] = v.y;
				positions[i * 3 + 2] = v.z;
			});

			return {
				positions,
				indices: new Uint32Array(indices),
			};
		} catch (error) {
			console.warn("[ConvexHullCollisionShape] QuickHull算法失败，回退到边界框算法:", error);
			
			let minX = Infinity, maxX = -Infinity;
			let minY = Infinity, maxY = -Infinity;
			let minZ = Infinity, maxZ = -Infinity;

			vertices.forEach(v => {
				minX = Math.min(minX, v.x);
				maxX = Math.max(maxX, v.x);
				minY = Math.min(minY, v.y);
				maxY = Math.max(maxY, v.y);
				minZ = Math.min(minZ, v.z);
				maxZ = Math.max(maxZ, v.z);
			});

			const hullVertices = [
				new Vector3(minX, minY, minZ),
				new Vector3(maxX, minY, minZ),
				new Vector3(maxX, maxY, minZ),
				new Vector3(minX, maxY, minZ),
				new Vector3(minX, minY, maxZ),
				new Vector3(maxX, minY, maxZ),
				new Vector3(maxX, maxY, maxZ),
				new Vector3(minX, maxY, maxZ),
			];

			const indices = [
				0, 1, 2, 0, 2, 3,
				5, 4, 7, 5, 7, 6,
				4, 0, 3, 4, 3, 7,
				1, 5, 6, 1, 6, 2,
				3, 2, 6, 3, 6, 7,
				4, 5, 1, 4, 1, 0,
			];

			const positions = new Float32Array(hullVertices.length * 3);
			hullVertices.forEach((v, i) => {
				positions[i * 3] = v.x;
				positions[i * 3 + 1] = v.y;
				positions[i * 3 + 2] = v.z;
			});

			return {
				positions,
				indices: new Uint32Array(indices),
			};
		}
	}

	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		mesh.scaling.setAll(1);
	}

	clone(): ConvexHullCollisionShape {
		return new ConvexHullCollisionShape(this.center.clone());
	}

	toJSON(): ConvexHullShapeJSON {
		return {
			type: "convexHull",
			center: vectorToArray(this.center),
		};
	}

	static fromJSON(data: ConvexHullShapeJSON): ConvexHullCollisionShape {
		return new ConvexHullCollisionShape(arrayToVector(data.center));
	}
}

/**
 * 精确网格碰撞体形状
 * 直接使用源网格的完整几何体，提供最精确的碰撞检测
 * 不作为触发器，且性能开销较大
 * (TODO:我查了一下其实babylon的Havok支持凹多边形的触发器但是性能开销较大，后续考虑把触发器移植到RigidBody中。这里对于复杂的凹多边形计算不开放触发器)
 */
export class MeshCollisionShape extends CollisionShapeBase implements IMeshShape {
	public readonly type = "mesh" as const;

	constructor(center: Vector3 = Vector3.Zero()) {
		super("mesh", center);
	}

	/**
	 * 网格使用源网格的完整几何体，已在正确的本地空间
	 * 不需要偏移中心点
	 */
	calculateAutoSize(sourceMesh: AbstractMesh): void {
		sourceMesh.refreshBoundingInfo({
			applyMorph: true,
			applySkeleton: true,
		});
		this.center = Vector3.Zero();
	}

	createGeometry(_scene: Scene, _parentScale?: Vector3): Geometry {
		throw new Error("MeshCollisionShape cannot create geometry without source mesh");
	}

	async createGeometryFromMesh(sourceMesh: Mesh): Promise<Geometry | null> {
		const tempMesh = sourceMesh.clone(Tools.RandomId());
		if (tempMesh && tempMesh.geometry) {
			const geometry = tempMesh.geometry;
			geometry.id = Tools.RandomId();
			geometry.uniqueId = UniqueNumber.Get();
			geometry.releaseForMesh(tempMesh);
			tempMesh.dispose(false, false);
			return geometry;
		}
		return null;
	}

	applyToMesh(mesh: AbstractMesh): void {
		mesh.position.copyFrom(this.center);
		mesh.scaling.setAll(1);
	}

	clone(): MeshCollisionShape {
		return new MeshCollisionShape(this.center.clone());
	}

	toJSON(): MeshShapeJSON {
		return {
			type: "mesh",
			center: vectorToArray(this.center),
		};
	}

	static fromJSON(data: MeshShapeJSON): MeshCollisionShape {
		return new MeshCollisionShape(arrayToVector(data.center));
	}
}
