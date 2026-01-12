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
import { ArcRotateCamera, CascadedShadowGenerator, Color4, DirectionalLight, HDRCubeTexture, MeshBuilder, PBRMaterial, ShadowGenerator, Vector4 } from '@babylonjs/core';
import Loading from '@/component/common/Loading.vue'



const canvas = ref<HTMLCanvasElement>(null);
const loading = ref<number>(0);

onMounted(async () => {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    const assets = new AppAssets();
    await assets.loadFromUrl('publish.zip')
    App.Instance.setAssetsLibrary(assets);
    App.Instance.setScene();

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