<template>
    <div class="color-field">
        <div class="color-field__label">
            <slot name="label">{{ props.label }}</slot>
            <el-tooltip v-if="tooltip" :content="tooltip" placement="top">
                <el-icon>
                    <InfoFilled />
                </el-icon>
            </el-tooltip>
        </div>
        <div class="color-field__controls">
            <el-input-number v-model="r" :step="0.01" :min="min" :max="max" :controls="false"
            @update:modelValue="val => onChannelChange(val as number, 'r')" @change="onFinish" />
            <el-input-number v-model="g" :step="0.01" :min="min" :max="max" :controls="false"
            @update:modelValue="val =>  onChannelChange(val as number, 'g')" @change="onFinish" />
            <el-input-number v-model="b" :step="0.01" :min="min" :max="max" :controls="false"
            @update:modelValue="val =>  onChannelChange(val as number, 'b')" @change="onFinish" />
            <el-input-number v-if="showAlphaNumeric" v-model="a" :step="0.01" :min="min" :max="max" :controls="false"
            @update:modelValue="val =>  onChannelChange(val as number, 'a')" @change="onFinish" />

            <el-color-picker v-if="!noColorPicker" v-model="hex" :show-alpha="hasAlpha" :predefine="predefine"
                @change="onPickerChange" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { Color3, Color4 } from "@babylonjs/core"
import { registerUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue } from "../../tools/property"
import { progressProps } from "element-plus";

const props = defineProps<{ object: any; property: string; label?: any; tooltip?: any; noUndoRedo?: boolean; noClamp?: boolean; noColorPicker?: boolean }>()
const emit = defineEmits<{ (e: "change", value: Color3 | Color4): void; (e: "finishChange", value: Color3 | Color4, oldValue: Color3 | Color4): void }>()

const predefine = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]

const currentColor = computed<Color3 | Color4 | null>(() => getInspectorPropertyValue(props.object, props.property) ?? null)

const toHex = () => {
    const val = currentColor.value
    if (!val) return "#ffffff"
    if (val instanceof Color4) {
        const r = Math.round(val.r * 255).toString(16).padStart(2, "0")
        const g = Math.round(val.g * 255).toString(16).padStart(2, "0")
        const b = Math.round(val.b * 255).toString(16).padStart(2, "0")
        return `#${r}${g}${b}`
    }
    const r = Math.round(val.r * 255).toString(16).padStart(2, "0")
    const g = Math.round(val.g * 255).toString(16).padStart(2, "0")
    const b = Math.round(val.b * 255).toString(16).padStart(2, "0")
    return `#${r}${g}${b}`
}

const hex = ref<string>(toHex())
const oldHex = ref<string>(hex.value)

const r = ref<number>(currentColor.value?.r ?? 1)
const g = ref<number>(currentColor.value?.g ?? 1)
const b = ref<number>(currentColor.value?.b ?? 1)
const a = ref<number>((currentColor.value as any)?.a ?? 1)
const hasAlpha = computed<boolean>(() => (currentColor.value as any)?.a !== undefined)
const showAlphaNumeric = computed<boolean>(() => !!props.noColorPicker && hasAlpha.value)
const min = computed(() => (props.noClamp ? undefined : 0))
const max = computed(() => (props.noClamp ? undefined : 1))

watch(() => [props.object, props.property], () => {
    console.log( hex.value);
    
    hex.value = toHex()
    oldHex.value = hex.value
    r.value = currentColor.value?.r ?? 1
    g.value = currentColor.value?.g ?? 1
    b.value = currentColor.value?.b ?? 1
    a.value = (currentColor.value as any)?.a ?? 1
})

const onPickerChange = () => {
    const rr = parseInt(hex.value.slice(1, 3), 16) / 255
    const gg = parseInt(hex.value.slice(3, 5), 16) / 255
    const bb = parseInt(hex.value.slice(5, 7), 16) / 255
    
    // 同步更新本地RGB值
    r.value = rr
    g.value = gg
    b.value = bb
    
    if (hasAlpha.value) {
        const prev = currentColor.value as Color4
        const next = new Color4(rr, gg, bb, prev?.a ?? 1)
        props.object[props.property] = next
        emit("change", next)
        if (!props.noUndoRedo) {
            console.log("noUndoRedo");
            
            registerUndoRedo({ undo: () => (props.object[props.property] = prev?.clone()), redo: () => (props.object[props.property] = next.clone()) })
        }
    } else {
        const prev = currentColor.value as Color3
        const next = new Color3(rr, gg, bb)
        props.object[props.property] = next
        emit("change", next)
        if (!props.noUndoRedo) {
            console.log("noUndoRedo");
            registerUndoRedo({ undo: () => (props.object[props.property] = prev?.clone()), redo: () => (props.object[props.property] = next.clone()) })
        }
    }
    console.log(currentColor);
    
}

const onChannelChange = (val: number, channel: "r" | "g" | "b" | "a") => {
    const col: any = getInspectorPropertyValue(props.object, props.property)
    if (!col) return
    
    // 更新颜色对象的通道值
    col[channel] = val
    
    // 确保本地响应式引用同步更新
    r.value = col.r
    g.value = col.g
    b.value = col.b
    a.value = col.a ?? a.value
    
    // 从RGB值计算并更新hex值，以同步颜色选择器
    const hexR = Math.round(r.value * 255).toString(16).padStart(2, "0")
    const hexG = Math.round(g.value * 255).toString(16).padStart(2, "0")
    const hexB = Math.round(b.value * 255).toString(16).padStart(2, "0")
    hex.value = `#${hexR}${hexG}${hexB}`
    //console.log( hex.value);
    
    emit("change", col)
}

const onFinish = () => {
    const prev: any = currentColor.value?.clone?.() ?? null
    const next: any = getInspectorPropertyValue(props.object, props.property)
    if (!props.noUndoRedo && prev && next && (prev.r !== next.r || prev.g !== next.g || prev.b !== next.b || prev.a !== next.a)) {
          registerUndoRedo({ undo: () => prev && (props.object[props.property] = prev.clone()), redo: () => next && (props.object[props.property] = next.clone()) })
        emit("finishChange", next, prev)
    }
}
</script>

<style scoped>
.color-field {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px;
}

.color-field__label {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 12rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.color-field__controls {
    display: flex;
    gap: 8px;
    align-items: center;
}
</style>