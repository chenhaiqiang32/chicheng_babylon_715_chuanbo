import { SSAO2RenderingPipeline, Camera, Scene } from '@babylonjs/core';

export function createSSAO2RenderingPipeline(scene: Scene): SSAO2RenderingPipeline {
  const ssaoRenderingPipeline = new SSAO2RenderingPipeline(
    'SSAO2RenderingPipeline',
    scene,
    1.0,
    [scene.activeCamera!],
    false,
  );
  ssaoRenderingPipeline.samples = 16;
  return ssaoRenderingPipeline;
}

export function serializeSSAO2RenderingPipeline(
  ssaoRenderingPipeline: SSAO2RenderingPipeline,
): any {
  if (!ssaoRenderingPipeline) {
    return null;
  }

  return {
    radius: ssaoRenderingPipeline.radius,
    totalStrength: ssaoRenderingPipeline.totalStrength,
    samples: ssaoRenderingPipeline.samples,
    maxZ: ssaoRenderingPipeline.maxZ,
    minZAspect: ssaoRenderingPipeline.minZAspect,
    epsilon: ssaoRenderingPipeline.epsilon,
    textureSamples: ssaoRenderingPipeline.textureSamples,
    bypassBlur: ssaoRenderingPipeline.bypassBlur,
    bilateralSamples: ssaoRenderingPipeline.bilateralSamples,
    bilateralSoften: ssaoRenderingPipeline.bilateralSoften,
    bilateralTolerance: ssaoRenderingPipeline.bilateralTolerance,
    expensiveBlur: ssaoRenderingPipeline.expensiveBlur,
  };
}

export function parseSSAO2RenderingPipeline(data: any, scene: Scene): SSAO2RenderingPipeline {
  if (!data) {
    return createSSAO2RenderingPipeline(scene);
  }
  const ssao2RenderingPipeline = createSSAO2RenderingPipeline(scene);
  ssao2RenderingPipeline.radius = data.radius;
  ssao2RenderingPipeline.totalStrength = data.totalStrength;
  ssao2RenderingPipeline.samples = data.samples;
  ssao2RenderingPipeline.maxZ = data.maxZ;
  ssao2RenderingPipeline.minZAspect = data.minZAspect;
  ssao2RenderingPipeline.epsilon = data.epsilon;
  ssao2RenderingPipeline.textureSamples = data.textureSamples;
  ssao2RenderingPipeline.bypassBlur = data.bypassBlur;
  ssao2RenderingPipeline.bilateralSamples = data.bilateralSamples;
  ssao2RenderingPipeline.bilateralSoften = data.bilateralSoften;
  ssao2RenderingPipeline.bilateralTolerance = data.bilateralTolerance;
  ssao2RenderingPipeline.expensiveBlur = data.expensiveBlur;

  return ssao2RenderingPipeline;
}
