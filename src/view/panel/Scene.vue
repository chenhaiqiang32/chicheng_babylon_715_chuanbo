<template>
    <div class="scene-panel">
        <canvas ref="canvasRef"></canvas>
        <ToolBar />
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { onMounted, ref } from 'vue';
import ToolBar from './scene/ToolBar.vue'

const canvasRef = ref<HTMLCanvasElement>()
onMounted(async () => {
    Editor.Instance.init(canvasRef.value)
    // const scene = await Editor.Instance.createNewScene('默认场景');
    // useScene().addScene(scene);
    // Editor.Instance.setCurrentScene(scene.uuid)
})

// onMounted(async () => {
//     Editor.Instance.init(canvasRef.value)
//     const scene = await Editor.Instance.createNewScene('默认场景');
//    
//     
// })
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