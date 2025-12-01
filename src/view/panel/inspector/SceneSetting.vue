<template>
    <div>
        <SectionField title="Colors">
            <Color label="Clear" :object="object" property="clearColor" />
            <Color label="Ambient" :object="object" property="ambientColor" />
        </SectionField>

        <SectionField title="Environment">
            <Texture acceptCubeTexture title="Environment Texture" :object="object" property="environmentTexture"
                @change="force" />
        </SectionField>

        <SectionField title="Fog">
            <Switch label="Enabled" :object="object" property="fogEnabled" @change="force" />

            <template v-if="object.fogEnabled">
                <div class="flex items-center gap-2">
                    <div class="w-24">Mode</div>
                    <el-select v-model="fogMode" @change="onFogModeChange">
                        <el-option :label="'None'" :value="Scene.FOGMODE_NONE" />
                        <el-option :label="'Linear'" :value="Scene.FOGMODE_LINEAR" />
                        <el-option :label="'Exp'" :value="Scene.FOGMODE_EXP" />
                        <el-option :label="'Exp2'" :value="Scene.FOGMODE_EXP2" />
                    </el-select>
                </div>

                <template v-if="object.fogMode === Scene.FOGMODE_LINEAR">
                    <Number label="Start" :object="object" property="fogStart" />
                    <Number label="End" :object="object" property="fogEnd" />
                </template>

                <template v-if="object.fogMode === Scene.FOGMODE_EXP || object.fogMode === Scene.FOGMODE_EXP2">
                    <Number label="Density" :object="object" property="fogDensity" />
                </template>

                <Color label="Color" :object="object" property="fogColor" />
            </template>
        </SectionField>

        <SectionField v-if="physicsEngine" title="Physics">
            <Vector :object="gravityProxy" property="gravity" label="Gravity" @finishChange="applyGravity" />
        </SectionField>

        <SectionField title="Rendering Pipeline">
            <Switch label="Enabled" :object="defaultPipelineConfig" property="enabled" :noUndoRedo="true"
                @change="toggleDefaultPipeline" />
            <template v-if="defaultRenderingPipeline">
                <Switch label="FXAA Enabled" :object="defaultRenderingPipeline" property="fxaaEnabled" />
            </template>
        </SectionField>

        <template v-if="defaultRenderingPipeline">
            <SectionField title="Image Processing">
                <Switch label="Enabled" :object="defaultRenderingPipeline" property="imageProcessingEnabled"
                    @change="force" />
                <template v-if="defaultRenderingPipeline.imageProcessingEnabled">
                    <Number label="Exposure" :object="defaultRenderingPipeline.imageProcessing" property="exposure" />
                    <Number label="Contrast" :object="defaultRenderingPipeline.imageProcessing" property="contrast" />
                    <Switch label="From Linear Space" :object="defaultRenderingPipeline.imageProcessing"
                        property="fromLinearSpace" />
                    <Switch label="Tone Mapping Enabled" :object="defaultRenderingPipeline.imageProcessing"
                        property="toneMappingEnabled" @change="force" />
                    <template v-if="defaultRenderingPipeline.imageProcessing.toneMappingEnabled">
                        <div class="flex items-center gap-2">
                            <div class="w-40">Tone Mapping Type</div>
                            <el-select v-model="toneMappingType" @change="onToneMappingTypeChange">
                                <el-option :label="'Hable'" :value="TonemappingOperator.Hable" />
                                <el-option :label="'Reinhard'" :value="TonemappingOperator.Reinhard" />
                                <el-option :label="'Heji Dawson'" :value="TonemappingOperator.HejiDawson" />
                                <el-option :label="'Photographic'" :value="TonemappingOperator.Photographic" />
                            </el-select>
                        </div>
                    </template>
                    <Switch label="Dithering Enabled" :object="defaultRenderingPipeline.imageProcessing"
                        property="ditheringEnabled" @change="force" />
                    <template v-if="defaultRenderingPipeline.imageProcessing.ditheringEnabled">
                        <Number label="Dithering Intensity" :object="defaultRenderingPipeline.imageProcessing"
                            property="ditheringIntensity" />
                    </template>
                </template>
            </SectionField>

            <SectionField title="Color Grading" v-if="defaultRenderingPipeline.imageProcessingEnabled">
                <Switch label="Enabled" :object="defaultRenderingPipeline.imageProcessing"
                    property="colorGradingEnabled" @change="force" />
                <template v-if="defaultRenderingPipeline.imageProcessing.colorGradingEnabled">
                    <Texture accept3dlTexture title="Texture" property="colorGradingTexture" :scene="scene"
                        :object="defaultRenderingPipeline.imageProcessing">
                        <Switch label="Use Green Depth"
                            :object="defaultRenderingPipeline.imageProcessing.imageProcessingConfiguration"
                            property="colorGradingWithGreenDepth" />
                    </Texture>
                </template>
            </SectionField>

            <SectionField title="Color Curves">
                <Switch label="Enabled" :object="defaultRenderingPipeline.imageProcessing" property="colorCurvesEnabled"
                    @change="force" />
                <template v-if="defaultRenderingPipeline.imageProcessing.colorCurvesEnabled">
                    <div class="text-xl font-semibold px-2 text-center">Global</div>
                    <Number label="Hue" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="globalHue" :min="0" :max="360" />
                    <Number label="Exposure" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="globalExposure" :min="-100" :max="100" />
                    <Number label="Density" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="globalDensity" :min="-100" :max="100" />
                    <Number label="Saturation" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="globalSaturation" :min="-100" :max="100" />

                    <div class="text-xl font-semibold px-2 text-center">Highlights</div>
                    <Number label="Hue" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="highlightsHue" :min="0" :max="360" />
                    <Number label="Exposure" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="highlightsExposure" :min="-100" :max="100" />
                    <Number label="Density" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="highlightsDensity" :min="-100" :max="100" />
                    <Number label="Saturation" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="highlightsSaturation" :min="-100" :max="100" />

                    <div class="text-xl font-semibold px-2 text-center">Midtones</div>
                    <Number label="Hue" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="midtonesHue" :min="0" :max="360" />
                    <Number label="Exposure" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="midtonesExposure" :min="-100" :max="100" />
                    <Number label="Density" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="midtonesDensity" :min="-100" :max="100" />
                    <Number label="Saturation" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="midtonesSaturation" :min="-100" :max="100" />

                    <div class="text-xl font-semibold px-2 text-center">Shadows</div>
                    <Number label="Hue" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="shadowsHue" :min="0" :max="360" />
                    <Number label="Exposure" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="shadowsExposure" :min="-100" :max="100" />
                    <Number label="Density" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="shadowsDensity" :min="-100" :max="100" />
                    <Number label="Saturation" :object="defaultRenderingPipeline.imageProcessing.colorCurves"
                        property="shadowsSaturation" :min="-100" :max="100" />
                </template>
            </SectionField>

            <SectionField title="Bloom">
                <Switch label="Enabled" :object="defaultRenderingPipeline" property="bloomEnabled" @change="force" />
                <template v-if="defaultRenderingPipeline.bloomEnabled">
                    <Number label="Threshold" :object="defaultRenderingPipeline" property="bloomThreshold" />
                    <Number label="Weight" :object="defaultRenderingPipeline" property="bloomWeight" />
                    <Number label="Scale" :object="defaultRenderingPipeline" property="bloomScale" :min="0" :max="1" />
                    <Number label="Kernal" :object="defaultRenderingPipeline" property="bloomKernel" :step="1" :min="0"
                        :max="512" />
                </template>
            </SectionField>

            <SectionField title="Sharpen">
                <Switch label="Enabled" :object="defaultRenderingPipeline" property="sharpenEnabled" @change="force" />
                <template v-if="defaultRenderingPipeline.sharpenEnabled">
                    <Number label="Edge Amount" :object="defaultRenderingPipeline.sharpen" property="edgeAmount" />
                    <Number label="Color Amount" :object="defaultRenderingPipeline.sharpen" property="colorAmount" />
                </template>
            </SectionField>

            <SectionField title="Grain">
                <Switch label="Enabled" :object="defaultRenderingPipeline" property="grainEnabled" @change="force" />
                <template v-if="defaultRenderingPipeline.grainEnabled">
                    <Number label="Intensity" :object="defaultRenderingPipeline.grain" property="intensity" />
                    <Switch label="Animated" :object="defaultRenderingPipeline.grain" property="animated" />
                </template>
            </SectionField>

            <SectionField title="Depth-of-field">
                <Switch label="Enabled" :object="defaultRenderingPipeline" property="depthOfFieldEnabled"
                    @change="force" />
                <template v-if="defaultRenderingPipeline.depthOfFieldEnabled">
                    <div class="flex items-center gap-2">
                        <div class="w-40">Blur Level</div>
                        <el-select v-model="dofBlurLevel" @change="onDofBlurLevelChange">
                            <el-option :label="'Low'" :value="DepthOfFieldEffectBlurLevel.Low" />
                            <el-option :label="'Medium'" :value="DepthOfFieldEffectBlurLevel.Medium" />
                            <el-option :label="'High'" :value="DepthOfFieldEffectBlurLevel.High" />
                        </el-select>
                    </div>
                    <Number label="Lens Size" :object="defaultRenderingPipeline.depthOfField" property="lensSize"
                        :step="0.1" :min="0" />
                    <Number label="F-stop" :object="defaultRenderingPipeline.depthOfField" property="fStop" :step="0.01"
                        :min="0" />
                    <Number label="Focus Distance" :object="defaultRenderingPipeline.depthOfField"
                        property="focusDistance" :min="0" :step="focusStep" :max="focusMax" />
                    <Number label="Focal Length" :object="defaultRenderingPipeline.depthOfField" property="focalLength"
                        :step="0.01" :min="0" />
                </template>
            </SectionField>
        </template>

        <SectionField title="SSAO2">
            <Switch label="Enabled" :object="ssaoConfig" property="enabled" :noUndoRedo="true" @change="toggleSSAO2" />
            <template v-if="ssao2">
                <Number label="Radius" :object="ssao2" property="radius" />
                <Number label="Total Strength" :object="ssao2" property="totalStrength" />
                <Number label="Area" :object="ssao2" property="area" />
                <Number label="Falloff" :object="ssao2" property="fallOff" />
                <Number label="Base" :object="ssao2" property="base" />
            </template>
        </SectionField>

        <SectionField title="Motion Blur">
            <Switch label="Enabled" :object="motionBlurConfig" property="enabled" :noUndoRedo="true"
                @change="toggleMotionBlur" />
            <template v-if="motionBlur">
                <Switch label="Object Based" :object="motionBlur" property="isObjectBased" />
                <Number label="Motion Strength" :object="motionBlur" property="motionStrength" />
                <Number label="Motion Blur Samples" :object="motionBlur" property="motionBlurSamples" :min="0"
                    :step="1" />
            </template>
        </SectionField>

        <SectionField title="Reflections">
            <Switch label="Enabled" :object="ssrConfig" property="enabled" :noUndoRedo="true" @change="toggleSSR" />
            <template v-if="ssr">
                <Number label="Step" :object="ssr" property="step" :min="0" />
                <Number label="Thickness" :object="ssr" property="thickness" />
                <Number label="Strength" :object="ssr" property="strength" :min="0" />
                <Number label="Reflection Specular Falloff Exponent" :object="ssr"
                    property="reflectionSpecularFalloffExponent" :min="0" />
                <Number label="Max Steps" :object="ssr" property="maxSteps" :min="0" />
                <Number label="Max Distance" :object="ssr" property="maxDistance" :min="0" />

                <Number label="Roughness Factors" :object="ssr" property="roughnessFactor" :min="0" :max="1" />
                <Number label="Reflectivity Threshold" :object="ssr" property="reflectivityThreshold" :min="0" />
                <Number label="Blur Dispersion Strength" :object="ssr" property="blurDispersionStrength" :min="0" />

                <Switch label="Clip To Frustum" :object="ssr" property="clipToFrustum" />
                <Switch label="Enable Smooth Reflections" :object="ssr" property="enableSmoothReflections" />
                <Switch label="Enable Automatic Thickness Computation" :object="ssr"
                    property="enableAutomaticThicknessComputation" />
                <Switch label="Attenuate Facing Camera" :object="ssr" property="attenuateFacingCamera" />
            </template>
        </SectionField>

        <SectionField title="Volumetric Light Scattering">
            <Switch label="Enabled" :object="vlsConfig" property="enabled" :noUndoRedo="true" @change="toggleVLS" />
            <template v-if="vls">
                <Number label="Exposure" :object="vls" property="exposure" :min="0" />
                <Number label="Weight" :object="vls" property="weight" :min="0" />
                <Number label="Decay" :object="vls" property="decay" :min="0" />
                <Number label="Density" :object="vls" property="density" :min="0" />
                <Number label="New Mesh Position" :object="vls" property="newMeshPosition" />

                <div @drop.prevent="ev => handleDropVlsMesh(ev)" @dragover.prevent="handleDragOverVlsMesh"
                    @dragleave="dragOverVlsMesh = false"
                    :class="['flex flex-col justify-center items-center w-full h-[64px] rounded-lg border-[1px] border-secondary-foreground/35 border-dashed transition-all duration-300 ease-in-out', dragOverVlsMesh ? 'bg-secondary-foreground/35' : '']">
                    <template v-if="!vls.mesh">
                        <div>Drag'n'drop a mesh here</div>
                    </template>
                    <template v-else>
                        <div class="flex flex-col items-center gap-2">
                            <div class="flex items-center gap-2">
                                <span class="w-4 h-4">■</span>
                                {{ vls.mesh.name }}
                            </div>
                            <div class="text-xs">Drag'n'drop a mesh here</div>
                        </div>
                    </template>
                </div>
            </template>
        </SectionField>
    </div>

