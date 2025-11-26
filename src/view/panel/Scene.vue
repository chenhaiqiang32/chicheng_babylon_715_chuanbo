<template>
    <div class="scene-panel">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { nextTick, onMounted, ref } from 'vue';

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

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
}
</style>