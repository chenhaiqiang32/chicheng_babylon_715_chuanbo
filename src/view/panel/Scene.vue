<template>
    <div class="scene-panel">
        <canvas ref="canvasRef" @drop="handleDrop" @dragover="e => e.preventDefault()"></canvas>
        <ToolBar />
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { onMounted, ref } from 'vue';
import ToolBar from './scene/ToolBar.vue'
import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { useScene } from '@/store/useScene';

const canvasRef = ref<HTMLCanvasElement>()
onMounted(async () => {
    Editor.Instance.init(canvasRef.value)
    // const scene = await Editor.Instance.createNewScene('默认场景');
    // useScene().addScene(scene);
    // Editor.Instance.setCurrentScene(scene.uuid)
})

async function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    const data = JSON.parse(ev.dataTransfer?.getData('assets') || '{}');
    await RuntimeLibrary.Instance.addToScene(Editor.Instance.Scene, data.uuid)
    useScene().setHierarchy(Editor.Instance.Scene.rootNodes)
}

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