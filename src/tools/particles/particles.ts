import {
	ParticleSystem,
	GPUParticleSystem,
	IParticleSystem,
	AbstractMesh,
	Vector3,
	TransformNode,
	ParticleHelper,
	ParticleSystemSet,
	Scene,
	EngineStore,
	Tools,
	Nullable,
	Color4,
	Texture,
	SphereParticleEmitter,
	BoxParticleEmitter,
	CylinderParticleEmitter,
	MeshParticleEmitter,
	Mesh,
	MeshBuilder,
	PointerEventTypes,
} from '@babylonjs/core';

import { UniqueNumber } from '../../tools/tools';
import { Editor } from '@/3d/Editor';
import { ParticleContainer } from '@/3d/core/Extension/ParticleContainer';

ParticleSystemSet.BaseAssetsUrl = '/particle';
ParticleHelper.BaseAssetsUrl = '/particle';
export function addParticleSystem(type: string) {
	if (type == 'default') {
		const pos = new ParticleContainer(type, Editor.Instance.Scene);
		const particleSystem = CreateDefault(pos.position);
		particleSystem.start();
		const set = new ParticleSystemSet();
		set.systems.push(particleSystem);
		pos.particleSystems = set;
		set.emitterNode = pos.position;
		Editor.Instance.UpdateHierarchy();
	 }
	 // else if (type == 'gpu') {
	// 	CreateGpuParticle();
	// }
	// else if (type === 'tech') {
	// 	CreateTechParticle();
	// }
	else {
		ParticleHelper.CreateAsync(type, Editor.Instance.Scene).then((set) => {
			const pos = new ParticleContainer(type, Editor.Instance.Scene);
			set.start();
			pos.particleSystems = set;
			set.systems.forEach((system) => {
				system.particleTexture.sourceUUID = system.particleTexture.name.split('/').pop() || '';
			});
			set.emitterNode = pos.position;
			Editor.Instance.UpdateHierarchy();
		});
	}

	function CreateDefault(
		emitter: Nullable<AbstractMesh | Vector3>,
		capacity: number = 500,
		scene?: Scene,
		useGPU?: boolean,
	): IParticleSystem {
		let system;
		if (useGPU) {
			system = new GPUParticleSystem('default system', { capacity: capacity }, scene);
		} else {
			system = new ParticleSystem('default system', capacity, scene);
		}
		system.emitter = emitter;
		const textureUrl = Tools.GetAssetUrl('/particle/textures/default/flare.png');
		system.particleTexture = new Texture(textureUrl, system.getScene());
		system.particleTexture.sourceUUID = 'flare.png';
		system.createConeEmitter(0.1, Math.PI / 4);
		// Particle color
		system.color1 = new Color4(1.0, 1.0, 1.0, 1.0);
		system.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
		system.colorDead = new Color4(1.0, 1.0, 1.0, 0.0);
		// Particle Size
		system.minSize = 0.1;
		system.maxSize = 0.1;
		// Emission speed
		system.minEmitPower = 2;
		system.maxEmitPower = 2;
		// Update speed
		system.updateSpeed = 1 / 60;
		system.emitRate = 30;
		system.isDefaultexture = true;
		return system;
	}
}
// let pos: ParticleContainer;
// let gpuParticle: GPUParticleSystem;
// let emitterMesh: Mesh | null = null;
// let basePositions: Float32Array | null = null;
// var alpha = 0;
// let isPointMove = false;
// function CreateGpuParticle() {
// 	if (GPUParticleSystem.IsSupported) {
// 		//	var fountain = MeshBuilder.CreateBox("foutain", { size: 0 }, Editor.Instance.Scene);
// 		gpuParticle = new GPUParticleSystem("particles", { capacity: 1000000 }, Editor.Instance.Scene);
// 		gpuParticle.maxActiveParticleCount = 200000;
// 		gpuParticle.emitRate = 10000;
// 		gpuParticle.particleEmitterType = new SphereParticleEmitter(1);
// 		const textureUrl = Tools.GetAssetUrl('/particle/textures/default/flare.png');
// 		gpuParticle.particleTexture = new Texture(textureUrl, gpuParticle.getScene());
// 		gpuParticle.maxLifeTime = 10;
// 		gpuParticle.minSize = 0.01;
// 		gpuParticle.maxSize = 0.1;
// 		gpuParticle.emitter = new Vector3(0, 0, 0);
// 		//color1 科技蓝 color2 白色 colorDead 透明
// 		(gpuParticle as any)['color1'] = new Color4(0.4, 0.7, 1.0, 1.0);
// 		(gpuParticle as any)['color2'] = new Color4(0.2, 0.5, 1.0, 1.0);
// 		(gpuParticle as any)['colorDead'] = new Color4(0.1, 0.2, 0.4, 0.0);
// 		gpuParticle.start();
// 		pos = new ParticleContainer('gpu', Editor.Instance.Scene);
// 		const set = new ParticleSystemSet();
// 		set.systems.push(gpuParticle);
// 		pos.particleSystems = set;
// 		set.emitterNode = pos.position;
// 		Editor.Instance.UpdateHierarchy();
// 	}
// 	Editor.Instance.Scene.registerBeforeRender(function () {
// 		if (!isPointMove) {
// 			pos.position.x = 5 * Math.cos(alpha);
// 			pos.position.z = 5 * Math.sin(alpha);
// 			alpha += 0.01;
// 		}

