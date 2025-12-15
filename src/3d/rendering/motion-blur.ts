import { MotionBlurPostProcess, Texture, Scene } from '@babylonjs/core';

export function createMotionBlurPostProcess(scene: Scene): MotionBlurPostProcess {
  const motionBlurPostProcess = new MotionBlurPostProcess(
    'MotionBlurPostProcess',
    scene,
    1.0,
    scene.activeCamera,
    Texture.TRILINEAR_SAMPLINGMODE,
    undefined,
    false,
    undefined,
    undefined,
    false,
  );
  motionBlurPostProcess.samples = 16;
  motionBlurPostProcess.motionStrength = 1.0;
  motionBlurPostProcess.isObjectBased = true;

  return motionBlurPostProcess;
}

export function serializeMotionBlurPostProcess(motionBlurPostProcess: MotionBlurPostProcess): any {
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

export function parseMotionBlurPostProcess(data: any, scene: Scene): MotionBlurPostProcess {
  if (!data) {
    return null;
  }
  const motionBlurPostProcess = createMotionBlurPostProcess(scene);
  scene.postProcesses.push(motionBlurPostProcess);
  motionBlurPostProcess.isObjectBased = data.isObjectBased;
  motionBlurPostProcess.motionStrength = data.motionStrength;
  motionBlurPostProcess.motionBlurSamples = data.motionBlurSamples;

  if (data.samples) {
    motionBlurPostProcess.samples = data.samples;
  }

  return motionBlurPostProcess;
}
