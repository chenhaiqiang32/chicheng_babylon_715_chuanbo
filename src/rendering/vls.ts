import { VolumetricLightScatteringPostProcess, Vector3, Mesh, Texture, Camera } from "@babylonjs/core";

import { isMesh } from "@/tools/guards/nodes";
import { Editor } from "@/3d/Editor";


let vlsPostProcess: VolumetricLightScatteringPostProcess | null = null;

/**
 * Defines the configuration of the motion blur post-process per camera.
 */
export const vlsPostProcessCameraConfigurations = new Map<Camera, any>();

export function getVLSPostProcess(): VolumetricLightScatteringPostProcess | null {
	return vlsPostProcess;
}

export function disposeVLSPostProcess(): void {
	const activeCamera = Editor.Instance.Scene.activeCamera;

	if (vlsPostProcess && activeCamera) {
		vlsPostProcess.dispose(activeCamera);
		vlsPostProcess = null;
	}
}

export function createVLSPostProcess( mesh?: Mesh | null): VolumetricLightScatteringPostProcess {
	const scene = Editor.Instance.Scene;
	mesh ??= scene.meshes.find((mesh) => isMesh(mesh)) as Mesh;

	vlsPostProcess = new VolumetricLightScatteringPostProcess(
		"VolumetricLightScatteringPostProcess",
		1.0,
		scene.activeCamera,
		mesh,
		100,
		Texture.BILINEAR_SAMPLINGMODE,
		scene.getEngine(),
		false
	);

	return vlsPostProcess;
}

export function serializeVLSPostProcess(): any {
	if (!vlsPostProcess) {
		return null;
	}

	return {
		meshId: vlsPostProcess.mesh?.id,
		exposure: vlsPostProcess.exposure,
		decay: vlsPostProcess.decay,
		weight: vlsPostProcess.weight,
		density: vlsPostProcess.density,
		invert: vlsPostProcess.invert,
		useCustomMeshPosition: vlsPostProcess.useCustomMeshPosition,
		customMeshPosition: vlsPostProcess.customMeshPosition.asArray(),
	};
}

export function parseVLSPostProcess( data: any): VolumetricLightScatteringPostProcess {
	let mesh: Mesh | null = null;

	if (data.meshId) {
		const result = Editor.Instance.Scene.getMeshById(data.meshId);
		if (result && isMesh(result)) {
			mesh = result;
		}
	}

	const vlsPostProcess = createVLSPostProcess( mesh);

	vlsPostProcess.exposure = data.exposure;
	vlsPostProcess.decay = data.decay;
	vlsPostProcess.weight = data.weight;
	vlsPostProcess.density = data.density;
	vlsPostProcess.invert = data.invert;
	vlsPostProcess.useCustomMeshPosition = data.useCustomMeshPosition;
	vlsPostProcess.customMeshPosition.copyFrom(Vector3.FromArray(data.customMeshPosition));

	return vlsPostProcess;
}
