<template>
    <Field :title="label" :tooltip="tooltip">
        <ElSelect v-model="value" @change="changed">
            <ElOption v-for="item in items" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
    </Field>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { registerPropertyUndoRedo } from "../../tools/undoredo"
import { getObjectValue, setObjectValue } from "@/tools/property"
import Field from "@/component/common/Field.vue"
import { _EventBus } from "@/utils/dispatch"
const props = defineProps<{
    object: any;
    property: string;
    label?: any;
    tooltip?: any;
    items: {
        value: any;
        label: any;
    }[];
}>()
const emit = defineEmits<{
    (e: "change", value: number, oldValue: number): void;
}>()
const value = ref<any>()
let oldValue: any = null;

watch(() => [props.object], () => {
    getValue()
}, {
    immediate: true
})

function getValue() {
    value.value = getObjectValue(props.object, props.property)
    oldValue = value.value
}


const changed = () => {
    if (value.value !== oldValue) {
        let _oldValue = oldValue;
        let _newValue = value.value
        const property = props.property;
        const object = props.object;
        oldValue = value.value
        registerPropertyUndoRedo({
            object: object,
            property: property,
            oldValue: _oldValue,
            newValue: _newValue,
            executeRedo: false
        })
        emit('change', _newValue, _oldValue)
    }
}

</script>

<style lang="scss">
.slider-value {
    position: absolute;
    left: 5px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    pointer-events: none;
}
</style>