// 		//鼠标按下时跟着鼠标移动

// 	});
// 	// 跟随鼠标移动发射位置（右键键按住）

// 	Editor.Instance.Scene.onPointerObservable.add((pointerInfo) => {
// 		if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
// 			isPointMove = true;
// 		}
// 		if (pointerInfo.type === PointerEventTypes.POINTERUP) {
// 			isPointMove = false;
// 		}
// 		if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
// 			const evt = pointerInfo.event as PointerEvent;
// 			if ((evt.buttons & 1) === 1) {
// 				const bound = Editor.Instance.Engine.getRenderingCanvas().getBoundingClientRect();
// 				const p = Editor.Instance.getRaycastPoint(evt.clientX - bound.left, evt.clientY - bound.top);
// 				if (p && pos) {
// 					// 获取相机位置
// 					const cameraPos = Editor.Instance.Scene.activeCamera.position;
// 					// 计算当前粒子容器与相机的距离
// 					const currentDistance = Vector3.Distance(pos.position, cameraPos);
// 					// 计算从相机到新点击点的向量
// 					const cameraToPoint = p.subtract(cameraPos);
// 					// 归一化向量
// 					cameraToPoint.normalize();
// 					// 缩放向量到当前距离
// 					const newPos = cameraPos.add(cameraToPoint.scale(currentDistance));
// 					// 设置新位置
// 					pos.position.copyFrom(newPos);
// 				}
// 			}
// 		}
// 	});
// }
// function CreateTechParticle() {
// 	if (!GPUParticleSystem.IsSupported) return;
// 	gpuParticle = new GPUParticleSystem("techParticles", { capacity: 600000 }, Editor.Instance.Scene);
// 	gpuParticle.maxActiveParticleCount = 250000;
// 	gpuParticle.emitRate = 60000;
// 	gpuParticle.minLifeTime = 2;
// 	gpuParticle.maxLifeTime = 4;
// 	gpuParticle.minSize = 0.01;
// 	gpuParticle.maxSize = 0.06;
// 	gpuParticle.updateSpeed = 1 / 60;
// 	const textureUrl = Tools.GetAssetUrl('/particle/textures/default/flare.png');
// 	gpuParticle.particleTexture = new Texture(textureUrl, gpuParticle.getScene());
// 	(gpuParticle as any)['color1'] = new Color4(0.4, 0.7, 1.0, 1.0);
// 	(gpuParticle as any)['color2'] = new Color4(0.2, 0.5, 1.0, 1.0);
// 	(gpuParticle as any)['colorDead'] = new Color4(0.1, 0.2, 0.4, 0.0);
// 	if (emitterMesh) { emitterMesh.dispose(); emitterMesh = null; }
// 	emitterMesh = MeshBuilder.CreateSphere('techEmitter', { diameter: 3, segments: 48 }, Editor.Instance.Scene);
// 	basePositions = new Float32Array(emitterMesh.getVerticesData('position')!);
// 	gpuParticle.particleEmitterType = new MeshParticleEmitter(emitterMesh);
// 	gpuParticle.emitter = emitterMesh;
// 	gpuParticle.start();
// 	let t = 0;
// 	Editor.Instance.Scene.onBeforeRenderObservable.add(() => {
// 		if (!emitterMesh || !basePositions) return;
// 		const pos = emitterMesh.getVerticesData('position')!;
// 		t += Editor.Instance.Scene.getEngine().getDeltaTime() * 0.001;
// 		const amp = 0.6;
// 		for (let i = 0; i < pos.length; i += 3) {
// 			const bx = basePositions[i], by = basePositions[i + 1], bz = basePositions[i + 2];
// 			const r = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
// 			const nx = bx / r, ny = by / r, nz = bz / r;
// 			const s = 1.5;
// 			const n =
// 				Math.sin(bx * s + t * 1.7) +
// 				Math.cos(by * s * 1.13 + t * 1.3) +
// 				Math.sin(bz * s * 0.87 + t * 1.1);
// 			const rr = r + amp * (n / 3);
// 			pos[i] = nx * rr;
// 			pos[i + 1] = ny * rr;
// 			pos[i + 2] = nz * rr;
// 		}
// 		emitterMesh.updateVerticesData('position', pos, true);
// 	});
// 	const posNode = new ParticleContainer('tech', Editor.Instance.Scene);
// 	const set = new ParticleSystemSet();
// 	set.systems.push(gpuParticle);
// 	posNode.particleSystems = set;
// 	set.emitterNode = posNode.position;
// 	Editor.Instance.UpdateHierarchy();
// }



