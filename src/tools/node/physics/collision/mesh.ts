import {
	AbstractMesh,
	Color3,
	Geometry,
	Mesh,
	Node,
	Scene,
	Tools,
	LinesMesh,
	Vector3,
	CreateLineSystem,
} from "@babylonjs/core";
import { UniqueNumber } from "@/tools/guards/tools";
import { isMesh } from "@/tools/guards/nodes";
import {
	CollisionMeshType,
	ICollisionShape,
	ICollisionMesh,
	ICapsuleShape,
} from "./types";
import { CollisionShapeFactory } from "./factory";
import { MeshCollisionShape, ConvexHullCollisionShape } from "./shapes";

/**
 * 碰撞体可视化和管理的核心类，负责编辑器中碰撞体的显示和交互
 * 
 * **核心功能：**
 * 1. **碰撞体可视化**
 *    简化线框模式：预定义关键线条，主要显示碰撞体轮廓(TODO:在简化线框基础上增加编辑碰撞几何体功能，还未想好合适的编辑器内的实现)
 *    完整网格模式：从几何体提取所有边线，是碰撞体实际的网格精度。
 *    双层透视渲染：遮挡部分半透明，未遮挡部分不透明
 * 
 * 2. **动态缩放同步**
 *    监听父节点缩放变化
 *    自动更新碰撞体几何体
 * 
 * 3. **实例管理**
 *    同步源网格的实例
 *    自动创建/销毁碰撞体实例
 * 
 * 4. **触发器支持**
 *    触发器不产生物理响应
 *    自动同步到所有实例
 * 
 * @example
 * //创建碰撞体网格
 * const collisionMesh = new CollisionMesh('BoxCollider', scene, sourceMesh);
 * 
 * //设置为球体碰撞器（自动计算尺寸）
 * await collisionMesh.setType('sphere', sourceMesh, true);
 * 
 * //设置为触发器
 * collisionMesh.isTrigger = true;
 * 
 * //切换显示完整网格
 * collisionMesh.setShowFullMesh(true);
 */
export class CollisionMesh extends Mesh implements ICollisionMesh {
	public shape: ICollisionShape;
	private _isTrigger: boolean = false;
	
	//线框网格（未遮挡部分，不透明）
	private _linesMesh: LinesMesh | null = null;
	//线框网格（遮挡部分，半透明）
	private _occludedLinesMesh: LinesMesh | null = null;
	//在线框模式下，是否显示所有边
	private _showFullEdges: boolean = false;
	//是否使用线框渲染（or材质渲染）
	private _isWireframeMode: boolean = false;
	//上次的父节点缩放
	private _lastParentScale: Vector3 | null = null;
	//父节点缩放变化观察者
	private _parentScaleObserver: any = null;
	//是否正在从缩放更新中（防止循环触发）
	private _isUpdatingFromScale: boolean = false;
	//是否需要重建（延迟到下一帧）
	private _needsRebuild: boolean = false;
	//渲染前观察者
	private _beforeRenderObserver: any = null;

	public get isTrigger(): boolean {
		return this._isTrigger;
	}

	public set isTrigger(value: boolean) {
		this._isTrigger = value;
		this.metadata = this.metadata || {};
		this.metadata.isTrigger = value;
		
		/*//同步到所有实例
		this.instances.forEach(instance => {
			instance.metadata = instance.metadata || {};
			instance.metadata.isTrigger = value;
		});*/
	}

	public get type(): CollisionMeshType {
		return this.shape.type;
	}

	//是否使用简化线框
	public get usesSimplifiedWireframe(): boolean {
		return this._isWireframeMode;
	}

	/**
	 * 设置碰撞体可见性
	 * 统一控制主网格、实例和线框的可见性
	 */
	public setVisibility(visible: boolean): void {
		if (this._isWireframeMode) {
			//简化线框模式：只控制线框可见性
			if (this._linesMesh) {
				this._linesMesh.isVisible = visible;
			}
			if (this._occludedLinesMesh) {
				this._occludedLinesMesh.isVisible = visible;
			}
		} else {
			//完整网格模式：控制主网格和实例
			this.isVisible = visible;
			this.instances?.forEach(instance => {
				instance.isVisible = visible;
			});
		}
	}

	/**
	 * 切换显示完整网格或简化线框，支持sphere、cylinder、capsule三种网格。
	 */
	public setShowFullMesh(show: boolean): void {
		if (!this._isWireframeMode) {
			return;
		}

		this._showFullEdges = show;
		this._updateWireframeLines();
	}

