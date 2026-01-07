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
    const camera = App.Instance.scene.activeCamera as ArcRotateCamera;
    const plane = MeshBuilder.CreatePlane('plane', { size: 1000 }, App.Instance.scene);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -0.05;
    plane.receiveShadows = true;
    // const hdr = new HDRCubeTexture('./a1be8e929d1f7c940660bdfe2a448082 (2).hdr', App.Instance.scene, 1024);
    // hdr.gammaSpace = true;
    // App.Instance.scene.environmentTexture = hdr;
    // App.Instance.scene.environmentIntensity = 0.5;

    const mat = new PBRMaterial('plane-material', App.Instance.scene);
    plane.material = mat
    mat.metallic = 0;
    mat.roughness = 1;
    mat.specularIntensity = 0;
    App.Instance.scene.clearColor = new Color4(221 / 255, 225 / 255, 221 / 255, 1);
    const generator = new CascadedShadowGenerator(1024, App.Instance.scene.lights[0] as DirectionalLight, true, App.Instance.scene.activeCamera);
    generator.bias = 0.001;
    generator.lambda = 1;
    generator.depthClamp = true;
    const mesh = App.Instance.scene.meshes.filter(x => x.name.includes('Ke') || x.name.includes('Wheel') || x.name.includes('Door'))
    generator.getShadowMap()?.renderList?.push(...mesh);
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