<template>
    <div>
        <SectionField :title="$t('component.sceneSetting.backgroundcolor')">
            <Color :label="$t('component.sceneSetting.clearColor')" :object="scene" property="clearColor" />
            <Color :label="$t('component.sceneSetting.ambientColor')" :object="scene" property="ambientColor" />
            <Field :title="$t('component.sceneSetting.backgroundType')">
                <el-select v-model="bgType" @change="onBgTypeChange" style="margin-left: auto; width: 100px;">
                    <el-option :label="'背景贴图'" :value=1 />
                    <el-option :label="'图片'" :value=2 />
                    <el-option :label="'全景图'" :value=3 />
                    <el-option :label="'颜色'" :value=4 />
                </el-select>
            </Field>
            <Texture v-if="bgType == 1" :acceptCubeTexture="true"
                :title="$t('component.sceneSetting.backgroundTexture')" :object="scene" property="bgTexture"
                @change="onSelectBgTexture" />
            <Texture v-if="bgType == 2" :acceptCubeTexture="true" :title="$t('component.sceneSetting.backgroundImage')"
                :object="scene" property="bgTexture" @change="onSelectBgImage" />
            <Texture v-if="bgType == 3" :acceptCubeTexture="true"
                :title="$t('component.sceneSetting.background360Image')" :object="scene" property="bgTexture"
                @change="onSelect360BGImage" />
            <Color v-if="bgType == 4" :label="$t('component.sceneSetting.clearColor')" :object="scene"
                property="clearColor" />
        </SectionField>

        <SectionField :title="$t('component.sceneSetting.environment')">
            <Texture :acceptCubeTexture="true" :title="$t('component.sceneSetting.environmentTexture')" :object="scene"
                property="environmentTexture" @change="force" />
            <Slider :label="$t('component.sceneSetting.iblIntensity')" :object="scene" property="iblIntensity"
                @change="force" :min="0" :max="5" />
        </SectionField>
        <SectionField :title="$t('component.sceneSetting.fog')">
            <template #right>
                <Switch :object="scene" property="fogEnabled" @change="force" />
            </template>
            <template v-if="scene.fogEnabled">
                <Field :title="$t('component.sceneSetting.fogColor')">
                    <el-select v-model="fogMode" @change="onFogModeChange" style="margin-left: auto; width: 100px;">
                        <el-option :label="'None'" :value="Scene.FOGMODE_NONE" />
                        <el-option :label="'Linear'" :value="Scene.FOGMODE_LINEAR" />
                        <el-option :label="'Exp'" :value="Scene.FOGMODE_EXP" />
                        <el-option :label="'Exp2'" :value="Scene.FOGMODE_EXP2" />
                    </el-select>
                </Field>
                <template v-if="scene.fogMode === Scene.FOGMODE_LINEAR">
                    <Number label="Start" :object="scene" property="fogStart" />
                    <Number label="End" :object="scene" property="fogEnd" />
                </template>

                <template v-if="scene.fogMode === Scene.FOGMODE_EXP || scene.fogMode === Scene.FOGMODE_EXP2">
                    <Number label="Density" :object="scene" property="fogDensity" />
                </template>

                <Color :label="$t('component.sceneSetting.fogColor')" :object="scene" property="fogColor" />
            </template>
        </SectionField>

        <SectionField :title="$t('component.sceneSetting.renderingPipeline')">
            <Switch label="FXAA Enabled" :object="renderingPipeline" property="fxaaEnabled" />
            <!-- <Switch :label="$t('component.sceneSetting.enabled')" :object="pipelineConfig" property="enabled"
                @change="toggleDefaultPipeline" />
            <template v-if="renderingPipeline">
                <Switch label="FXAA Enabled" :object="renderingPipeline" property="fxaaEnabled" />
            </template> -->
            <template v-if="renderingPipeline">
                <SectionField :title="$t('component.sceneSetting.imageProcessing')">
                    <template #right>
                        <Switch :object="renderingPipeline" property="imageProcessingEnabled" />
                    </template>
                    <template v-if="renderingPipeline.imageProcessingEnabled">
                        <Number :label="$t('component.sceneSetting.exposure')"
                            :object="renderingPipeline.imageProcessing" property="exposure" />
                        <Number :label="$t('component.sceneSetting.contrast')"
                            :object="renderingPipeline.imageProcessing" property="contrast" />
                        <Switch :label="$t('component.sceneSetting.fromLinearSpace')"
                            :object="renderingPipeline.imageProcessing" property="fromLinearSpace" />
                        <Switch :label="$t('component.sceneSetting.toneMappingEnabled')"
                            :object="renderingPipeline.imageProcessing" property="toneMappingEnabled" @change="force" />
                        <template v-if="renderingPipeline.imageProcessing.toneMappingEnabled">
                            <div class="flex items-center gap-2">
                                <div class="w-40">{{ $t('component.sceneSetting.toneMappingType') }}</div>
                                <el-select v-model="toneMappingType" @change="onToneMappingTypeChange">
                                    <el-option :label="$t('component.sceneSetting.hable')"
                                        :value="TonemappingOperator.Hable" />
                                    <el-option :label="$t('component.sceneSetting.reinhard')"
                                        :value="TonemappingOperator.Reinhard" />
                                    <el-option :label="$t('component.sceneSetting.hejiDawson')"
                                        :value="TonemappingOperator.HejiDawson" />
                                    <el-option :label="$t('component.sceneSetting.photographic')"
                                        :value="TonemappingOperator.Photographic" />
                                </el-select>
                            </div>
                        </template>
                        <Switch :label="$t('component.sceneSetting.ditheringEnabled')"
                            :object="renderingPipeline.imageProcessing" property="ditheringEnabled" @change="force" />
                        <template v-if="renderingPipeline.imageProcessing.ditheringEnabled">
                            <Number :label="$t('component.sceneSetting.ditheringIntensity')"
                                :object="renderingPipeline.imageProcessing" property="ditheringIntensity" />
                        </template>
                    </template>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.colorGrading')"
                    v-if="renderingPipeline.imageProcessingEnabled">
                    <Switch :label="$t('component.sceneSetting.enabled')" :object="renderingPipeline.imageProcessing"
                        property="colorGradingEnabled" @change="force" />
                    <template v-if="renderingPipeline.imageProcessing.colorGradingEnabled">
                        <Texture accept3dlTexture :title="$t('component.sceneSetting.texture')"
                            property="colorGradingTexture" :scene="scene" :object="renderingPipeline.imageProcessing">
                            <Switch :label="$t('component.sceneSetting.useGreenDepth')"
                                :object="renderingPipeline.imageProcessing.imageProcessingConfiguration"
                                property="colorGradingWithGreenDepth" />
                        </Texture>
                    </template>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.colorCurves')"
                    v-if="renderingPipeline.imageProcessingEnabled">
                    <Switch :label="$t('component.sceneSetting.enabled')" :object="renderingPipeline.imageProcessing"
                        property="colorCurvesEnabled" @change="force" />

                    <div v-if="renderingPipeline.imageProcessing.colorCurvesEnabled" style="margin-left: 20px;">
                        <div class="colorCurvesClild">{{ $t('component.sceneSetting.global') }}
                            <Number :label="$t('component.sceneSetting.hue')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="globalHue" :min="0"
                                :max="360" />
                            <Number :label="$t('component.sceneSetting.exposure')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="globalExposure"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.density')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="globalDensity"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.saturation')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="globalSaturation"
                                :min="-100" :max="100" />

                        </div>

                        <div class="colorCurvesClild">{{ $t('component.sceneSetting.highlights') }}
                            <Number :label="$t('component.sceneSetting.hue')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="highlightsHue"
                                :min="0" :max="360" />
                            <Number :label="$t('component.sceneSetting.exposure')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="highlightsExposure"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.density')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="highlightsDensity"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.saturation')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="highlightsSaturation"
                                :min="-100" :max="100" />
                        </div>


                        <div class="colorCurvesClild">{{ $t('component.sceneSetting.midtones') }}
                            <Number :label="$t('component.sceneSetting.hue')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="midtonesHue" :min="0"
                                :max="360" />
                            <Number :label="$t('component.sceneSetting.exposure')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="midtonesExposure"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.density')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="midtonesDensity"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.saturation')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="midtonesSaturation"
                                :min="-100" :max="100" />
                        </div>


                        <div class="colorCurvesClild">{{ $t('component.sceneSetting.shadows') }}
                            <Number :label="$t('component.sceneSetting.hue')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="shadowsHue" :min="0"
                                :max="360" />
                            <Number :label="$t('component.sceneSetting.exposure')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="shadowsExposure"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.density')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="shadowsDensity"
                                :min="-100" :max="100" />
                            <Number :label="$t('component.sceneSetting.saturation')"
                                :object="renderingPipeline.imageProcessing.colorCurves" property="shadowsSaturation"
                                :min="-100" :max="100" />
                        </div>

                    </div>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.bloom')">

                    <template #right>
                        <Switch :object="renderingPipeline" property="bloomEnabled" @change="force" />
                    </template>
                    <template v-if="renderingPipeline.bloomEnabled">
                        <Number :label="$t('component.sceneSetting.threshold')" :object="renderingPipeline"
                            property="bloomThreshold" />
                        <Number :label="$t('component.sceneSetting.weight')" :object="renderingPipeline"
                            property="bloomWeight" />
                        <Number :label="$t('component.sceneSetting.scale')" :object="renderingPipeline"
                            property="bloomScale" :min="0" :max="1" />
                        <Number :label="$t('component.sceneSetting.kernal')" :object="renderingPipeline"
                            property="bloomKernel" :step="1" :min="0" :max="512" />
                    </template>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.sharpen')">

                    <template #right>
                        <Switch :object="renderingPipeline" property="sharpenEnabled" @change="force" />
                    </template>
                    <template v-if="renderingPipeline.sharpenEnabled">
                        <Number :label="$t('component.sceneSetting.edgeAmount')" :object="renderingPipeline.sharpen"
                            property="edgeAmount" />
                        <Number :label="$t('component.sceneSetting.colorAmount')" :object="renderingPipeline.sharpen"
                            property="colorAmount" />
                    </template>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.grain')">

                    <template #right>
                        <Switch :object="renderingPipeline" property="grainEnabled" @change="force" />
                    </template>
                    <template v-if="renderingPipeline.grainEnabled">
                        <Number :label="$t('component.sceneSetting.intensity')" :object="renderingPipeline.grain"
                            property="intensity" />
                        <Switch :label="$t('component.sceneSetting.animated')" :object="renderingPipeline.grain"
                            property="animated" />
                    </template>
                </SectionField>

                <SectionField :title="$t('component.sceneSetting.depthOfField')">

                    <template #right>
                        <Switch :object="renderingPipeline" property="depthOfFieldEnabled" @change="force" />
                    </template>
                    <template v-if="renderingPipeline.depthOfFieldEnabled">
                        <div class="flex items-center gap-2">
                            <div class="w-40">{{ $t('component.sceneSetting.blurLevel') }}</div>
                            <el-select v-model="dofBlurLevel" @change="onDofBlurLevelChange">
                                <el-option :label="$t('component.sceneSetting.low')"
                                    :value="DepthOfFieldEffectBlurLevel.Low" />
                                <el-option :label="$t('component.sceneSetting.medium')"
                                    :value="DepthOfFieldEffectBlurLevel.Medium" />
                                <el-option :label="$t('component.sceneSetting.high')"
                                    :value="DepthOfFieldEffectBlurLevel.High" />
                            </el-select>
                        </div>
                        <Number :label="$t('component.sceneSetting.lensSize')" :object="renderingPipeline.depthOfField"
                            property="lensSize" :step="0.1" :min="0" />
                        <Number :label="$t('component.sceneSetting.fStop')" :object="renderingPipeline.depthOfField"
                            property="fStop" :step="0.01" :min="0" />
                        <Number :label="$t('component.sceneSetting.focusDistance')"
                            :object="renderingPipeline.depthOfField" property="focusDistance" :min="0" :step="focusStep"
                            :max="focusMax" />
                        <Number :label="$t('component.sceneSetting.focalLength')"
                            :object="renderingPipeline.depthOfField" property="focalLength" :step="0.01" :min="0" />
                    </template>
                </SectionField>
            </template>
        </SectionField>



        <SectionField :title="$t('component.sceneSetting.ssao2')">
            <template #right>
                <ElSwitch :style="{ height: '20px' }" :label="$t('component.sceneSetting.enabled')" v-model="ssaoConfig"
                    @change="toggleSSAO" />
            </template>

            <template v-if="ssao2">
                <Number :label="$t('component.sceneSetting.radius')" :object="ssao2" property="radius" />
                <Number :label="$t('component.sceneSetting.totalStrength')" :object="ssao2" property="totalStrength" />
                <Number :label="$t('component.sceneSetting.area')" :object="ssao2" property="area" />
                <Number :label="$t('component.sceneSetting.falloff')" :object="ssao2" property="fallOff" />
                <Number :label="$t('component.sceneSetting.base')" :object="ssao2" property="base" />
            </template>
        </SectionField>

        <!-- <SectionField :title="$t('component.sceneSetting.motionBlur')">
            <Switch :label="$t('component.sceneSetting.enabled')" :object="motionBlurConfig" property="enabled"
                :noUndoRedo="true" @change="toggleMotionBlur" />
            <template v-if="motionBlur">
                <Switch :label="$t('component.sceneSetting.objectBased')" :object="motionBlur"
                    property="isObjectBased" />
                <Number :label="$t('component.sceneSetting.motionStrength')" :object="motionBlur"
                    property="motionStrength" />
                <Number :label="$t('component.sceneSetting.motionBlurSamples')" :object="motionBlur"
                    property="motionBlurSamples" :min="0" :step="1" />
            </template>
        </SectionField> -->

        <SectionField :title="$t('component.sceneSetting.reflections')">
            <!-- <Switch :label="$t('component.sceneSetting.enabled')" :object="ssrConfig" property="enabled"
                :noUndoRedo="true" @change="toggleSSR" /> -->
            <template #right>
                <ElSwitch :style="{ height: '20px' }" :label="$t('component.sceneSetting.enabled')" v-model="ssrConfig"
                    @change="toggleSSR" />
            </template>

            <template v-if="ssr">
                <Number :label="$t('component.sceneSetting.step')" :object="ssr" property="step" :min="0" />
                <Number :label="$t('component.sceneSetting.thickness')" :object="ssr" property="thickness" />
                <Number :label="$t('component.sceneSetting.strength')" :object="ssr" property="strength" :min="0" />
                <Number :label="$t('component.sceneSetting.reflectionSpecularFalloffExponent')" :object="ssr"
                    property="reflectionSpecularFalloffExponent" :min="0" />
                <Number :label="$t('component.sceneSetting.maxSteps')" :object="ssr" property="maxSteps" :min="0" />
                <Number :label="$t('component.sceneSetting.maxDistance')" :object="ssr" property="maxDistance"
                    :min="0" />

                <Number :label="$t('component.sceneSetting.roughnessFactor')" :object="ssr" property="roughnessFactor"
                    :min="0" :max="1" />
                <Number :label="$t('component.sceneSetting.reflectivityThreshold')" :object="ssr"
                    property="reflectivityThreshold" :min="0" />
                <Number :label="$t('component.sceneSetting.blurDispersionStrength')" :object="ssr"
                    property="blurDispersionStrength" :min="0" />

                <Switch :label="$t('component.sceneSetting.clipToFrustum')" :object="ssr" property="clipToFrustum" />
                <Switch :label="$t('component.sceneSetting.enableSmoothReflections')" :object="ssr"
                    property="enableSmoothReflections" />
                <Switch :label="$t('component.sceneSetting.enableAutomaticThicknessComputation')" :object="ssr"
                    property="enableAutomaticThicknessComputation" />
                <Switch :label="$t('component.sceneSetting.attenuateFacingCamera')" :object="ssr"
                    property="attenuateFacingCamera" />
            </template>
        </SectionField>
    </div>

