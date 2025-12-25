<template>
    <div>
        <SectionField :title="props.object.name">
            <SectionField :title="$t('component.particleSystem.base')">
                <StringField label="Name" :object="props.object" property="name" />
                <Switch :object="props.object" property="preventAutoStart" label="Prevent Auto Start" />
                <div class="ActionsFlex">
                    <ElButton title="Start/Stop" :type="buttonType" :style="{ width: '50%' }" @click="handleStartOrStop"
                        class="handleStartOrStopClass">
                        <span> {{ buttonText }}</span>
                    </ElButton>
                    <ElButton title="Reset" type="primary" :style="{ width: '50%' }" @click="() => props.object.reset()"
                        class="handleResetClass">
                        <span>Reset</span>
                    </ElButton>
                </div>
            </SectionField>
            <!-- <SectionField title="Actions">
                <div class="ActionsFlex">
                    <ElButton title="Start/Stop" :type="buttonType" :style="{ width: '50%' }" @click="handleStartOrStop"
                        class="handleStartOrStopClass">
                        <span> {{ buttonText }}</span>
                    </ElButton>
                    <ElButton title="Reset" type="primary" :style="{ width: '50%' }" @click="() => props.object.reset()"
                        class="handleResetClass">
                        <span>Reset</span>
                    </ElButton>
                </div>
            </SectionField> -->
            <SectionField :title="$t('component.particleSystem.transforms')">
                <Vector :object="props.object" property="worldOffset" :label="$t('component.particleSystem.offset')" />
                <Vector :object="props.object" property="gravity" :label="$t('component.particleSystem.gravity')" />

                <Switch :object="props.object" property="isLocal" :label="$t('component.particleSystem.isLocal')"
                    @change="forceUpdate" />
                <Switch :object="props.object" property="isBillboardBased"
                    :label="$t('component.particleSystem.isBillboardBased')" @change="forceUpdate" />

                <el-select v-if="props.object.isBillboardBased" v-model="props.object.billboardMode">
                    <el-option v-for="item in [
                        { text: 'All', value: ParticleSystem.BILLBOARDMODE_ALL },
                        { text: 'Y', value: ParticleSystem.BILLBOARDMODE_Y },
                        { text: 'Stretched', value: ParticleSystem.BILLBOARDMODE_STRETCHED },
                        { text: 'Stretched Local', value: ParticleSystem.BILLBOARDMODE_STRETCHED_LOCAL },
                    ]" :key="item.value" :label="item.text" :value="item.value" />
                </el-select>
            </SectionField>

            <SectionField :title="$t('component.particleSystem.textures')">
                <Texture hide-level hide-size :object="props.object" property="particleTexture"
                    :title="$t('component.particleSystem.baseTexture')" />

                <el-select v-model="props.object.blendMode">
                    <el-option v-for="item in [
                        { text: 'Add', value: ParticleSystem.BLENDMODE_ADD },
                        { text: 'Multiply', value: ParticleSystem.BLENDMODE_MULTIPLY },
                        { text: 'Multiply Add', value: ParticleSystem.BLENDMODE_MULTIPLYADD },
                        { text: 'One-one', value: ParticleSystem.BLENDMODE_ONEONE },
                        { text: 'Standard', value: ParticleSystem.BLENDMODE_STANDARD },
                    ]" :key="item.value" :label="item.text" :value="item.value" />
                </el-select>

            </SectionField>

            <SectionField :title="$t('component.particleSystem.emission')">
                <!-- Capacity Inspector -->
                <Number no-undo-redo :object="capacityObject" property="capacity"
                    :label="$t('component.particleSystem.capacity')" :min="1" :max="10000" :step="10"
                    @finish-change="handleCapacityChange" />

                <Number :object="props.object" property="emitRate" :label="$t('component.particleSystem.rate')" />
                <Number :object="props.object" property="targetStopDuration"
                    :label="$t('component.particleSystem.stopDuration')" :min="0" :step="0.01" />

                <SectionField :title="$t('component.particleSystem.emitPower')">
                    <Number gray-label :object="props.object" property="minEmitPower"
                        :label="$t('component.particleSystem.min')" :min="0" />
                    <Number gray-label :object="props.object" property="maxEmitPower"
                        :label="$t('component.particleSystem.max')" :min="0" />
                </SectionField>

                <SectionField :title="$t('component.particleSystem.lifetime')">
                    <Number gray-label :object="props.object" property="minLifeTime"
                        :label="$t('component.particleSystem.min')" :min="0" />
                    <Number gray-label :object="props.object" property="maxLifeTime"
                        :label="$t('component.particleSystem.max')" :min="0" />
                </SectionField>

                <!-- <gradientProperty title="Angular Speed" label="Use Angular Speed Gradients" :object="props.object"
                    :getGradients="() => props.object.getAngularSpeedGradients()"
                    :createGradient="() => props.object.addAngularSpeedGradient(0, props.object.minAngularSpeed, props.object.maxAngularSpeed)"
                    :addGradient="(gradient, value1, value2) => props.object.addAngularSpeedGradient(gradient, value1, value2)"
                    :removeGradient="(gradient) => props.object.removeAngularSpeedGradient(gradient)"
                    :onUpdate="forceUpdate">
                    <div class="flex items-center">
                        <Number gray-label as-degrees :object="props.object" property="minAngularSpeed" label="Min"
                            :step="0.1" />
                        <Number gray-label as-degrees :object="props.object" property="maxAngularSpeed" label="Max"
                            :step="0.1" />
                    </div>
                </gradientProperty> -->
                <SectionField :title="$t('component.particleSystem.angularSpeed')">
                    <!-- <Switch :object="props.object" property="useAngularSpeedGradients"
                        :label="$t('component.particleSystem.useAngularSpeedGradients')" @change="forceUpdate" /> -->
                    <Number gray-label as-degrees :object="props.object" property="minAngularSpeed"
                        :label="$t('component.particleSystem.min')" :step="0.1" />
                    <Number gray-label as-degrees :object="props.object" property="maxAngularSpeed"
                        :label="$t('component.particleSystem.max')" :step="0.1" />
                </SectionField>

                <!-- <gradientProperty title="Size" label="Use Size Gradients" :object="props.object"
                    :getGradients="() => props.object.getSizeGradients()"
                    :createGradient="() => props.object.addSizeGradient(0, props.object.minSize, props.object.maxSize)"
                    :addGradient="(gradient, value1, value2) => props.object.addSizeGradient(gradient, value1, value2)"
                    :removeGradient="(gradient) => props.object.removeSizeGradient(gradient)" :onUpdate="forceUpdate">
                    <div class="flex items-center">
                        <Number gray-label :object="props.object" property="minSize" label="Min" :min="0" />
                        <Number gray-label :object="props.object" property="maxSize" label="Max" :min="0" />
                    </div>
                </gradientProperty> -->
                <SectionField :title="$t('component.particleSystem.sizeGradients')">
                    <!-- <Switch :object="props.object" property="useSizeGradients"
                        :label="$t('component.particleSystem.useSizeGradients')" @change="forceUpdate" /> -->
                    <Number gray-label :object="props.object" property="minSize"
                        :label="$t('component.particleSystem.min')" :min="0" />
                    <Number gray-label :object="props.object" property="maxSize"
                        :label="$t('component.particleSystem.max')" :min="0" />
                </SectionField>
            </SectionField>

            <SectionField :title="$t('component.particleSystem.colors')">
                <gradientProperty :title="$t('component.particleSystem.colorGradients')" label="useColorGradients"
                    :object="props.object" :getGradients="() => props.object.getColorGradients()"
                    :createGradient="() => props.object.addColorGradient(0, props.object.color1.clone(), props.object.color2.clone())"
                    :addGradient="(gradient: any, value1: any, value2: any) => props.object.addColorGradient(gradient, value1, value2)"
                    :removeGradient="(gradient: any) => props.object.removeColorGradient(gradient)"
                    :onUpdate="forceUpdate">
                    <!-- <Color :object="props.object" property="color1" label="Color 1" />
                    <Color :object="props.object" property="color2" label="Color 2" />
                    <Color :object="props.object" property="colorDead" label="Dead" /> -->
                </gradientProperty>
                <!-- <Switch :object="props.object" property="useColorGradients" label="Use Color Gradients"
                    @change="forceUpdate" />
                <Color :object="props.object" property="color1" label="Color1Start" />
                <Color :object="props.object" property="color1" label="Color1End" />
                <Slider label="color1Weight" :object="props.object" property="gradient" :min="0" :max="1" :step="0.01"
                    :value="[]" class="flex-1" @valuechange="" />
                <Color :object="props.object" property="color2" label="Color2Start" />
                <Color :object="props.object" property="color2" label="Color2End" />
                <Slider label="color2Weight" :object="props.object" property="gradient" :min="0" :max="1" :step="0.01"
                    :value="[]" class="flex-1" @valuechange="" />
                <Color :object="props.object" property="colorDead" label="Dead" />-->
            </SectionField>

            <SectionField :title="$t('component.particleSystem.emitter')">
                <el-select v-model="emitterTypeObject.particleEmitterType" size="small" class="w-full"
                    @change="handleEmitterTypeChange">
                    <el-option v-for="item in [
                        { text: 'Box', value: 'BoxParticleEmitter' },
                        { text: 'Cone', value: 'ConeParticleEmitter' },
                        { text: 'Cone Directed', value: 'ConeDirectedParticleEmitter' },
                        { text: 'Cylinder', value: 'CylinderParticleEmitter' },
                        { text: 'Cylinder Directed', value: 'CylinderDirectedParticleEmitter' },
                        { text: 'Sphere', value: 'SphereParticleEmitter' },
                        { text: 'Sphere Directed', value: 'SphereDirectedParticleEmitter' },
                        { text: 'Point', value: 'PointParticleEmitter' },
                        { text: 'Hemispheric', value: 'HemisphericParticleEmitter' },
                    ]" :key="item.value" :label="item.text" :value="item.value" />
                </el-select>

                <template v-if="emitterClassName === 'BoxParticleEmitter'">
                    <SectionField :title="$t('component.particleSystem.direction')">
                        <Vector gray-label :object="emitter" property="direction1"
                            :label="$t('component.particleSystem.min')" />
                        <Vector gray-label :object="emitter" property="direction2"
                            :label="$t('component.particleSystem.max')" />
                    </SectionField>

                    <SectionField title="$t('component.particleSystem.emitBox')">
                        <Vector gray-label :object="emitter" property="minEmitBox"
                            :label="$t('component.particleSystem.min')" />
                        <Vector gray-label :object="emitter" property="maxEmitBox"
                            :label="$t('component.particleSystem.max')" />
                    </SectionField>
                </template>

                <template
                    v-else-if="emitterClassName === 'ConeParticleEmitter' || emitterClassName === 'ConeDirectedParticleEmitter'">
                    <Number gray-label :object="emitter" property="radius"
                        :label="$t('component.particleSystem.radius')" />
                    <Number gray-label :object="emitter" property="angle"
                        :label="$t('component.particleSystem.angle')" />

                    <Number gray-label :object="emitter" property="radiusRange"
                        :label="$t('component.particleSystem.radiusRange')" />
                    <Number gray-label :object="emitter" property="heightRange"
                        :label="$t('component.particleSystem.heightRange')" />

                    <Switch gray-label :object="emitter" property="emitFromSpawnPointOnly"
                        :label="$t('component.particleSystem.emitFromSpawnPointOnly')" />

                    <template v-if="emitterClassName === 'ConeDirectedParticleEmitter'">
                        <SectionField title="Direction">
                            <Vector gray-label :object="emitter" property="direction1"
                                :label="$t('component.particleSystem.min')" />
                            <Vector gray-label :object="emitter" property="direction2"
                                :label="$t('component.particleSystem.max')" />
                        </SectionField>
                    </template>
                </template>

                <template
                    v-else-if="emitterClassName === 'CylinderParticleEmitter' || emitterClassName === 'CylinderDirectedParticleEmitter'">
                    <Number gray-label :object="emitter" property="radius"
                        :label="$t('component.particleSystem.radius')" />
                    <Number gray-label :object="emitter" property="height"
                        :label="$t('component.particleSystem.height')" />

                    <Number gray-label :object="emitter" property="radiusRange"
                        :label="$t('component.particleSystem.radiusRange')" />
                    <Number gray-label :object="emitter" property="directionRandomizer"
                        :label="$t('component.particleSystem.directionRandomizer')" />

                    <template v-if="emitterClassName === 'CylinderDirectedParticleEmitter'">
                        <SectionField title="Direction">
                            <Vector gray-label :object="emitter" property="direction1"
                                :label="$t('component.particleSystem.min')" />
                            <Vector gray-label :object="emitter" property="direction2"
                                :label="$t('component.particleSystem.max')" />
                        </SectionField>
                    </template>
                </template>

                <template
                    v-else-if="emitterClassName === 'SphereParticleEmitter' || emitterClassName === 'SphereDirectedParticleEmitter'">
                    <Number gray-label :object="emitter" property="radius"
                        :label="$t('component.particleSystem.radius')" />
                    <Number gray-label :object="emitter" property="radiusRange"
                        :label="$t('component.particleSystem.radiusRange')" />
                    <Number gray-label :object="emitter" property="directionRandomizer"
                        :label="$t('component.particleSystem.directionRandomizer')" />

                    <template v-if="emitterClassName === 'SphereDirectedParticleEmitter'">
                        <SectionField :title="$t('component.particleSystem.direction')">
                            <Vector gray-label :object="emitter" property="direction1"
                                :label="$t('component.particleSystem.min')" />
                            <Vector gray-label :object="emitter" property="direction2"
                                :label="$t('component.particleSystem.max')" />
                        </SectionField>
                    </template>
                </template>

                <template v-else-if="emitterClassName === 'PointParticleEmitter'">
                    <SectionField :title="$t('component.particleSystem.direction')">
                        <Vector gray-label :object="emitter" property="direction1"
                            :label="$t('component.particleSystem.min')" />
                        <Vector gray-label :object="emitter" property="direction2"
                            :label="$t('component.particleSystem.max')" />
                    </SectionField>
                </template>

                <template v-else-if="emitterClassName === 'HemisphericParticleEmitter'">
                    <Number gray-label :object="emitter" property="radius"
                        :label="$t('component.particleSystem.radius')" />
                    <Number gray-label :object="emitter" property="radiusRange"
                        :label="$t('component.particleSystem.radiusRange')" />
                    <Number gray-label :object="emitter" property="directionRandomizer"
                        :label="$t('component.particleSystem.directionRandomizer')" />
                </template>
            </SectionField>

            <SectionField :title="$t('component.particleSystem.animationSheet')">
                <Switch gray-label :object="props.object" property="isAnimationSheetEnabled"
                    :label="$t('component.particleSystem.isAnimationSheetEnabled')" @change="forceUpdate" />

                <template v-if="props.object.isAnimationSheetEnabled">
                    <Number gray-label :object="props.object" property="startSpriteCellID"
                        :label="$t('component.particleSystem.startCellId')" :min="0" />
                    <Number gray-label :object="props.object" property="endSpriteCellID"
                        :label="$t('component.particleSystem.endCellId')" :min="0" />
                    <Number gray-label :object="props.object" property="spriteCellChangeSpeed"
                        :label="$t('component.particleSystem.spriteCellChangeSpeed')" :min="0" />
                    <Number gray-label :object="props.object" property="spriteCellWidth"
                        :label="$t('component.particleSystem.cellWidth')" :min="0" />
                    <Number gray-label :object="props.object" property="spriteCellHeight"
                        :label="$t('component.particleSystem.cellHeight')" :min="0" />
                    <Switch gray-label :object="props.object" property="spriteRandomStartCell"
                        :label="$t('component.particleSystem.randomStartCell')" />
                </template>
            </SectionField>
        </SectionField>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, watch } from "vue";
