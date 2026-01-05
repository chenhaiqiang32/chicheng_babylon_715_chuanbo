<template>
    <div class="app-container">
        <canvas id="canvas" ref="canvas"></canvas>
    </div>
</template>
<script lang="ts" setup>
import { App } from '@/3d/app';
import { onMounted, ref } from 'vue';
import { AppAssets } from '@/3d/assets/PublishLibrary';

const canvas = ref<HTMLCanvasElement>(null);

onMounted(async () => {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    const assets = new AppAssets();
    await assets.loadFromUrl('publish.zip')
    App.Instance.setAssetsLibrary(assets);
    await App.Instance.setScene();

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