	/**
	 * 更新线框数据
	 * @description 根据 _showFullMesh 模式重新创建线框网格
	 * 
	 * @remarks
	 * 采用重新创建而非更新顶点的策略，原因：
	 * 1. 完整边线和简化线框的顶点数量差异巨大
	 * 2. Babylon.js 的 LinesMesh 更新机制对大量线条变化不够高效
	 * 3. 重新创建可以避免内存泄漏和状态不一致问题
	 */
	private _updateWireframeLines(): void {
		if (!this._isWireframeMode) {
			return;
		}

		const lines = this._showFullEdges 
			? this._extractEdgesFromGeometry()  //完整模式：提取所有边线
			: this._getSimplifiedWireframeLines();  //简化模式：预定义关键线条

		if (lines.length === 0) {
			console.warn('[CollisionMesh] 没有数据更新线形成的网格:', this.shape.type);
			return;
		}

		//保存可见性状态以便恢复
		const wasLinesVisible = this._linesMesh?.isVisible ?? true;
		const wasOccludedVisible = this._occludedLinesMesh?.isVisible ?? true;

		try {
			//清理旧的线框网格
			if (this._linesMesh) {
				this._linesMesh.dispose();
				this._linesMesh = null;
			}
			if (this._occludedLinesMesh) {
				this._occludedLinesMesh.dispose();
				this._occludedLinesMesh = null;
			}

			//创建双层线框（实现透视效果）
			//第一层：被遮挡部分（半透明，depthFunction=GREATER）
			this._occludedLinesMesh = CreateLineSystem(
				`${this.name}_lines_occluded`,
				{ lines: lines, updatable: true },
				this._scene
			) as LinesMesh;
			
			//第二层：未被遮挡部分（不透明，depthFunction=LEQUAL）
			this._linesMesh = CreateLineSystem(
				`${this.name}_lines`,
				{ lines: lines, updatable: true },
				this._scene
			) as LinesMesh;
			
			if (this._occludedLinesMesh && this._linesMesh) {
				//配置双层透视材质
				this._configureLinesMeshMaterial();
				
				//恢复可见性状态
				this._linesMesh.isVisible = wasLinesVisible;
				this._occludedLinesMesh.isVisible = wasOccludedVisible;
				
				//强制更新世界矩阵（确保线框正确跟随碰撞体）
				this.computeWorldMatrix(true);
				this._occludedLinesMesh.computeWorldMatrix(true);
				this._linesMesh.computeWorldMatrix(true);
			}
		} catch (error) {
			console.error('[CollisionMesh] 更新线框发生了错误:', error);
		}
	}

	/**
	 * 配置线框网格的材质
	 * @description 实现双层透视效果，使碰撞体在任何角度都清晰可见
	 * 
	 * @remarks
	 * **透视效果原理：**
	 * 第一层（被遮挡）：半透明绿色，depthFunction=GREATER，只显示被其他物体遮挡的部分
	 * 第二层（未遮挡）：不透明绿色，depthFunction=LEQUAL，只显示未被遮挡的部分
	 * 两层叠加：无论碰撞体是否被遮挡，都能看到轮廓
	 * 
	 * **关键参数：**
	 * depthFunction: 515=LEQUAL（小于等于深度值）, 516=GREATER（大于深度值）
	 * disableDepthWrite: true（避免线框互相遮挡）
	 * alphaIndex: 控制渲染顺序（0先渲染半透明，1后渲染不透明）
	 */
	private _configureLinesMeshMaterial(): void {
		if (!this._linesMesh || !this._occludedLinesMesh) return;

		const greenColor = new Color3(0, 1, 0);  //我爱绿色

		// ===== 第一层：被遮挡部分（半透明） =====
		this._occludedLinesMesh.color = greenColor;
		this._occludedLinesMesh.alpha = 0.3;
		this._occludedLinesMesh.parent = this;
		this._occludedLinesMesh.renderingGroupId = 0;
		this._occludedLinesMesh.isPickable = false;
		this._occludedLinesMesh.alphaIndex = 0;  //先渲染
		
		if (this._occludedLinesMesh.material) {
			this._occludedLinesMesh.material.alpha = 0.25;
			this._occludedLinesMesh.material.disableDepthWrite = true;
			this._occludedLinesMesh.material.transparencyMode = 2;  //ALPHA_BLEND
			(this._occludedLinesMesh.material as any).depthFunction = 516;  //GREATER
			this._occludedLinesMesh.material.markAsDirty(1);
		}
		
		// ===== 第二层：未被遮挡部分（不透明） =====
		this._linesMesh.color = greenColor;
		this._linesMesh.alpha = 1.0;
		this._linesMesh.parent = this;
		this._linesMesh.renderingGroupId = 0;
		this._linesMesh.isPickable = false;
		this._linesMesh.alphaIndex = 1;  //后渲染
		
		if (this._linesMesh.material) {
			this._linesMesh.material.alpha = 1.0;
			this._linesMesh.material.disableDepthWrite = true;
			this._linesMesh.material.transparencyMode = 2;  
			(this._linesMesh.material as any).depthFunction = 515;  //LEQUAL
			this._linesMesh.material.markAsDirty(1);
		}
	}

	/**
	 * 获取简化线框的线条数据
	 * @description 根据形状类型返回预定义的关键线条
	 * @returns 线条数组，每个元素是一条线的顶点序列
	 * 
	 * @remarks
	 * **各形状的简化策略：**
	 * sphere: 3个正交圆环（XY、YZ、XZ平面）
	 * cube: 12条边线
	 * cylinder: 顶部圆环 + 底部圆环 + 4条连线
	 * capsule: 圆柱部分 + 2个半球轮廓
	 * convexHull/mesh: 不简化，返回空数组
	 */
	private _getSimplifiedWireframeLines(): Vector3[][] {
		const type = this.shape.type;
		switch (type) {
			case "sphere":
				return this._createSphereWireframe();
			case "cube":
				return this._createCubeWireframe();
			case "cylinder":
				return this._createCylinderWireframe();
			case "capsule":
				return this._createCapsuleWireframe();
			default:
				return [];
		}
	}