</template>

<script setup lang="ts">

import { reactive, ref, shallowRef, watch } from "vue";
import { Scene, DepthOfFieldEffectBlurLevel, TonemappingOperator, DefaultRenderingPipeline, SSAO2RenderingPipeline, SSRRenderingPipeline, Texture as BJS_Texture, Layer, Color4 } from "@babylonjs/core";
import { registerUndoRedo } from "@/tools/undoredo";
import { parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "@/3d/rendering/default-pipeline";
import { parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline } from "@/3d/rendering/ssao";
import { parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from "@/3d/rendering/ssr";
import { createMotionBlurPostProcess, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "@/3d/rendering/motion-blur";
import { createVLSPostProcess, disposeVLSPostProcess, getVLSPostProcess, parseVLSPostProcess, serializeVLSPostProcess } from "@/3d/rendering/vls";
import SectionField from "@/component/common/SectionField.vue";
import Color from "@/component/base/Color.vue";
import Texture from "@/component/base/Texture.vue";
import Switch from "@/component/base/Switch.vue";
import Number from "@/component/base/Number.vue";
import { Editor } from "@/3d/Editor";
import Field from "@/component/common/Field.vue";
import Slider from "@/component/base/Slider.vue";
import { onMounted } from "vue";

import { ElSwitch } from "element-plus";
import { load360ImageBG, loadImageBG, loadSkyBox } from "@/3d/core/utils/EnvSkybox";


// const physicsEngine = computed(() => Editor.Instance.Scene.getPhysicsEngine?.());

const force = () => {

};

// const gravityProxy = ref({ gravity: physicsEngine.value?.gravity?.clone?.() });

// const applyGravity = () => {
//     if (!physicsEngine.value) return;
//     const oldGravity = physicsEngine.value.gravity.clone();
//     registerUndoRedo({ executeRedo: true, undo: () => { physicsEngine.value?.setGravity(oldGravity); physicsEngine.value?.gravity?.copyFrom(oldGravity); }, redo: () => { physicsEngine.value?.setGravity(gravityProxy.value.gravity); physicsEngine.value?.gravity?.copyFrom(gravityProxy.value.gravity); } });
// };
const scene = shallowRef<Scene>(Editor.Instance.Scene);

const renderingPipeline = ref<DefaultRenderingPipeline>();
const pipelineConfig = ref({ enabled: false });
const ssao2 = ref<SSAO2RenderingPipeline>();
const ssaoConfig = ref(false);
const bgType = ref<number>();

const fogMode = ref<number>();
const ssr = ref<SSRRenderingPipeline>();
const ssrConfig = ref(false);
const motionBlur = ref();
const motionBlurConfig = ref({ enabled: false });

const toneMappingType = ref<number>();
const focusStep = ref<number>();
const focusMax = ref<number>();
const dofBlurLevel = ref<number>();
onMounted(() => {
    updateSceneSettings();
});
const updateSceneSettings = () => {
    fogMode.value = scene.value.fogMode;
    focusStep.value = (Editor.Instance.Scene.activeCamera?.maxZ ?? 0) / 1000;
    focusMax.value = (Editor.Instance.Scene.activeCamera?.maxZ ?? 0) * 1000;
    dofBlurLevel.value = renderingPipeline.value?.depthOfFieldBlurLevel ?? DepthOfFieldEffectBlurLevel.Low;
    renderingPipeline.value = Editor.Instance.getRenderingPipeline(false)
    pipelineConfig.value.enabled = !!renderingPipeline.value;
    ssao2.value = Editor.Instance.getSSAORenderingPipeline(false);
    ssaoConfig.value = !!ssao2.value;
    toneMappingType.value = renderingPipeline.value?.imageProcessing?.toneMappingType ?? TonemappingOperator.Hable;
    ssr.value = Editor.Instance.getSSRRenderingPipeline(false);
    ssrConfig.value = !!ssr.value;
    console.log(ssaoConfig.value);

    motionBlur.value = Editor.Instance.getMotionBlurPostProcess(false);
    motionBlurConfig.value.enabled = !!motionBlur.value;
};
watch(() => Editor.Instance.Scene, () => {
    scene.value = Editor.Instance.Scene;
    updateSceneSettings();
});
const onToneMappingTypeChange = (v: number) => {
    if (renderingPipeline.value?.imageProcessing) {
        renderingPipeline.value.imageProcessing.toneMappingType = v;
    }
};
const onDofBlurLevelChange = (v: number) => {
    if (renderingPipeline.value) {
        renderingPipeline.value.depthOfFieldBlurLevel = v;
    }
};

const toggleDefaultPipeline = () => {
    const scene = Editor.Instance.Scene;
    const pipeline = renderingPipeline.value;
    const serializedPipeline = serializeDefaultRenderingPipeline(pipeline);
    registerUndoRedo({
        executeRedo: true,
        undo: () => {
            if (!pipeline) {
                const pipeline = Editor.Instance.getRenderingPipeline(false);
                if (pipeline) {
                    pipeline.dispose();
                }
            } else if (serializedPipeline) {
                parseDefaultRenderingPipeline(serializedPipeline, scene);
            } else {
                Editor.Instance.getRenderingPipeline();
            }
        }, redo: () => {
            if (pipeline) {
                const pipeline = Editor.Instance.getRenderingPipeline(false);
                if (pipeline) {
                    pipeline.dispose();
                }
            } else if (serializedPipeline) {
                parseDefaultRenderingPipeline(serializedPipeline, scene);
            } else {
                Editor.Instance.getRenderingPipeline();
            }
        }, action: () => {
            renderingPipeline.value = Editor.Instance.getRenderingPipeline(false);
            pipelineConfig.value.enabled = !!renderingPipeline.value;
        }
    });

};


const toggleSSAO = () => {
    const pipeline = ssao2.value;
    const serialized = serializeSSAO2RenderingPipeline(pipeline);
    registerUndoRedo({
        executeRedo: true, undo: () => {
            if (!pipeline) {
                const pipeline = Editor.Instance.getSSAORenderingPipeline(false);
                if (pipeline) {
                    pipeline.dispose();
                }
            } else if (serialized) {
                parseSSAO2RenderingPipeline(serialized, Editor.Instance.Scene);
            }
        }, redo: () => {
            if (pipeline) {
                const pipeline = Editor.Instance.getSSAORenderingPipeline(false);
                if (pipeline) {
                    pipeline.dispose();
                }
            } else if (serialized) {
                parseSSAO2RenderingPipeline(serialized, Editor.Instance.Scene);
            } else {
                Editor.Instance.getSSAORenderingPipeline();
            }
        }, action: () => {
            ssao2.value = Editor.Instance.getSSAORenderingPipeline(false);
            ssaoConfig.value = !!ssao2.value;
        }
    });
};
// const toggleMotionBlur = () => {
//     const post = motionBlur.value;
//     const serialized = serializeMotionBlurPostProcess(post);
//     registerUndoRedo({
//         executeRedo: true,
//         undo: () => {
//             if (!post) {
//                 const post = Editor.Instance.getMotionBlurPostProcess(false);
//                 if (post) {
//                     post.dispose();
//                 }
//             }
//             else if (serialized) {
//                 parseMotionBlurPostProcess(serialized, Editor.Instance.Scene);
//             }
//         }, redo: () => {
//             if (post) {
//                 const post = Editor.Instance.getMotionBlurPostProcess(false);
//                 if (post) {
//                     post.dispose();
//                 }
//                 console.log(Editor.Instance.Scene.postProcesses);
//             } else if (serialized) {
//                 parseMotionBlurPostProcess(serialized, Editor.Instance.Scene);
//             } else {
//                 Editor.Instance.getMotionBlurPostProcess();
//             }
//         },
//         action: () => {
//             motionBlur.value = Editor.Instance.getMotionBlurPostProcess(false);
//             motionBlurConfig.value.enabled = !!motionBlur.value;
//         }
//     });
// };

const toggleSSR = () => {
    const pipeline = ssr.value;
    const serialized = serializeSSRRenderingPipeline(pipeline);
    registerUndoRedo({
        executeRedo: true, undo: () => {
            if (!pipeline) {
                const ssr = Editor.Instance.getSSRRenderingPipeline(false);
                if (ssr) {
                    ssr.dispose();
                }
            } else if (serialized) {
                parseSSRRenderingPipeline(serialized, Editor.Instance.Scene);
            }
        }, redo: () => {
            if (pipeline) {
                const ssr = Editor.Instance.getSSRRenderingPipeline(false);
                if (ssr) {
                    ssr.dispose();
                }
            } else if (serialized) {
                parseSSRRenderingPipeline(serialized, Editor.Instance.Scene);
            } else {
                Editor.Instance.getSSRRenderingPipeline();
            }
        },
        action: () => {
            ssr.value = Editor.Instance.getSSRRenderingPipeline(false);
            ssrConfig.value = !!ssr.value;
        }
    });
};

const vls = ref(getVLSPostProcess());
const vlsConfig = ref({ enabled: !!vls.value });
const toggleVLS = () => {
    const post = vls.value;
    const serialized = serializeVLSPostProcess();
    registerUndoRedo({
        executeRedo: true, undo: () => { if (!post) { disposeVLSPostProcess(); } else if (serialized) { parseVLSPostProcess(serialized); } }, redo: () => {
            if (post) { disposeVLSPostProcess(); } else if (serialized) { parseVLSPostProcess(serialized); } else {
                createVLSPostProcess();
            }
        }
    });
    vls.value = getVLSPostProcess();
    vlsConfig.value.enabled = !!vls.value;
};



// const dragOverVlsMesh = ref(false);
// const handleDragOverVlsMesh = (event: DragEvent) => { event.preventDefault(); dragOverVlsMesh.value = true; };
// const handleDropVlsMesh = (event: DragEvent) => {
//     event.preventDefault();
//     dragOverVlsMesh.value = false;
//     const eventData = event.dataTransfer?.getData("graph/node");
//     // const node = props.editor.layout.graph.getSelectedNodes?.()[0]?.nodeData;
//     const node = Editor.Instance.selectNodes[0];
//     if (eventData && node && node && node.getClassName && node.getClassName() && typeof node.name === 'string') {
//         const post = vls.value as VolumetricLightScatteringPostProcess;
//         if (!post) return;
//         const oldMesh = post.mesh;
//         registerUndoRedo({ executeRedo: true, undo: () => { post.mesh = oldMesh; const s = serializeVLSPostProcess(); disposeVLSPostProcess(); parseVLSPostProcess(s); }, redo: () => { post.mesh = node as any; const s = serializeVLSPostProcess(); disposeVLSPostProcess(); parseVLSPostProcess(s); } });
//     }
// };

const onSelectBgTexture = async (tex: BJS_Texture) => {
    await loadSkyBox(Editor.Instance.Scene, tex.name, tex.sourceUUID);
}

const onSelectBgImage = async (tex: BJS_Texture) => {
    loadImageBG(tex, Editor.Instance.Scene);
}

const onSelect360BGImage = async (tex: BJS_Texture) => {
    load360ImageBG(tex, Editor.Instance.Scene);
}


const onBgTypeChange = (v: number) => {
    Editor.Instance.Scene.bgType = v;
}

const onFogModeChange = (v: number) => {
    const oldValue = scene.value.fogMode;
    const newValue = v;
    registerUndoRedo({
        executeRedo: true,
        undo: () => { scene.value.fogMode = oldValue; },
        redo: () => { scene.value.fogMode = newValue; },
        action: () => {
            fogMode.value = newValue;
        }
    });
}

</script>
<style scoped>
.w-24 {
    padding: 10px;
}

.colorCurvesClild {
    padding-left: 20px;
}
</style>
