import { Editor } from "@/3d/Editor";
import { MotionBlurPostProcess, Camera, Texture } from "@babylonjs/core";


let motionBlurPostProcess: MotionBlurPostProcess | null = null;

/**
 * Defines the configuration of the motion blur post-process per camera.
 */
export const motionBlurPostProcessCameraConfigurations = new Map<Camera, any>();

export function getMotionBlurPostProcess(): MotionBlurPostProcess | null {
	return motionBlurPostProcess;
}

export function disposeMotionBlurPostProcess(): void {
	if (motionBlurPostProcess) {
		motionBlurPostProcess.dispose();
		motionBlurPostProcess = null;
	}
}

export function createMotionBlurPostProcess( ): MotionBlurPostProcess {
	motionBlurPostProcess = new MotionBlurPostProcess(
		"MotionBlurPostProcess",
		Editor.Instance.Scene,
		1.0,
		Editor.Instance.Scene.activeCamera,
		Texture.TRILINEAR_SAMPLINGMODE,
		undefined,
		false,
		undefined,
		undefined,
		false
	);
	motionBlurPostProcess.samples = 16;
	motionBlurPostProcess.motionStrength = 1.0;
	motionBlurPostProcess.isObjectBased = true;

	return motionBlurPostProcess;
}

export function serializeMotionBlurPostProcess(): any {
	if (!motionBlurPostProcess) {
		return null;
	}

	return {
		samples: motionBlurPostProcess.samples,
		isObjectBased: motionBlurPostProcess.isObjectBased,
		motionStrength: motionBlurPostProcess.motionStrength,
		motionBlurSamples: motionBlurPostProcess.motionBlurSamples,
	};
}

export function parseMotionBlurPostProcess( data: any): MotionBlurPostProcess {
	const motionBlurPostProcess = getMotionBlurPostProcess() ?? createMotionBlurPostProcess();

	motionBlurPostProcess.isObjectBased = data.isObjectBased;
	motionBlurPostProcess.motionStrength = data.motionStrength;
	motionBlurPostProcess.motionBlurSamples = data.motionBlurSamples;

	if (data.samples) {
		motionBlurPostProcess.samples = data.samples;
	}

	return motionBlurPostProcess;
}