	/**
	 * 确保材质配置正确
	 * @description 在形状参数变化后调用，修复可能丢失的材质配置
	 * 
	 * @remarks
	 * 某些操作（如重建几何体）可能导致材质属性重置，
	 * 此方法确保双层透视效果的关键参数始终正确
	 */
	public ensureMaterialConfig(): void {
		//被遮挡层材质（半透明，depthFunction=GREATER）
		if (this._occludedLinesMesh?.material) {
			this._occludedLinesMesh.material.alpha = 0.3;
			this._occludedLinesMesh.material.disableDepthWrite = true;
			this._occludedLinesMesh.material.transparencyMode = 2; 
			(this._occludedLinesMesh.material as any).depthFunction = 516;
		}
		
		//未遮挡层材质（不透明，depthFunction=LEQUAL）
		if (this._linesMesh?.material) {
			this._linesMesh.material.alpha = 1.0;
			this._linesMesh.material.disableDepthWrite = true;
			this._linesMesh.material.transparencyMode = 2; 
			(this._linesMesh.material as any).depthFunction = 515;
		}
	}

	/**
	 * 销毁碰撞网格及其所有资源
	 * @description 清理观察者、线框网格、事件监听等所有子对象
	 * @param doNotRecurse - 是否递归销毁子节点
	 * @param disposeMaterialAndTextures - 是否销毁材质和纹理
	 * 
	 * @remarks
	 * **清理顺序：**
	 * 1. 移除渲染前观察者（防止重建任务触发）
	 * 2. 移除父节点缩放观察者（防止缩放事件触发）
	 * 3. 销毁线框网格（双层透视线框）
	 * 4. 调用父类 dispose（清理主网格和实例）
	 */
	public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
		//1.清理渲染前观察者（防止延迟重建任务触发）
		if (this._beforeRenderObserver) {
			try {
				this._scene.onBeforeRenderObservable.remove(this._beforeRenderObserver);
			} catch (e) {
				//静默失败：可能场景已经销毁
			}
			this._beforeRenderObserver = null;
		}
		
		//2.清理父节点缩放观察者（防止缩放事件触发）
		if (this._parentScaleObserver && this.parent) {
			try {
				(this.parent as AbstractMesh).onAfterWorldMatrixUpdateObservable?.remove(this._parentScaleObserver);
			} catch (e) {
				//静默失败：可能父节点已经销毁
			}
			this._parentScaleObserver = null;
		}
		
		//3.清理双层线框网格
		this._disposeLineMeshes();

