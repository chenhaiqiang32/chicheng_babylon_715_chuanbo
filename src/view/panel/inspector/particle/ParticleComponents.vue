<template>
    <div class="ParticleSystems">
        <SectionField :title="$t('component.particleSystem.particleSystems')">
            <div class="ActionsFlex" v-if="props.object.particleSystem.systems.length > 1">
                <ElButton title="Start/Stop" :type="buttonType" :style="{ width: '50%' }" @click="handleStartOrStop"
                    class="handleStartOrStopClass">
                    <span> {{ buttonText }}</span>
                </ElButton>
                <ElButton title="Reset" type="primary" :style="{ width: '50%' }" @click="() => reset()"
                    class="handleResetClass">
                    <span>Reset</span>
                </ElButton>
            </div>
            <ParticleSystemComp v-for="(sys, idx) in systems" :key="sys.id ?? idx" :object="sys" />
        </SectionField>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { ParticleSystem, TransformNode, IParticleSystem } from '@babylonjs/core';
import ParticleSystemComp from './ParticleSystem.vue';
import SectionField from '@/component/common/SectionField.vue';

const props = defineProps<{ object: TransformNode }>();

const systems = ref<IParticleSystem[]>();
const started = ref(false);
const buttonText = computed(() => started.value ? "Stop" : "Start");
const buttonType = computed(() => started.value ? "primary" : "info");
const refreshSystems = () => {
    systems.value = props.object?.particleSystem.systems;
    started.value = props.object.particleSystem.systems.every(sys => sys.isStarted());

};

const handleStartOrStop = () => {
    if (started.value) {
        props.object.particleSystem.systems.forEach(sys => sys.stop());
    } else {
        props.object.particleSystem.systems.forEach(sys => sys.start());
    }
    started.value = !started.value;
};
const reset = () => {
    props.object.particleSystem.systems.forEach(sys => sys.reset());
};

onMounted(() => {
    //   console.log(props.object);
    refreshSystems();
});

watch(() => props.object, () => {
    refreshSystems();
});
</script>
<style scoped lang="scss">
.ParticleSystems {
    .ActionsFlex {
        display: flex;
        justify-content: space-between;
        margin-left: 5px;
    }
}
</style>