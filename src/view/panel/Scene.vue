<template>
    <div class="scene-panel">
        <canvas ref="canvasRef" @drop="handleDrop" @dragover="e => e.preventDefault()"></canvas>
        <ToolBar v-if="edit" />
        <div class="clip-list" v-else>
            <div class="header">
                动画信息
            </div>
            <div v-for="item in clips" :key="item.uuid" class="clip-item" @click="playClip(item.uuid)">
                {{ item.name }}
            </div>
        </div>
    </div>
</template>
<script setup lang='ts'>
import { Editor } from '@/3d/Editor';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import ToolBar from './scene/ToolBar.vue'
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
import { useScene } from '@/store/useScene';
import { TransformNode } from '@babylonjs/core';
import { loadSkyBox } from '@/3d/core/utils/EnvSkybox';
import { useEditor } from '@/store/useEditor';
import { storeToRefs } from 'pinia';
import { Animator } from '@/3d/animation/animator';
import { TimeController } from '@/utils/Time';
import { CC } from '@/3d/assets/BaseRes';

const { edit } = storeToRefs(useEditor());
const clips = ref<{
    name: string,
    uuid: string,
}[]>([])
const canvasRef = ref<HTMLCanvasElement>()
onMounted(async () => {
    Editor.Instance.init(canvasRef.value, false)
    onAnimationChange()
    Editor.Instance.on('animationChange', onAnimationChange)
})

watch(() => edit.value, (newVal) => {
    if (!newVal) {
        onAnimationChange()
    }
})

function onAnimationChange() {
    clips.value = Editor.Instance.Scene?.runtimeAnimation?.map(x => ({
        name: x.name,
        uuid: x.uuid,
    })) || []
}
onUnmounted(() => {
    Editor.Instance.off('animationChange', onAnimationChange)
})
let timeController: TimeController

function playClip(uuid: string) {
    const anim = Editor.Instance.Scene?.runtimeAnimation.find(x => x.uuid === uuid) as CC.Animation
    const animator = new Animator(anim);
    animator.updateClip((s) => Editor.Instance.getNodeById(s))
    animator.collectInfo();
    const times = anim.clips.flatMap((x) => x.key.map((v) => v.time));
    const maxTime = Math.max(...times) + 0.5;
    timeController = new TimeController(maxTime, (deltaTime) => {
        animator.execute(deltaTime)
    }, false, () => {
        animator.dispose()
    })
}

async function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    const data = JSON.parse(ev.dataTransfer?.getData('assets') || '{}');
    if (data.type === "object") {
        await createObject(ev, data.uuid)
    } else if (data.type === "material") {
        await createMaterial(ev, data.uuid)
    } else if (data.type === "envTexture") {
        const url = await RuntimeLibrary.Instance.getTextureURL(data.sourceUUID);
        await loadSkyBox(Editor.Instance.Scene, data.name, url, data.sourceUUID);
    } else {
        console.log(data);
    }
}

async function createObject(ev: DragEvent, uuid: string) {
    const bound = canvasRef.value.getBoundingClientRect()
    const ray = Editor.Instance.getRaycastPoint(ev.clientX - bound.left, ev.clientY - bound.top)
    const node = RuntimeLibrary.Instance.addToScene(Editor.Instance.Scene, uuid, (s) => {
        useEditor().setLoading(s)
    }) as TransformNode
    node.position.set(ray.x, ray.y, ray.z)
    useScene().setHierarchy(Editor.Instance.Scene.rootNodes)
}
async function createMaterial(ev: DragEvent, uuid: string) {
    const bound = canvasRef.value.getBoundingClientRect()
    const hit = Editor.Instance.getRaycastMesh(ev.clientX - bound.left, ev.clientY - bound.top)
    const material = await RuntimeLibrary.Instance.getMaterial(uuid)
    hit.pickedMesh.material = material
}

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

    .clip-list {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 10px;
        background-color: #7e7e7e55;
        width: 200px;
        border-radius: var(--border-radius);
        display: flex;
        flex-direction: column;
        gap: 10px;

        .header {
            font-size: 16px;
            font-weight: bold;
            color: var(--text-color);
            padding: 5px;
        }

        .clip-item {
            line-height: 20px;
            cursor: pointer;
            color: var(--text-color);
            background-color: var(--bg-color-2);
            border-radius: var(--border-radius);
            padding: 5px;
        }
    }
}
</style>