// export function ChangeGpuParticleEmitterMesh(type: string) {
// 	if (!gpuParticle) return;

// 	switch (type) {
// 		case 'sphere':
// 			if (emitterMesh) { emitterMesh.dispose(); emitterMesh = null; }
// 			gpuParticle.particleEmitterType = new SphereParticleEmitter(1);
// 			break;
// 		case 'box':
// 			if (emitterMesh) { emitterMesh.dispose(); emitterMesh = null; }
// 			gpuParticle.particleEmitterType = new BoxParticleEmitter();
// 			break;
// 		case 'cylinder':
// 			if (emitterMesh) { emitterMesh.dispose(); emitterMesh = null; }
// 			gpuParticle.particleEmitterType = new CylinderParticleEmitter(1, 1, 1);
// 			break;
// 		case 'sphere2':
// 			if (emitterMesh) { emitterMesh.dispose(); }
// 			emitterMesh = MeshBuilder.CreateSphere('particleEmitterSphere', { diameter: 1, segments: 8 }, Editor.Instance.Scene);
// 			gpuParticle.particleEmitterType = new MeshParticleEmitter(emitterMesh);
// 			gpuParticle.emitter = emitterMesh;
// 			break;
// 		case 'mesh:box':
// 			if (emitterMesh) { emitterMesh.dispose(); }
// 			emitterMesh = MeshBuilder.CreateBox('particleEmitterBox', { size: 1 }, Editor.Instance.Scene);
// 			gpuParticle.particleEmitterType = new MeshParticleEmitter(emitterMesh);
// 			gpuParticle.emitter = emitterMesh;
// 			break;
// 		case 'mesh:cylinder':
// 			if (emitterMesh) { emitterMesh.dispose(); }
// 			emitterMesh = MeshBuilder.CreateCylinder('particleEmitterCylinder', { diameter: 1, height: 1 }, Editor.Instance.Scene);
// 			gpuParticle.particleEmitterType = new MeshParticleEmitter(emitterMesh);
// 			gpuParticle.emitter = emitterMesh;
// 			break;
// 	}
// }
