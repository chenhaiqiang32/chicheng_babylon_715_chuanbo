import { ParticleSystem, GPUParticleSystem, IParticleSystem, AbstractMesh, Vector3, TransformNode, ParticleHelper, ParticleSystemSet, Scene, EngineStore, Tools, Nullable, Color4, Texture } from "@babylonjs/core";

import { UniqueNumber } from "../../tools/tools";
import { Editor } from "@/3d/Editor";

ParticleSystemSet.BaseAssetsUrl = "/particle";
ParticleHelper.BaseAssetsUrl = "/particle";
export function addParticleSystem(type: string) {
	if (type == "default") {
		const pos = new TransformNode(type, Editor.Instance.Scene);
		const particleSystem = CreateDefault(pos.position);
		particleSystem.start();
		const set = new ParticleSystemSet();
		set.systems.push(particleSystem);
		pos.particleSystem = set;
		set.emitterNode = pos.position;
		Editor.Instance.UpdateHierarchy();
	} else {
		ParticleHelper.CreateAsync(type, Editor.Instance.Scene).then((set) => {
			const pos = new TransformNode(type, Editor.Instance.Scene);
			set.start();
			pos.particleSystem = set;
			set.emitterNode = pos.position;
			Editor.Instance.UpdateHierarchy();

		});
	}
	function CreateDefault(emitter: Nullable<AbstractMesh | Vector3>, capacity: number = 500, scene?: Scene, useGPU?: boolean): IParticleSystem {
		let system;
		if (useGPU) {
			system = new GPUParticleSystem("default system", { capacity: capacity }, scene);
		}
		else {
			system = new ParticleSystem("default system", capacity, scene);
		}
		system.emitter = emitter;
		const textureUrl = Tools.GetAssetUrl("/particle/textures/default/flare.png");
		system.particleTexture = new Texture(textureUrl, system.getScene());
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
		return system;
	}
}

export function addGPUParticleSystem() {
	// const pos = new TransformNode("GPUParticleSystem", Editor.Instance.Scene);
	// const particleSystem = new GPUParticleSystem(
	// 	"New GPU Particle System",
	// 	{
	// 		capacity: 100_000,
	// 	},
	// 	Editor.Instance.Scene
	// );
	// particleSystem.id = Tools.RandomId();
	// particleSystem.uniqueId = UniqueNumber.Get();
	// particleSystem.emitter = pos.position;
	// particleSystem.preventAutoStart = true;

	// particleSystem.emitRate = 1000;
	// particleSystem.minSize = 1;
	// particleSystem.maxSize = 100;

	// particleSystem.direction1.set(-100, -100, -100);
	// particleSystem.direction2.set(100, 100, 100);

	// particleSystem.minEmitBox.set(-100, -100, -100);
	// particleSystem.maxEmitBox.set(100, 100, 100);
	// pos.gpuParticleSystem = particleSystem;

	// Editor.Instance.UpdateHierarchy();
}
export function isParticleSystem(object: any): object is ParticleSystem {
	return object.getClassName?.() === "ParticleSystem";
}

/**
 * Returns wether or not the given object is a GPUParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isGPUParticleSystem(object: any): object is GPUParticleSystem {
	return object.getClassName?.() === "GPUParticleSystem";
}

/**
 * Returns wether or not the given object is a IParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isAnyParticleSystem(object: any): object is IParticleSystem {
	switch (object.getClassName?.()) {
		case "ParticleSystem":
		case "GPUParticleSystem":
			return true;
	}

	return false;
}