import {
    ParticleSystem,
    IParticleEmitterType,
    BoxParticleEmitter,
    ConeParticleEmitter,
    ConeDirectedParticleEmitter,
    CylinderParticleEmitter,
    CylinderDirectedParticleEmitter,
    SphereParticleEmitter,
    SphereDirectedParticleEmitter,
    PointParticleEmitter,
    HemisphericParticleEmitter,
    MeshParticleEmitter,
    Observer,
    IParticleSystem
} from "@babylonjs/core";

import { registerUndoRedo } from "../../../../tools/undoredo";
import gradientProperty from "./gradientProperty.vue";
const props = defineProps<{ object: IParticleSystem; }>();

const started = ref(props.object?.isStarted());
const version = ref(0);
const buttonText = computed(() => started.value ? "Stop" : "Start");
const buttonType = computed(() => started.value ? "primary" : "info");
const forceUpdate = () => {
    version.value++;
};
onMounted(() => {


});
onUnmounted(() => {

});
// 监听 props.object 变化，更新 started 状态
watch(() => props.object, (newObject) => {
    if (newObject) {
        started.value = newObject.isStarted();
    }
}, { immediate: true });
function handleStartOrStop() {
    if (started.value) {
        props.object.stop();
        started.value = false;
    } else {
        props.object.start();
        started.value = true;
    }
}

