import { SSRRenderingPipeline, Camera, Scene } from '@babylonjs/core';

export function createSSRRenderingPipeline(scene: Scene): SSRRenderingPipeline {
  const ssrRenderingPipeline = new SSRRenderingPipeline(
    'SSRRenderingPipeline',
    scene,
    scene.cameras,
    false,
  );
  ssrRenderingPipeline.samples = 16;

  return ssrRenderingPipeline;
}

export function serializeSSRRenderingPipeline(ssrRenderingPipeline: SSRRenderingPipeline): any {
  if (!ssrRenderingPipeline) {
    return null;
  }
  return {
    samples: ssrRenderingPipeline.samples,

    step: ssrRenderingPipeline.step,
    thickness: ssrRenderingPipeline.thickness,
    strength: ssrRenderingPipeline.strength,
    reflectionSpecularFalloffExponent: ssrRenderingPipeline.reflectionSpecularFalloffExponent,
    maxSteps: ssrRenderingPipeline.maxSteps,
    maxDistance: ssrRenderingPipeline.maxDistance,

    roughnessFactor: ssrRenderingPipeline.roughnessFactor,
    reflectivityThreshold: ssrRenderingPipeline.reflectivityThreshold,
    blurDispersionStrehgth: ssrRenderingPipeline.blurDispersionStrength,

    clipToFrustum: ssrRenderingPipeline.clipToFrustum,
    enableSmoothReflections: ssrRenderingPipeline.enableSmoothReflections,
    enableAutomaticThicknessComputation: ssrRenderingPipeline.enableAutomaticThicknessComputation,
    attenuateFacingCamera: ssrRenderingPipeline.attenuateFacingCamera,
    attenuateScreenBorders: ssrRenderingPipeline.attenuateScreenBorders,
    attenuateIntersectionDistance: ssrRenderingPipeline.attenuateIntersectionDistance,
    attenuateBackfaceReflection: ssrRenderingPipeline.attenuateBackfaceReflection,

    blurDownsample: ssrRenderingPipeline.blurDownsample,
    selfCollisionNumSkip: ssrRenderingPipeline.selfCollisionNumSkip,
    ssrDownsample: ssrRenderingPipeline.ssrDownsample,
    backfaceDepthTextureDownsample: ssrRenderingPipeline.backfaceDepthTextureDownsample,
  };
}

export function parseSSRRenderingPipeline(data: any, scene: Scene): SSRRenderingPipeline {
  if (!data) {
    return null;
  }
  const ssrRenderingPipeline = createSSRRenderingPipeline(scene);
  ssrRenderingPipeline.samples = data.samples;
  ssrRenderingPipeline.step = data.step;
  ssrRenderingPipeline.thickness = data.thickness;
  ssrRenderingPipeline.strength = data.strength;
  ssrRenderingPipeline.reflectionSpecularFalloffExponent = data.reflectionSpecularFalloffExponent;
  ssrRenderingPipeline.maxSteps = data.maxSteps;
  ssrRenderingPipeline.maxDistance = data.maxDistance;

  ssrRenderingPipeline.roughnessFactor = data.roughnessFactor;
  ssrRenderingPipeline.reflectivityThreshold = data.reflectivityThreshold;
  ssrRenderingPipeline.blurDispersionStrength = data.blurDispersionStrehgth;

  ssrRenderingPipeline.clipToFrustum = data.clipToFrustum;
  ssrRenderingPipeline.enableSmoothReflections = data.enableSmoothReflections;
  ssrRenderingPipeline.enableAutomaticThicknessComputation =
    data.enableAutomaticThicknessComputation;
  ssrRenderingPipeline.attenuateFacingCamera = data.attenuateFacingCamera;
  ssrRenderingPipeline.attenuateScreenBorders = data.attenuateScreenBorders;
  ssrRenderingPipeline.attenuateIntersectionDistance = data.attenuateIntersectionDistance;
  ssrRenderingPipeline.attenuateBackfaceReflection = data.attenuateBackfaceReflection;

  ssrRenderingPipeline.blurDownsample = data.blurDownsample;
  ssrRenderingPipeline.selfCollisionNumSkip = data.selfCollisionNumSkip;
  ssrRenderingPipeline.ssrDownsample = data.ssrDownsample;
  ssrRenderingPipeline.backfaceDepthTextureDownsample = data.backfaceDepthTextureDownsample;

  return ssrRenderingPipeline;
}
