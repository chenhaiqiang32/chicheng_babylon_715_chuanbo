<template>
	<Field :title="label" :tooltip="tooltip">
		<el-input-number v-model="value" :step="step ?? 1" :min="min" :max="max" :controls="false"
			@update:model-value="onInput" @change="onBlur" size="small" />
	</Field>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerPropertyUndoRedo, onUndoObservable, onRedoObservable } from "../../tools/undoredo"
import { getObjectValue, setObjectValue } from "@/tools/property"
import Field from "@/component/common/Field.vue"
import { Editor } from "@/3d/Editor"
const props = defineProps<{ object: any; property: string; label?: any; tooltip?: any; step?: number; min?: number; max?: number; noUndoRedo?: boolean }>()
const emit = defineEmits<{ (e: "change", value: number, oldValue: number): void; (e: "finishChange", value: number, oldValue: number): void }>()

const value = ref<number>(getObjectValue(props.object, props.property) ?? 0)
const oldValue = ref<number>(getObjectValue(props.object, props.property) ?? 0)

function syncFromObject() {
	const v = getObjectValue(props.object, props.property) ?? 0
	value.value = v
	oldValue.value = v
}

watch(() => [props.object, props.property], () => {
	syncFromObject()
}, { immediate: true })

let undoObserver: any = null
let redoObserver: any = null

const onInput = (newValue: number) => {
	value.value = newValue
	setObjectValue(props.object, props.property, newValue)
	emit("change", newValue, oldValue.value)
}


const onBlur = () => {
	const newValue = value.value
	if (newValue !== oldValue.value && !props.noUndoRedo) {
		registerPropertyUndoRedo({
			object: props.object, property: props.property, oldValue: oldValue.value, newValue, executeRedo: true,
			action: () => {
				syncFromObject()
			}
		})
		emit("finishChange", newValue, oldValue.value)
		oldValue.value = newValue
	}
}

defineExpose({
	syncFromObject,
})
</script>

<style scoped>
.el-input-number {
	width: 60%;
	margin-left: auto;
}
</style>