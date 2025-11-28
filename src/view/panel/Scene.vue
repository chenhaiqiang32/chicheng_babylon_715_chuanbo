<template>
    <div class="scene-panel">
        <canvas ref="canvasRef"></canvas>
        <ToolBar />
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { nextTick, onMounted, ref } from 'vue';
import ToolBar from './scene/ToolBar.vue'

const canvasRef = ref<HTMLCanvasElement>()
onMounted(() => {
    nextTick(() => {
        Editor.Instance.init(canvasRef.value)
    })
})
</script>
<style scoped lang='scss'>
.scene-panel {
    width: 100%;
    height: 100%;
    position: relative;

    .control-bar {
        display: block;
        width: 100%;
        height: 5%;
    }

    canvas {
        display: block;
        width: 100%;
        //height: 100%;
        height: 95%;
    }
}
</style>