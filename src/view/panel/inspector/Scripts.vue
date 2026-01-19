<template>
    <SectionField :title="$t('component.scripts.title')">
        <SectionField :arrow="true" v-for="item in events" :key="item.scriptId" :title="getName(item.scriptId)">
        </SectionField>
        <div class="drop-box" @drop="handleDrop" @dragover="handleDragOver">
            {{ $t('component.scripts.drop') }}
        </div>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, } from 'vue';
import { Node } from '@babylonjs/core';
import SectionField from '@/component/common/SectionField.vue';
import { CC } from '@/3d/assets/BaseRes';
import { RuntimeLibrary } from '@/3d/assets/RuntimeLibrary';
interface Script {
    scriptId: string;
    arg: {
        name: string;
        type: string;
        value: [];
    }[]
}

const props = defineProps<{
    object: Node
}>();

const events = ref<Script[]>([])

onMounted(() => {
    if (!props.object.metadata) {
        props.object.metadata = {
            scripts: []
        }
    }
    if (!props.object.metadata.scripts) {
        props.object.metadata.scripts = []
    }
    events.value = props.object.metadata.scripts
});

function getName(uuid: string) {
    const script = RuntimeLibrary.Instance.scripts.find((item) => item.uuid === uuid);
    return script?.name || uuid;
}

function handleDragOver(ev: DragEvent) {
    ev.preventDefault();
}
function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    const data = ev.dataTransfer?.getData('assets');
    if (!data) {
        return;
    }
    const script = JSON.parse(data) as CC.ScriptData;
    events.value.push({
        scriptId: script.uuid,
        arg: script.args.map((item) => ({
            name: item.name,
            type: item.type,
            value: [],
        }))
    })
}
onUnmounted(() => {

});
</script>
<style scoped lang='scss'>
.drop-box {
    height: 50px;
    margin: 5px;
    border: 1px dashed var(--border-color);
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--el-text-color-secondary);
}
</style>