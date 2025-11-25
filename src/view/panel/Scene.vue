<template>
    <div class="scene-panel">
        <control-bar class="control-bar"></control-bar>
        <canvas ref="canvasRef">
        </canvas>
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { nextTick, onMounted, ref } from 'vue';
import ControlBar from '@/component/common/ControlBar.vue';

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