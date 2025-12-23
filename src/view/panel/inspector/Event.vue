<template>
    <SectionField :title="$t('component.event.title')">
        <template #label>
            <span @click.stop="">
                <el-dropdown>
                    <SVG name="add"></SVG>
                    <template #dropdown>
                        <el-dropdown-item v-for="item in triggerTypes" :key="item" @click="addEvent(item)">{{
                            $t(`component.event.${item}`) }}</el-dropdown-item>
                    </template>
                </el-dropdown>
            </span>
        </template>
        <div v-if="events?.length > 0">
            <SectionField v-for="item in events" :key="item.uuid" :title="item.name">
                <template #title>
                    <el-input @click.stop v-model="item.name" size="small" class="rename-text"></el-input>
                </template>
                <template #label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        {{ $t(`component.event.${item.triggerType}`) }}
                        <SVG name="delete" @click.stop="removeEvent(item)"></SVG>
                    </div>
                </template>
                <div>
                    <Field :title="$t('component.event.triggerType')">
                        <el-select v-model="item.triggerType">
                            <el-option v-for="type in triggerTypes" :key="type" :label="$t(`component.event.${type}`)"
                                :value="type"></el-option>
                        </el-select>
                    </Field>
                    <Field :title="$t('component.event.eventType')">
                        <el-select v-model="item.type" :placeholder="$t('component.event.none')">
                            <el-option v-for="type in eventTypes" :key="type" :label="$t(`component.event.${type}`)"
                                :value="type"></el-option>
                        </el-select>
                    </Field>
                    <Field :title="$t('component.event.chooseScene')" v-if="item.type == 'changeScene'">
                        <el-select v-model="item.args[0]" :placeholder="$t('component.event.none')">
                            <el-option v-for="sceneInfo in sceneInfoList" :key="sceneInfo.uuid" :label="sceneInfo.name"
                                :value="sceneInfo.uuid"></el-option>
                        </el-select>
                    </Field>
                    <Field :title="$t('component.event.info')" v-if="item.type == 'showInfo'">
                        <ElInput type="textarea" v-model="item.args[0]" :placeholder="$t('component.event.none')">
                        </ElInput>
                    </Field>
                    <Field :title="$t('component.event.animation')" v-if="item.type == 'animation'">
                        <el-select v-model="item.args[0]" :placeholder="$t('component.event.none')">
                            <el-option v-for="animation in animationList" :key="animation.uuid" :label="animation.name"
                                :value="animation.name"></el-option>
                        </el-select>
                    </Field>
                    <Field :title="$t('component.event.chooseSound')" v-if="item.type == 'playSound'">

                    </Field>
                </div>
            </SectionField>
        </div>
    </SectionField>
</template>
<script setup lang='ts'>
import { onMounted, onUnmounted, ref, shallowRef, watch, } from 'vue';
import { Node } from '@babylonjs/core';
import SectionField from '@/component/common/SectionField.vue';
import SVG from '@/component/common/SVG.vue';
import { ID } from '@/utils/id';
import Field from '@/component/common/Field.vue';
import { storeToRefs } from 'pinia';
import { useScene } from '@/store/useScene';
import { Editor } from '@/3d/Editor';
import { CC } from '@/3d/assets/BaseRes';
import { ElMessageBox } from 'element-plus';
const props = defineProps<{
    object: Node
}>();

const { sceneInfoList } = storeToRefs(useScene())

const triggerTypes = [
    'onClick',
    'onMouseEnter',
    'onMouseLeave',
    "onDoubleClick",
]

const eventTypes = [
    "none",
    'animation',
    'changeScene',
    'showInfo',
    'playSound',
    'stopSound',
]

function removeEvent(event: UserEvent) {
    ElMessageBox.confirm($i18nT('component.event.removeEventMessage'), $i18nT('component.event.removeTitle'), {
        confirmButtonText: $i18nT('component.event.confirmButtonText'),
        cancelButtonText: $i18nT('component.event.cancelButtonText'),
        type: 'warning',
    }).then(() => {
        const index = events.value.indexOf(event)
        if (index > -1) {
            events.value.splice(index, 1)
        }
    }).catch()
}
function addEvent(eventType: string) {
    const event: UserEvent = {
        triggerType: eventType,
        type: 'none',
        uuid: ID.generateUUID(),
        name: $i18nT(`component.event.${eventType}`),
        args: []
    }
    events.value.push(event)
}

interface UserEvent {
    triggerType: string;
    type: string;
    uuid: string;
    name: string;
    args?: string[];
}




const events = ref<UserEvent[]>([])
const animationList = shallowRef<CC.Animation[]>([])

watch(() => props.object, () => {
    if (!props.object.metadata) {
        props.object.metadata = {
            events: []
        }
    }
    if (!props.object.metadata.events) {
        props.object.metadata.events = []
    }
    events.value = props.object?.metadata.events
}, { immediate: true })


onMounted(() => {
    Editor.Instance.on('animationChange', onAnimationChange)
    animationList.value = Editor.Instance.Scene.runtimeAnimation;
});
function onAnimationChange() {
    animationList.value = Editor.Instance.Scene.runtimeAnimation;
}
onUnmounted(() => {
    Editor.Instance.off('animationChange', onAnimationChange)
})
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