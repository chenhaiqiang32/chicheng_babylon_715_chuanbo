<template>
    <Field :title="label" :tooltip="tooltip">
        <el-color-picker style="margin-left: auto;" v-model="value" :predefine="predefine" @active-change="changeColor"
            @change="onFinish" />
    </Field>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from "vue"
import { Color4 } from "@babylonjs/core"
import { registerPropertyUndoRedo, registerUndoRedo } from "../../tools/undoredo"
import { getObjectValue, setObjectValue } from "../../tools/property"
import Field from "@/component/common/Field.vue"
import { _EventBus } from "@/utils/dispatch"

const props = defineProps<{
    object: any;
    property: string;
    label?: any;
    tooltip?: any;
    noUndoRedo?: boolean;
    noClamp?: boolean;
    noColorPicker?: boolean
}>()
const emit = defineEmits<{
    (e: "change", newValue: number[], oldValue: number[]): void;
}>()

const predefine = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]

const value = ref<string>()
let oldValue: string


function changeColor(color: string) {
    const newValue = Color4.FromHexString(color)
    setObjectValue(props.object, props.property, newValue)
}

onMounted(() => {
    _EventBus.on('onColorChanged', onColorChangeEvent)
    getValue();

})
onUnmounted(() => {
    _EventBus.off('onColorChanged', onColorChangeEvent)
})


function onColorChangeEvent(data: {
    key: string;
    object: any;
}) {
    if (props.object == data.object && props.property == data.key) {
        getValue()
    }
}


function getValue() {
    const v = getObjectValue(props.object, props.property)
    if (v) {
        value.value = v.toHexString()
        oldValue = value.value
    }
}

watch(() => [props.object], () => {
    getValue()
}, {
    immediate: true
})
export type SimpleUndoRedoStackItem = {
    object: any;
    property: string;
    oldValue: any;
    newValue: any;
    action?: () => void;
    onLost?: () => void;
    executeRedo?: boolean;
};

const onFinish = () => {
    if (value.value !== oldValue) {
        let _oldValue = oldValue;
        let _newValue = value.value
        const property = props.property;
        const object = props.object;
        oldValue = _newValue
        registerPropertyUndoRedo({
            object: object,
            property: property,
            oldValue: _oldValue ? Color4.FromHexString(_oldValue) : null,
            newValue: Color4.FromHexString(_newValue),
            action: () => {
                _EventBus.dispatch('onColorChanged', {
                    key: property,
                    object: object
                })
            },
            executeRedo: false
        })
        const oldC = _oldValue ? Color4.FromHexString(_oldValue).asArray() : null;
        const newC = Color4.FromHexString(_newValue).asArray();
        emit('change', newC, oldC)
    }


}
</script>

<style scoped lang="scss">
.color-item {
    display: flex;
    gap: 8px;
    align-items: center;

    .el-input-number {
        width: 60%;
        margin-left: auto;
    }
}
</style>