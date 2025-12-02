<template>
    <div class="scene-panel">
        <canvas ref="canvasRef"></canvas>
        <ToolBar />
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import ToolBar from './scene/ToolBar.vue'
import { useScene } from '@/store/useScene';

const canvasRef = ref<HTMLCanvasElement>()
// onMounted(async () => {
//     const sceneList = await RuntimeLibrary.Instance.loadAssets('3b9050cd174e4513aa5fad8af6fe203c.zip');
//     useScene().setSceneList(sceneList)
//     Editor.Instance.init(canvasRef.value)
//     Editor.Instance.setCurrentScene(sceneList[0].uuid);
// })

onMounted(async () => {
    Editor.Instance.init(canvasRef.value)
    const scene = await Editor.Instance.createNewScene('默认场景');
    useScene().addScene(scene);
    Editor.Instance.setCurrentScene(scene.uuid)
})
</script>
<style scoped lang='scss'>
.scene-panel {
    width: 100%;
    height: 100%;
    position: relative;

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
}
</style>