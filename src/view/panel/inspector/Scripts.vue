<template>
    <SectionField :title="$t('component.scripts.title')">
        <div class="drop-box">
            {{ $t('component.scripts.drop') }}
        </div>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, } from 'vue';
import { Node } from '@babylonjs/core';
import SectionField from '@/component/common/SectionField.vue';
interface UserEvent {
    triggerType: string;
    type: string;
    uuid: string;
    name: string;
    args?: string[];
}

const props = defineProps<{
    object: Node
}>();

const events = ref<UserEvent[]>([])

onMounted(() => {
    if (!props.object.metadata) {
        props.object.metadata = {
            events: []
        }
    }
    if (!props.object.metadata.events) {
        props.object.metadata.events = []
    }
    events.value = props.object.metadata.events
});
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