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
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { useScene } from '@/store/useScene';
import { TransformNode } from '@babylonjs/core';

const canvasRef = ref<HTMLCanvasElement>()
onMounted(async () => {
    Editor.Instance.init(canvasRef.value, false)
})

async function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    const data = JSON.parse(ev.dataTransfer?.getData('assets') || '{}');
    if (data.type === "object") {
        await createObject(ev, data.uuid)
    } else if (data.type === "material") {
        await createMaterial(ev, data.uuid)
    } else {
        console.log(data);
    }
}

async function createObject(ev: DragEvent, uuid: string) {
    const bound = canvasRef.value.getBoundingClientRect()
    const ray = Editor.Instance.getRaycastPoint(ev.clientX - bound.left, ev.clientY - bound.top)
    const node = await RuntimeLibrary.Instance.addToScene(Editor.Instance.Scene, uuid) as TransformNode
    node.position.set(ray.x, ray.y, ray.z)
    useScene().setHierarchy(Editor.Instance.Scene.rootNodes)
}
async function createMaterial(ev: DragEvent, uuid: string) {
    const bound = canvasRef.value.getBoundingClientRect()
    const hit = Editor.Instance.getRaycastMesh(ev.clientX - bound.left, ev.clientY - bound.top)
    const material = await RuntimeLibrary.Instance.getMaterial(uuid)
    hit.pickedMesh.material = material
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