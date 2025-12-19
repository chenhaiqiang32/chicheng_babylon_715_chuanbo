import { ParticleSystem, GPUParticleSystem, Tools, AbstractMesh, Vector3, TransformNode, ParticleHelper, ParticleSystemSet } from "@babylonjs/core";

import { UniqueNumber } from "../../tools/tools";
import { Editor } from "@/3d/Editor";


export function addParticleSystem(type: string) {
	const pos = new TransformNode("ParticleSystem", Editor.Instance.Scene);
	if (type == "default") {
		const particleSystem = ParticleHelper.CreateDefault(pos.position);
		particleSystem.start();
		const set = new ParticleSystemSet();
		set.systems.push(particleSystem);
		pos.particleSystem = set;
		set.emitterNode = pos.position;
	} else {
		ParticleHelper.CreateAsync(type, Editor.Instance.Scene).then((set) => {
			set.start();
			pos.particleSystem = set;
			set.emitterNode = pos.position;
		});
	}



	// const particleSystem = new ParticleSystem("New Particle System", 1_000, Editor.Instance.Scene);
	// particleSystem.id = Tools.RandomId();

	// particleSystem.uniqueId = UniqueNumber.Get();
	// particleSystem.emitter = pos.position;
	// particleSystem.preventAutoStart = true;

	// particleSystem.emitRate = 100;
	// particleSystem.minSize = 1;
	// particleSystem.maxSize = 100;


	// particleSystem.direction1.set(-100, -100, -100);
	// particleSystem.direction2.set(100, 100, 100);

	// particleSystem.minEmitBox.set(-100, -100, -100);
	// particleSystem.maxEmitBox.set(100, 100, 100);
	//pos.particleSystem = particleSystem;

	Editor.Instance.UpdateHierarchy();


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