</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Scene, DepthOfFieldEffectBlurLevel, TonemappingOperator, VolumetricLightScatteringPostProcess } from "@babylonjs/core";
import { registerUndoRedo } from "@/tools/undoredo";
import { updateAllLights } from "@/tools/light/shadows";
import { updateIblShadowsRenderPipeline } from "@/tools/light/ibl";
import { createDefaultRenderingPipeline, disposeDefaultRenderingPipeline, getDefaultRenderingPipeline, parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "@/rendering/default-pipeline";
import { createSSAO2RenderingPipeline, disposeSSAO2RenderingPipeline, getSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline } from "@/rendering/ssao";
import { createSSRRenderingPipeline, disposeSSRRenderingPipeline, getSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from "@/rendering/ssr";
import { createMotionBlurPostProcess, disposeMotionBlurPostProcess, getMotionBlurPostProcess, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "@/rendering/motion-blur";
import { createVLSPostProcess, disposeVLSPostProcess, getVLSPostProcess, parseVLSPostProcess, serializeVLSPostProcess } from "@/rendering/vls";
import SectionField from "@/component/common/SectionField.vue";
import Color from "@/component/base/Color.vue";
import Texture from "@/component/base/Texture.vue";
import Switch from "@/component/base/Switch.vue";
import Number from "@/component/base/Number.vue";
import Vector from "@/component/base/Vector.vue";
import { Editor } from "@/3d/Editor";

const props = defineProps<{ object: Scene; }>();

const scene = computed(() => Editor.Instance.Scene);
const physicsEngine = computed(() => Editor.Instance.Scene.getPhysicsEngine?.());

const force = () => { };

const gravityProxy = ref({ gravity: physicsEngine.value?.gravity?.clone?.() });

const applyGravity = () => {
    if (!physicsEngine.value) return;
    const oldGravity = physicsEngine.value.gravity.clone();
    registerUndoRedo({ executeRedo: true, undo: () => { physicsEngine.value?.setGravity(oldGravity); physicsEngine.value?.gravity?.copyFrom(oldGravity); }, redo: () => { physicsEngine.value?.setGravity(gravityProxy.value.gravity); physicsEngine.value?.gravity?.copyFrom(gravityProxy.value.gravity); } });
};

const defaultRenderingPipeline = computed(() => getDefaultRenderingPipeline());
const defaultPipelineConfig = ref({ enabled: !!defaultRenderingPipeline.value });

const toggleDefaultPipeline = () => {
    const pipeline = defaultRenderingPipeline.value;
    const serializedPipeline = serializeDefaultRenderingPipeline();
    registerUndoRedo({ executeRedo: true, undo: () => { if (!pipeline) { disposeDefaultRenderingPipeline(); } else if (serializedPipeline) { parseDefaultRenderingPipeline(serializedPipeline); } }, redo: () => { if (pipeline) { disposeDefaultRenderingPipeline(); } else if (serializedPipeline) { parseDefaultRenderingPipeline(serializedPipeline); } else { createDefaultRenderingPipeline(); } } });
};

const toneMappingType = ref<number>(defaultRenderingPipeline.value?.imageProcessing?.toneMappingType ?? TonemappingOperator.Hable);
const onToneMappingTypeChange = (v: number) => { if (defaultRenderingPipeline.value?.imageProcessing) defaultRenderingPipeline.value.imageProcessing.toneMappingType = v; };

const focusStep = computed(() => (Editor.Instance.Scene.activeCamera?.maxZ ?? 0) / 1000);
const focusMax = computed(() => (Editor.Instance.Scene.activeCamera?.maxZ ?? 0) * 1000);

const dofBlurLevel = ref<number>(defaultRenderingPipeline.value?.depthOfFieldBlurLevel ?? DepthOfFieldEffectBlurLevel.Low);
const onDofBlurLevelChange = (v: number) => { if (defaultRenderingPipeline.value) defaultRenderingPipeline.value.depthOfFieldBlurLevel = v; };

const ssao2 = computed(() => getSSAO2RenderingPipeline());
const ssaoConfig = ref({ enabled: !!ssao2.value });
const toggleSSAO2 = () => {
    const pipeline = ssao2.value;
    const serialized = serializeSSAO2RenderingPipeline();
    registerUndoRedo({ executeRedo: true, undo: () => { if (!pipeline) { disposeSSAO2RenderingPipeline(); } else if (serialized) { parseSSAO2RenderingPipeline(serialized); } }, redo: () => { if (pipeline) { disposeSSAO2RenderingPipeline(); } else if (serialized) { parseSSAO2RenderingPipeline(serialized); } else { createSSAO2RenderingPipeline(); } } });
};

const motionBlur = computed(() => getMotionBlurPostProcess());
const motionBlurConfig = ref({ enabled: !!motionBlur.value });
const toggleMotionBlur = () => {
    const post = motionBlur.value;
    const serialized = serializeMotionBlurPostProcess();
    registerUndoRedo({ executeRedo: true, undo: () => { if (!post) { disposeMotionBlurPostProcess(); } else if (serialized) { parseMotionBlurPostProcess(serialized); } }, redo: () => { if (post) { disposeMotionBlurPostProcess(); } else if (serialized) { parseMotionBlurPostProcess(serialized); } else { createMotionBlurPostProcess(); } } });
};

const ssr = computed(() => getSSRRenderingPipeline());
const ssrConfig = ref({ enabled: !!ssr.value });
const toggleSSR = () => {
    const pipeline = ssr.value;
    const serialized = serializeSSRRenderingPipeline();
    registerUndoRedo({ executeRedo: true, undo: () => { if (!pipeline) { disposeSSRRenderingPipeline(); } else if (serialized) { parseSSRRenderingPipeline(serialized); } }, redo: () => { if (pipeline) { disposeSSRRenderingPipeline(); } else if (serialized) { parseSSRRenderingPipeline(serialized); } else { createSSRRenderingPipeline(); } } });
};

const vls = computed(() => getVLSPostProcess());
const vlsConfig = ref({ enabled: !!vls.value });
const toggleVLS = () => {
    const post = vls.value;
    const serialized = serializeVLSPostProcess();
    registerUndoRedo({ executeRedo: true, undo: () => { if (!post) { disposeVLSPostProcess(); } else if (serialized) { parseVLSPostProcess(serialized); } }, redo: () => { if (post) { disposeVLSPostProcess(); } else if (serialized) { parseVLSPostProcess(serialized); } else { createVLSPostProcess(); } } });
};

const dragOverVlsMesh = ref(false);
const handleDragOverVlsMesh = (event: DragEvent) => { event.preventDefault(); dragOverVlsMesh.value = true; };
const handleDropVlsMesh = (event: DragEvent) => {
    event.preventDefault();
    dragOverVlsMesh.value = false;
    const eventData = event.dataTransfer?.getData("graph/node");
    // const node = props.editor.layout.graph.getSelectedNodes?.()[0]?.nodeData;
    const node = Editor.Instance.selectNodes[0];
    if (eventData && node && node && node.getClassName && node.getClassName() && typeof node.name === 'string') {
        const post = vls.value as VolumetricLightScatteringPostProcess;
        if (!post) return;
        const oldMesh = post.mesh;
        registerUndoRedo({ executeRedo: true, undo: () => { post.mesh = oldMesh; const s = serializeVLSPostProcess(); disposeVLSPostProcess(); parseVLSPostProcess(s); }, redo: () => { post.mesh = node as any; const s = serializeVLSPostProcess(); disposeVLSPostProcess(); parseVLSPostProcess(s); } });
    }
};

const fogMode = ref<number>(props.object.fogMode);
const onFogModeChange = (v: number) => { const oldValue = props.object.fogMode; const newValue = v; props.object.fogMode = newValue; registerUndoRedo({ executeRedo: true, undo: () => { props.object.fogMode = oldValue; }, redo: () => { props.object.fogMode = newValue; } }); }

</script>
