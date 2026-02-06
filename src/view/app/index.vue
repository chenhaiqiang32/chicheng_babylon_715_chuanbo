<template>
    <div class="app-container">
        <canvas id="canvas" ref="canvas"></canvas>
    </div>
    <Loading :progress="loading" v-if="loading > 0 && loading < 1"> </Loading>

</template>
<script lang="ts" setup>
import { App } from '@/3d/app';
import { onMounted, ref } from 'vue';
import { AppAssets } from '@/3d/assets/PublishLibrary';
import Loading from '@/component/common/Loading.vue'
import { ArcRotateCamera } from '@babylonjs/core';
import '../../ai'


const props = defineProps<{ projectId: string }>()

const canvas = ref<HTMLCanvasElement>(null);
const loading = ref<number>(0);

onMounted(async () => {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    const assets = new AppAssets();
    await assets.loadFromUrl(props.projectId || './ship.zip', (progress) => {
        loading.value = progress * 0.4;
    });
    App.Instance.setAssetsLibrary(assets);
    await App.Instance.setScene((progress) => {
        loading.value = progress * 0.6 + 0.4;
    });
    const camera = App.Instance.scene.activeCamera as ArcRotateCamera;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = -0.5;
});

</script>
<style scoped lang="scss">
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