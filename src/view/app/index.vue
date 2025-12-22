<template>
    <div class="app-container">
        <canvas id="canvas"></canvas>
    </div>
</template>
<script lang="ts">
import { App } from '@/3d/app';
import { onMounted, ref } from 'vue';
import { PublishAssets } from '@/3d/assets/PublishLibrary';

const canvas = ref<HTMLCanvasElement>(null);

onMounted(() => {
    if (canvas.value) {
        App.Instance.init(canvas.value, true);
    }


});

</script>
<style scoped>
.app-container {
    width: 100%;
    height: 100%;

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
}
</style>