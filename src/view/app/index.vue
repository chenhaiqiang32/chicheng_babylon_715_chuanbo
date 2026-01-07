<template>
    <div class="app-container">
        <canvas id="canvas" ref="canvas"></canvas>
    </div>
</template>
<script lang="ts" setup>
import { App } from '@/3d/app';
import { onMounted, ref } from 'vue';
import { AppAssets } from '@/3d/assets/PublishLibrary';
import { ArcRotateCamera, AutoRotationBehavior, CascadedShadowGenerator, DirectionalLight, MeshBuilder, ShadowGenerator } from '@babylonjs/core';
import { ShadowOnlyMaterial } from '@babylonjs/materials';

const canvas = ref<HTMLCanvasElement>(null);

onMounted(async () => {
    if (canvas.value) {
        await App.Instance.init(canvas.value, true);
    }
    const assets = new AppAssets();
    await assets.loadFromUrl('publish (13).zip')
    App.Instance.setAssetsLibrary(assets);
    await App.Instance.setScene();
    const camera = App.Instance.scene.activeCamera as ArcRotateCamera;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = -1;
    const plane = MeshBuilder.CreatePlane('plane', { size: 10 }, App.Instance.scene);
    plane.rotation.x = Math.PI / 2;
    const material = new ShadowOnlyMaterial('shadow', App.Instance.scene);
    plane.material = material
    plane.receiveShadows = true;
    material.alpha = 0.5;
    material.transparencyMode = null;
    const generator = new CascadedShadowGenerator(4096, App.Instance.scene.lights[0] as DirectionalLight);
    generator.bias = 0.00268;
    generator.lambda = 1;
    generator.depthClamp = true;
    generator.autoCalcDepthBounds = true;
    generator.autoCalcDepthBoundsRefreshRate = 60;
    generator.transparencyShadow = true;
    generator.enableSoftTransparentShadow = true;
    generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
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