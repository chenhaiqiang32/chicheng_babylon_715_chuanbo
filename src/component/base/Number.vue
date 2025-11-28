<template>
	<Field :title="label" :tooltip="tooltip">
		<el-input-number v-model="value" :step="step ?? 1" :min="min" :max="max" :controls="false"
			@update:model-value="onInput" @change="onBlur" size="small" />
	</Field>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerSimpleUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "@/tools/property"
import Field from "@/component/common/Field.vue"
const props = defineProps<{ object: any; property: string; label?: any; tooltip?: any; step?: number; min?: number; max?: number; noUndoRedo?: boolean }>()
const emit = defineEmits<{ (e: "change", value: number): void; (e: "finishChange", value: number, oldValue: number): void }>()

const value = ref<number>(getInspectorPropertyValue(props.object, props.property) ?? 0)
const oldValue = ref<number>(getInspectorPropertyValue(props.object, props.property) ?? 0)

watch(() => [props.object, props.property], () => {
	value.value = getInspectorPropertyValue(props.object, props.property) ?? 0
	oldValue.value = getInspectorPropertyValue(props.object, props.property) ?? 0
})

const onInput = (newValue: number) => {
	value.value = newValue
	setInspectorEffectivePropertyValue(props.object, props.property, newValue)
	emit("change", newValue)
}

const onBlur = () => {
	const newValue = value.value
	if (newValue !== oldValue.value && !props.noUndoRedo) {
		registerSimpleUndoRedo({ object: props.object, property: props.property, oldValue: oldValue.value, newValue })
		emit("finishChange", newValue, oldValue.value)
		oldValue.value = newValue
	}
}
</script>

<style scoped>
.el-input-number {
	width: 60%;
	margin-left: auto;
}
</style>