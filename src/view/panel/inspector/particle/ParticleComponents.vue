<template>
    <div>
        <ParticleSystemComp v-for="(sys, idx) in systems" :key="sys.id ?? idx" :object="sys" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ParticleSystem, TransformNode, IParticleSystem } from '@babylonjs/core';
import ParticleSystemComp from './ParticleSystem.vue';

const props = defineProps<{ object: TransformNode }>();

const systems = ref<IParticleSystem[]>();


const refreshSystems = () => {
    systems.value = props.object?.particleSystem.systems;
};



onMounted(() => {
    console.log(props.object);
    refreshSystems();
});

watch(() => props.object, () => {
    refreshSystems();
});
</script>