// Capacity logic
const capacityObject = reactive({
    capacity: props.object.getCapacity(),
});

function handleCapacityChange(value: number) {
    const val = value >> 0;
    const oldValue = props.object.getCapacity();

    if (val === oldValue) {
        return;
    }

    const onCapacityChanged = (v: number) => {
        //   props.object["_capacity"] = v >> 0;
        props.object.reset();
        //  props.object["_reset"]();
        capacityObject.capacity = v;
        forceUpdate();
    };

    registerUndoRedo({
        executeRedo: true,
        undo: () => onCapacityChanged(oldValue),
        redo: () => onCapacityChanged(val),
    });
}

// Emitter logic
const emitter = computed(() => props.object.particleEmitterType);
const emitterClassName = computed(() => emitter.value.getClassName());

const emitterTypeObject = reactive({
    particleEmitterType: props.object.particleEmitterType.getClassName(),
});

import { watchEffect } from "vue";
import SectionField from "@/component/common/SectionField.vue";
import StringField from "@/component/base/StringField.vue";
import Switch from "@/component/base/Switch.vue";
import Texture from "@/component/base/Texture.vue";
import Number from "@/component/base/Number.vue";
import Block from "@/component/common/Block.vue";
import Color from "@/component/base/Color.vue";
import Vector from "@/component/base/Vector.vue";
import { ElButton } from "element-plus";
watchEffect(() => {

    const v = version.value;
    emitterTypeObject.particleEmitterType = props.object.particleEmitterType.getClassName();
    capacityObject.capacity = props.object.getCapacity();
});