		//4.调用父类 dispose（清理主网格、几何体、材质、实例等）
		super.dispose(doNotRecurse, disposeMaterialAndTextures);
	}

	/**
	 * 销毁双层线框网格
	 * @description 提取为独立方法，便于在其他地方重用
	 * @private
	 */
	private _disposeLineMeshes(): void {
		//销毁未遮挡层
		if (this._linesMesh) {
			this._linesMesh.isVisible = false;
			this._linesMesh.setEnabled(false);
			try {
				this._linesMesh.dispose();
			} catch (e) {
				//静默失败
			}
			this._linesMesh = null;
		}
		
		//销毁遮挡层
		if (this._occludedLinesMesh) {
			this._occludedLinesMesh.isVisible = false;
			this._occludedLinesMesh.setEnabled(false);
			try {
				this._occludedLinesMesh.dispose();
			} catch (e) {
				//静默失败
			}
			this._occludedLinesMesh = null;
		}
	}

	/**
	 * 设置父节点缩放监听器
	 * 监听父节点缩放变化，自动更新碰撞体
	 */
	private _setupParentScaleObserver(): void {
		if (!this.parent) return;
		
		const parentMesh = this.parent as AbstractMesh;
		if (!parentMesh.onAfterWorldMatrixUpdateObservable) return;
		
		//初始化上次的父节点缩放
		this._lastParentScale = parentMesh.absoluteScaling.clone();
		
		//监听父节点的世界矩阵更新
		this._parentScaleObserver = parentMesh.onAfterWorldMatrixUpdateObservable.add(() => {
			//防止循环触发
			if (this._isUpdatingFromScale) return;
			if (!this._lastParentScale || this.shape.type === "none") return;
			
			const currentScale = parentMesh.absoluteScaling;
			
			//检查缩放是否改变
			if (!currentScale.equals(this._lastParentScale)) {
				try {
					this._isUpdatingFromScale = true;
					
					//缩放改变了，更新碰撞体
					this._lastParentScale = currentScale.clone();

					//胶囊体：轴向长度已经烘进几何体（CreateCapsuleVertexData.height），
					//父节点轴向缩放变化必须重建几何体才能让“圆柱部分”变长/变短。
					if (this.shape.type === "capsule") {
						this._needsRebuild = true;
						return;
					}
					
					//其它形状：只需要重新应用形状变换
					this.shape.applyToMesh(this);
					
					//如果使用简化线框，标记为需要重建（延迟到下一帧）
					if (this._isWireframeMode) {
						this._needsRebuild = true;
					}
					
					//线框的父节点是 this，会自动继承变换
				} finally {
					this._isUpdatingFromScale = false;
				}
			}
		});
	}
	
	/**
	 * 执行延迟重建
	 * 在渲染前执行，避免在渲染循环中 dispose 导致的问题
	 */
	private _performDelayedRebuild(): void {
		this._rebuildCollisionMesh();
	}
	
	/**
	 * 构造函数
	 * 创建碰撞网格并设置监听器
	 */
	constructor(
		name: string,
		scene: Scene,
		parent?: Node | null,
		source?: Mesh | null,
		doNotCloneChildren?: boolean,
		clonePhysicsImpostor?: boolean
	) {
		super(name, scene, parent, source, doNotCloneChildren, clonePhysicsImpostor);

		this.id = Tools.RandomId();
		this.uniqueId = UniqueNumber.Get();
		this.shape = CollisionShapeFactory.createDefault("none");
		
		//从metadata恢复isTrigger
		if (this.metadata && typeof this.metadata.isTrigger === 'boolean') {
			this._isTrigger = this.metadata.isTrigger;
		}
		
		//监听父节点的缩放变化
		this._setupParentScaleObserver();
		
		//监听渲染前事件，处理延迟重建
		this._beforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
			if (this._needsRebuild) {
				this._needsRebuild = false;
				this._performDelayedRebuild();
			}
		});
	}

	/**
	 * 设置碰撞体类型
	 */
	public async setType(
		type: CollisionMeshType,
		sourceMesh: AbstractMesh,
		useAutoSize: boolean = true
	): Promise<void> {
		//先隐藏网格，避免显示默认材质
		this.isVisible = false;
		
		//创建新形状
		const newShape = CollisionShapeFactory.create({
			type,
			autoSize: useAutoSize,
			sourceMesh,
		});

		this.shape = newShape;

		//根据类型创建几何体
		await this._createCollisionMeshByType(type, sourceMesh);

		//更新实例
		this.updateInstances(sourceMesh);
		
		//更新父节点缩放记录（因为形状可能改变）
		if (this.parent && (this.parent as AbstractMesh).absoluteScaling) {
			this._lastParentScale = (this.parent as AbstractMesh).absoluteScaling.clone();
		}
	}

	/**
	 * 更新碰撞体形状
	 */
	public updateShape(shape: ICollisionShape): void {
		//先隐藏网格，避免显示默认材质
		this.isVisible = false;
		this.shape = shape;
		this._rebuildCollisionMesh();
	}

	/**
	 * 重建几何体
	 */
	public rebuildGeometry(): void {
		this._rebuildCollisionMesh();
	}

	/**
	 * 更新实例
	 */
	public updateInstances(sourceMesh: AbstractMesh): void {
		if (!isMesh(sourceMesh) || sourceMesh.instances.length === 0) {
			return;
		}

		//清理旧实例
		this.instances.forEach(instance => instance.dispose());

		//mesh 和 convexHull 类型使用 LinesMesh，不需要给 this 设置材质
		//实例化在 LinesMesh 级别处理（如果需要的话）

		//创建新实例
		sourceMesh.instances.forEach((instance) => {
			const collisionInstance = this.createInstance(instance.name);
			collisionInstance.id = instance.id;
			collisionInstance.uniqueId = instance.uniqueId;
			collisionInstance.metadata = instance.metadata;
			collisionInstance.position = instance.position;
			collisionInstance.rotation = instance.rotation;
			collisionInstance.rotationQuaternion = instance.rotationQuaternion?.clone();
			collisionInstance.scaling = instance.scaling;
			collisionInstance.parent = instance.parent;
		});
	}

	// ==================== 私有方法 ====================
	
	/**
	 * 重置网格变换状态
	 * 将位置、旋转、缩放都重置为默认值
	 */
	private _resetMeshTransform(): void {
		this.rotation.setAll(0);
		this.rotationQuaternion = null;
		this.scaling.setAll(1);
		this.position.setAll(0);
		this.computeWorldMatrix(true);
	}

	/**
	 * 清理旧几何体
	 * 清理线框、顶点缓冲区和几何体对象
	 */
	private _disposeOldGeometry(): void {
		//清理旧的线框
		if (this._linesMesh) {
			this._linesMesh.isVisible = false;
			this._linesMesh.setEnabled(false);
			this._linesMesh.dispose();
			this._linesMesh = null;
		}
		if (this._occludedLinesMesh) {
			this._occludedLinesMesh.isVisible = false;
			this._occludedLinesMesh.setEnabled(false);
			this._occludedLinesMesh.dispose();
			this._occludedLinesMesh = null;
		}
		
		//清理主网格的顶点缓冲区
		const bufferKinds = ['position', 'normal', 'uv', 'uv2', 'color', 'tangent'];
		for (const kind of bufferKinds) {
			if (this.isVerticesDataPresent(kind)) {
				this.removeVerticesData(kind);
			}
		}
		//清理索引缓冲区
		if (this.getIndices() && this.getIndices()!.length > 0) {
			this.setIndices([]);
		}
		
		//清理旧的几何体
		if (this.geometry) {
			const oldGeometry = this.geometry;
			oldGeometry.releaseForMesh(this);
			oldGeometry.dispose();
		}
	}

	/**
	 * 应用几何体到网格
	 * 刷新边界信息确保几何体数据正确绑定
	 */
	private _applyGeometry(geometry: Geometry): void {
		geometry.applyToMesh(this);
		this.refreshBoundingInfo();
	}

	/**
	 * 重建碰撞体网格
	 * 重新创建几何体和线框，保持可见性状态
	 */
	private _rebuildCollisionMesh(): void {
		if (this.shape.type === "none") {
			return;
		}

		//网格和凸包类型只需要重新应用形状
		if (this.shape.type === "mesh" || this.shape.type === "convexHull") {
			this.shape.applyToMesh(this);
			return;
		}

		const currentShape = this.shape;
		
		//记录可见性状态以便恢复
		const wasVisible = this.isVisible;
		const linesVisible = this._linesMesh?.isVisible ?? false;
		const occludedLinesVisible = this._occludedLinesMesh?.isVisible ?? false;

		//清理旧几何体
		this._disposeOldGeometry();

		//创建新几何体，传递父节点缩放（如果存在）
		const parentScale = this.parent && (this.parent as AbstractMesh).absoluteScaling 
			? (this.parent as AbstractMesh).absoluteScaling 
			: undefined;
		const geometry = currentShape.createGeometry(this._scene, parentScale);
		geometry.uniqueId = UniqueNumber.Get();

		//重置状态
		this._resetMeshTransform();

		//应用几何体
		this._applyGeometry(geometry);

		//强制计算世界矩阵，确保几何体顶点数据和变换完全同步到 GPU 渲染队列前
		this.computeWorldMatrix(true);

		//再次重置状态，确保形状变换不受几何体影响
		this._resetMeshTransform();

		//应用形状
		currentShape.applyToMesh(this);
		this.computeWorldMatrix(true); //再次同步

		//创建或更新线框（根据 _showFullMesh 自动选择简化或完整数据）
		if (this.geometry) {
			this._createSimplifiedWireframe();  //创建 LinesMesh（如果不存在）
			
			//恢复可见性状态
			this.isVisible = wasVisible;
			if (this._linesMesh) this._linesMesh.isVisible = linesVisible;
			if (this._occludedLinesMesh) this._occludedLinesMesh.isVisible = occludedLinesVisible;
		}
		
		//刷新边界信息
		this.refreshBoundingInfo();
		this.computeWorldMatrix(true);
	}

	/**
	 * 根据类型创建碰撞体
	 * 处理不同类型的碰撞体创建逻辑
	 */
	private async _createCollisionMeshByType(
		type: CollisionMeshType,
		sourceMesh: AbstractMesh
	): Promise<void> {
		this._disposeOldGeometry();

		if (type === "none") {
			return;
		}

		if (type === "mesh") {
			await this._createMeshCollisionMesh(sourceMesh);
			return;
		}

		if (type === "convexHull") {
			await this._createConvexHullCollisionMesh(sourceMesh);
			return;
		}

		//创建几何体
		//传递父节点缩放
		const parentScale = this.parent && (this.parent as AbstractMesh).absoluteScaling 
			? (this.parent as AbstractMesh).absoluteScaling 
			: undefined;
		const geometry = this.shape.createGeometry(this._scene, parentScale);
		geometry.uniqueId = UniqueNumber.Get();

		//应用几何体
		this._applyGeometry(geometry);

		//重置状态
		this._resetMeshTransform();

		//应用形状
		this.shape.applyToMesh(this);
		
		//刷新边界信息
		this.refreshBoundingInfo();
		this.computeWorldMatrix(true);

		//应用材质和创建简化线框
		if (this.geometry) {
			//简单形状使用简化线框
			this._createSimplifiedWireframe();
		}
	}

	/**
	 * 创建凸包碰撞体
	 * 从源网格生成凸包几何体
	 */
	private async _createConvexHullCollisionMesh(sourceMesh: AbstractMesh): Promise<void> {
		if (!(this.shape instanceof ConvexHullCollisionShape)) {
			return;
		}

		if (!isMesh(sourceMesh)) {
			return;
		}

		try {
			const geometry = await this.shape.createGeometryFromMesh(sourceMesh);
			if (!geometry) {
				return;
			}
			this._applyGeometry(geometry);
			this._resetMeshTransform();

		//应用形状
		this.shape.applyToMesh(this);
		
		//应用材质（凸包使用 wireframe）
		if (this.geometry) {
			this._createDualWireframe();
			//隐藏原始网格，只显示线框
			this.isVisible = false;
			this._isWireframeMode = true;
		}
	} catch (error) {
		console.error("创建凸包碰撞体失败:", error);
	}
}

	/**
	 * 创建精确网格碰撞体
	 * 克隆源网格的完整几何体
	 */
	private async _createMeshCollisionMesh(sourceMesh: AbstractMesh): Promise<void> {
		if (!(this.shape instanceof MeshCollisionShape)) {
			return;
		}

		if (!isMesh(sourceMesh)) {
			return;
		}

		try {
			const geometry = await this.shape.createGeometryFromMesh(sourceMesh);
			if (!geometry) {
				return;
			}

			this._applyGeometry(geometry);
			this._resetMeshTransform();

		this.shape.applyToMesh(this);
		
		//应用材质（网格使用 wireframe）
		if (this.geometry) {
			this._createDualWireframe();
			//隐藏原始网格，只显示线框
			this.isVisible = false;
			this._isWireframeMode = true;
		}
	} catch (error) {
		console.error("创建网格碰撞体失败:", error);
	}
}

	/**
	 * 创建双层线框（用于 mesh 和 convexHull）
	 * 从几何体提取所有边线，创建双层 LinesMesh 实现透视效果
	 */
	private _createDualWireframe(): void {
		if (!this.geometry) {
			return;
		}

		//从几何体提取边线
		const lines = this._extractEdgesFromGeometry();
		if (lines.length === 0) {
			return;
		}

		//清理旧的线框
		if (this._linesMesh) {
			this._linesMesh.dispose();
			this._linesMesh = null;
		}
		if (this._occludedLinesMesh) {
			this._occludedLinesMesh.dispose();
			this._occludedLinesMesh = null;
		}

		try {
			//创建被遮挡的线条网格（半透明）
			this._occludedLinesMesh = CreateLineSystem(
				`${this.name}_lines_occluded`,
				{ lines: lines, updatable: true },
				this._scene
			) as LinesMesh;
			
			//创建未被遮挡的线条网格（不透明）
			this._linesMesh = CreateLineSystem(
				`${this.name}_lines`,
				{ lines: lines, updatable: true },
				this._scene
			) as LinesMesh;
			
			if (this._occludedLinesMesh && this._linesMesh) {
				//配置材质
				this._configureLinesMeshMaterial();
				
				//强制更新变换矩阵
				this.computeWorldMatrix(true);
				this._occludedLinesMesh.computeWorldMatrix(true);
				this._linesMesh.computeWorldMatrix(true);
				
				//隐藏原始网格，只显示线框
				this.isVisible = false;
			}
		} catch (error) {
			console.error("双层线框材质创建失败:", error);
		}
	}

	/**
	 * 从几何体提取所有边线
	 * 遍历三角形索引，提取所有边并去重
	 */
	private _extractEdgesFromGeometry(): Vector3[][] {
		if (!this.geometry) {
			return [];
		}

		const positions = this.geometry.getVerticesData("position");
		const indices = this.geometry.getIndices();
		
		if (!positions || !indices) {
			return [];
		}

		//提取所有的边
		const edgeSet = new Set<string>();
		const lines: Vector3[][] = [];

		for (let i = 0; i < indices.length; i += 3) {
			const i0 = indices[i];
			const i1 = indices[i + 1];
			const i2 = indices[i + 2];

			//添加三角形的3条边
			this._addEdge(edgeSet, lines, positions, i0, i1);
			this._addEdge(edgeSet, lines, positions, i1, i2);
			this._addEdge(edgeSet, lines, positions, i2, i0);
		}

		return lines;
	}

	/**
	 * 添加边到边集合
	 * 使用较小索引在前的方式创建唯一标识，避免重复边
	 */
	private _addEdge(
		edgeSet: Set<string>,
		lines: Vector3[][],
		positions: number[] | Float32Array,
		idx1: number,
		idx2: number
	): void {
		//创建边的唯一标识（较小索引在前，避免重复）
		const edgeKey = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`;
		
		if (!edgeSet.has(edgeKey)) {
			edgeSet.add(edgeKey);
			
			const v1 = new Vector3(
				positions[idx1 * 3],
				positions[idx1 * 3 + 1],
				positions[idx1 * 3 + 2]
			);
			const v2 = new Vector3(
				positions[idx2 * 3],
				positions[idx2 * 3 + 1],
				positions[idx2 * 3 + 2]
			);
			
			lines.push([v1, v2]);
		}
	}

	/**
	 * 创建简化线框可视化
	 * 用于简单形状（cube, sphere, cylinder, capsule），使用预定义的关键线条
	 */
	private _createSimplifiedWireframe(): void {
		const type = this.shape.type;
		
		//mesh 和 convexHull 使用双层 LinesMesh（在 _createDualWireframe 中处理）
		if (type === "mesh" || type === "convexHull") {
			return;
		}

		//如果 LinesMesh 已经存在，只需更新数据
		if (this._linesMesh && this._occludedLinesMesh) {
			this._updateWireframeLines();
			return;
		}

		//获取线条数据（根据 _showFullMesh 自动选择）
		let points: Vector3[][];
		if (this._showFullEdges) {
			points = this._extractEdgesFromGeometry();
		} else {
			points = this._getSimplifiedWireframeLines();
		}

		if (points.length === 0) {
			console.warn(`[CollisionMesh] 创建简化线框可视化失败，没有线框数据: ${type}`);
			return;
		}

		try {
			//创建被遮挡的线条网格（半透明，显示在后面）
			this._occludedLinesMesh = CreateLineSystem(
				`${this.name}_lines_occluded`,
				{ lines: points, updatable: true },
				this._scene
			) as LinesMesh;
			
			// 创建未被遮挡的线条网格（不透明，显示在前面）
			this._linesMesh = CreateLineSystem(
				`${this.name}_lines`,
				{ lines: points, updatable: true },
				this._scene
			) as LinesMesh;
			
			if (this._occludedLinesMesh && this._linesMesh) {
				//配置材质
				this._configureLinesMeshMaterial();
				
				this.computeWorldMatrix(true);
				this._occludedLinesMesh.computeWorldMatrix(true);
				this._linesMesh.computeWorldMatrix(true);
				
				//标记使用简化线框
				this._isWireframeMode = true;
				
				//隐藏原始网格，只显示线框
				this.isVisible = false;
				
				//清理原始网格的材质（简化线框不需要）
				if (this.material) {
					this.material = null;
				}
			}
		} catch (error) {
			console.error("[CollisionMesh] 创建简化线框失败:", error);
			//如果线框创建失败，至少隐藏原始网格避免视觉混乱
			this.isVisible = false;
		}
	}

	/**
	 * 创建球体的简化线框
	 * 绘制3个正交的圆环（XY、XZ、YZ平面），单位半径0.5
	 */
	private _createSphereWireframe(): Vector3[][] {
		if (!this.shape || this.shape.type !== "sphere") {
			return [];
		}

		const lines: Vector3[][] = [];
		const segments = 32;
		const radius = 0.5; //单位球体半径，匹配 CreateSphereVertexData({ diameter: 1 })

		//XY 平面圆环 (Z=0)
		const xyCircle: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			xyCircle.push(new Vector3(
				Math.cos(angle) * radius,
				Math.sin(angle) * radius,
				0
			));
		}
		lines.push(xyCircle);

		//XZ 平面圆环 (Y=0)
		const xzCircle: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			xzCircle.push(new Vector3(
				Math.cos(angle) * radius,
				0,
				Math.sin(angle) * radius
			));
		}
		lines.push(xzCircle);

		//YZ 平面圆环 (X=0)
		const yzCircle: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			yzCircle.push(new Vector3(
				0,
				Math.cos(angle) * radius,
				Math.sin(angle) * radius
			));
		}
		lines.push(yzCircle);

		return lines;
	}

	/**
	 * 创建立方体的简化线框
	 * 绘制12条边（底面4条 + 顶面4条 + 垂直4条），单位边长1
	 */
	private _createCubeWireframe(): Vector3[][] {
		if (!this.shape || this.shape.type !== "cube") {
			return [];
		}

		const lines: Vector3[][] = [];
		const halfSize = 0.5; //单位立方体半边长，匹配 CreateBoxVertexData({ size: 1 })

		//底面4条边
		lines.push([
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, -halfSize, -halfSize),
		]);
		lines.push([
			new Vector3(halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, -halfSize, halfSize),
		]);
		lines.push([
			new Vector3(halfSize, -halfSize, halfSize),
			new Vector3(-halfSize, -halfSize, halfSize),
		]);
		lines.push([
			new Vector3(-halfSize, -halfSize, halfSize),
			new Vector3(-halfSize, -halfSize, -halfSize),
		]);

		//顶面4条边
		lines.push([
			new Vector3(-halfSize, halfSize, -halfSize),
			new Vector3(halfSize, halfSize, -halfSize),
		]);
		lines.push([
			new Vector3(halfSize, halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize),
		]);
		lines.push([
			new Vector3(halfSize, halfSize, halfSize),
			new Vector3(-halfSize, halfSize, halfSize),
		]);
		lines.push([
			new Vector3(-halfSize, halfSize, halfSize),
			new Vector3(-halfSize, halfSize, -halfSize),
		]);

		//垂直4条边
		lines.push([
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(-halfSize, halfSize, -halfSize),
		]);
		lines.push([
			new Vector3(halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, -halfSize),
		]);
		lines.push([
			new Vector3(halfSize, -halfSize, halfSize),
			new Vector3(halfSize, halfSize, halfSize),
		]);
		lines.push([
			new Vector3(-halfSize, -halfSize, halfSize),
			new Vector3(-halfSize, halfSize, halfSize),
		]);

		return lines;
	}

	/**
	 * 创建圆柱体的简化线框
	 * 绘制顶部圆环、底部圆环和4条垂直线，Y轴单位圆柱（高度1，半径0.5）
	 */
	private _createCylinderWireframe(): Vector3[][] {
		if (!this.shape || this.shape.type !== "cylinder") {
			return [];
		}

		const lines: Vector3[][] = [];
		const segments = 32;
		const radius = 0.5; // 单位圆柱半径，匹配 CreateCylinderVertexData({ diameter: 1 })
		const halfHeight = 0.5; // 单位圆柱半高，匹配 CreateCylinderVertexData({ height: 1 })

		//始终绘制为Y轴圆柱，由父网格的 rotation 和 scaling 来控制方向和大小
		//Y轴：圆在XZ平面
		//顶部圆环
		const topCircle: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			topCircle.push(new Vector3(
				Math.cos(angle) * radius,
				halfHeight,
				Math.sin(angle) * radius
			));
		}
		lines.push(topCircle);

		//底部圆环
		const bottomCircle: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			bottomCircle.push(new Vector3(
				Math.cos(angle) * radius,
				-halfHeight,
				Math.sin(angle) * radius
			));
		}
		lines.push(bottomCircle);

		//4条垂直线
		for (let i = 0; i < 4; i++) {
			const angle = (i / 4) * Math.PI * 2;
			lines.push([
				new Vector3(Math.cos(angle) * radius, -halfHeight, Math.sin(angle) * radius),
				new Vector3(Math.cos(angle) * radius, halfHeight, Math.sin(angle) * radius),
			]);
		}

		return lines;
	}

	/**
	 * 创建胶囊体的简化线框
	 * 胶囊 = 圆柱部分 + 顶部半球 + 底部半球
	 * 
	 * 注意：高度和轴向已烘焙进几何体，这里绘制归一化胶囊（radius=1）
	 * 避免二次缩放导致的尺寸问题
	 */
	private _createCapsuleWireframe(): Vector3[][] {
		if (!this.shape || this.shape.type !== "capsule") {
			return [];
		}

		const capsuleShape = this.shape as ICapsuleShape;
		const lines: Vector3[][] = [];
		const segments = 32;
		const arcSegments = 16;

		//画“归一化胶囊体”（radius=1），再由 CollisionMesh 自身的 scaling 进行缩放到实际半径。
		//简化线框也要反映父节点的缩放规则：
		//垂直于轴向的缩放影响半径
		//轴向缩放影响“圆柱部分长度”（通过总高度变化体现）
		const safeRadius = Math.max(capsuleShape.radius, 1e-4);
		let axisScale = 1;
		let diameterScales: [number, number] = [1, 1];

		const parentScale =
			this.parent && (this.parent as AbstractMesh).absoluteScaling
				? (this.parent as AbstractMesh).absoluteScaling
				: null;

		if (parentScale) {
			switch (capsuleShape.axis) {
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

		const maxDiameterScale = Math.max(...diameterScales);
		const worldRadius = safeRadius * maxDiameterScale;

		const baseTotalHeight = capsuleShape.height; //总高度（包括两个半球）
		const scaledTotalHeight = baseTotalHeight * axisScale;
		const worldTotalHeight = Math.max(2 * worldRadius, scaledTotalHeight);

		//归一化（radius=1）后的总高度
		const radius = 1;
		const totalHeight = worldTotalHeight / worldRadius;
		
		//计算圆柱部分的高度
		const cylinderHeight = totalHeight - radius * 2;
		
		//在局部坐标系中，几何体是以原点为中心的
		//圆柱部分从 -cylinderHeight/2 到 cylinderHeight/2
		const cylTop = cylinderHeight / 2;
		const cylBottom = -cylinderHeight / 2;

		//先按“Y轴胶囊”生成点，最后根据 axis 旋转（等价于 CreateCapsuleVertexData 的 orientation）
		//Y轴：圆在XZ平面
			//圆柱部分的顶部圆环
			const topCircle: Vector3[] = [];
			for (let i = 0; i <= segments; i++) {
				const angle = (i / segments) * Math.PI * 2;
				topCircle.push(new Vector3(
					Math.cos(angle) * radius,
					cylTop,
					Math.sin(angle) * radius
				));
			}
			lines.push(topCircle);

			//圆柱部分的底部圆环
			const bottomCircle: Vector3[] = [];
			for (let i = 0; i <= segments; i++) {
				const angle = (i / segments) * Math.PI * 2;
				bottomCircle.push(new Vector3(
					Math.cos(angle) * radius,
					cylBottom,
					Math.sin(angle) * radius
				));
			}
			lines.push(bottomCircle);

			//圆柱部分的4条垂直线
			for (let i = 0; i < 4; i++) {
				const angle = (i / 4) * Math.PI * 2;
				lines.push([
					new Vector3(Math.cos(angle) * radius, cylBottom, Math.sin(angle) * radius),
					new Vector3(Math.cos(angle) * radius, cylTop, Math.sin(angle) * radius),
				]);
			}

			//顶部半球的半圆弧（XZ和YZ平面）
			const topArcXZ: Vector3[] = [];
			for (let i = 0; i <= arcSegments; i++) {
				const angle = (i / arcSegments) * Math.PI;
				topArcXZ.push(new Vector3(
					Math.cos(angle) * radius,
					cylTop + Math.sin(angle) * radius,
					0
				));
			}
			lines.push(topArcXZ);
			
			const topArcYZ: Vector3[] = [];
			for (let i = 0; i <= arcSegments; i++) {
				const angle = (i / arcSegments) * Math.PI;
				topArcYZ.push(new Vector3(
					0,
					cylTop + Math.sin(angle) * radius,
					Math.cos(angle) * radius
				));
			}
			lines.push(topArcYZ);

			//底部半球的半圆弧
			const bottomArcXZ: Vector3[] = [];
			for (let i = 0; i <= arcSegments; i++) {
				const angle = (i / arcSegments) * Math.PI;
				bottomArcXZ.push(new Vector3(
					Math.cos(angle) * radius,
					cylBottom - Math.sin(angle) * radius,
					0
				));
			}
			lines.push(bottomArcXZ);
			
			const bottomArcYZ: Vector3[] = [];
			for (let i = 0; i <= arcSegments; i++) {
				const angle = (i / arcSegments) * Math.PI;
				bottomArcYZ.push(new Vector3(
					0,
					cylBottom - Math.sin(angle) * radius,
					Math.cos(angle) * radius
				));
			}
			lines.push(bottomArcYZ);

		//根据 axis 旋转点集，保持和几何体 orientation 一致
		if (capsuleShape.axis !== "y") {
			for (const polyline of lines) {
				for (const p of polyline) {
					if (capsuleShape.axis === "x") {
						//旋转到 X 轴（绕 Z 轴 +90°）：(x,y,z) -> (-y, x, z)
						const x = p.x;
						const y = p.y;
						p.x = -y;
						p.y = x;
					} else if (capsuleShape.axis === "z") {
						//旋转到 Z 轴（绕 X 轴 -90°）：(x,y,z) -> (x, z, -y)
						const y = p.y;
						const z = p.z;
						p.y = z;
						p.z = -y;
					}
				}
			}
		}

		return lines;
	}
}
