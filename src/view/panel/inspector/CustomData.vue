<template>
    <SectionField :title="$t('component.customData.title')">
        <template #right>
            <ElPopover>
                <template #reference>
                    <SVG name="add" color="#ffffff"></SVG>
                </template>
                <div>
                    <div>{{ $t('component.customData.number') }}</div>
                    <div>{{ $t('component.customData.strting') }}</div>
                    <div>{{ $t('component.customData.bool') }}</div>
                </div>
            </ElPopover>
        </template>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, } from 'vue';
import { Node } from '@babylonjs/core';
import SVG from '@/component/common/SVG.vue';
import SectionField from '@/component/common/SectionField.vue';
import { ElPopover } from 'element-plus';
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
            customData: []
        }
    }
    if (!props.object.metadata.customData) {
        props.object.metadata.customData = []
    }
    events.value = props.object.metadata.customData
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