function handleEmitterTypeChange(value: string) {
    let emitterType: IParticleEmitterType | null = null;

    switch (value) {
        case "BoxParticleEmitter":
            emitterType = new BoxParticleEmitter();
            break;
        case "ConeParticleEmitter":
            emitterType = new ConeParticleEmitter();
            break;
        case "ConeDirectedParticleEmitter":
            emitterType = new ConeDirectedParticleEmitter();
            break;
        case "CylinderParticleEmitter":
            emitterType = new CylinderParticleEmitter();
            break;
        case "CylinderDirectedParticleEmitter":
            emitterType = new CylinderDirectedParticleEmitter();
            break;
        case "SphereParticleEmitter":
            emitterType = new SphereParticleEmitter();
            break;
        case "SphereDirectedParticleEmitter":
            emitterType = new SphereDirectedParticleEmitter();
            break;
        case "PointParticleEmitter":
            emitterType = new PointParticleEmitter();
            break;
        case "HemisphericParticleEmitter":
            emitterType = new HemisphericParticleEmitter();
            break;
        case "MeshParticleEmitter":
            emitterType = new MeshParticleEmitter();
            break;
    }

    if (emitterType) {
        const currentEmitter = props.object.particleEmitterType;
        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                props.object.particleEmitterType = currentEmitter;
                forceUpdate();
            },
            redo: () => {
                props.object.particleEmitterType = emitterType!;
                forceUpdate();
            },
        });

        forceUpdate();
    }
}
</script>
<style scoped lang="scss">
.ActionsFlex {
    display: flex;
    justify-content: space-between;
}
</style>
