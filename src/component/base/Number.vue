<template>
	<div class="number-field">
		<div class="number-field__label">
			<slot name="label">{{ label }}</slot>
			<el-tooltip v-if="tooltip" :content="tooltip" placement="top">
				<el-icon>
					<InfoFilled />
				</el-icon>
			</el-tooltip>
		</div>
		<el-input-number v-model="value" :step="step ?? 1" :min="min" :max="max" :controls="false"
			class="number-field__input" @update:model-value="onInput" @change="onBlur" />
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerSimpleUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "@/tools/property"

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
.number-field {
	display: flex;
	gap: 8px;
	align-items: center;
	padding: 8px;
}

.number-field__label {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 33.333%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.number-field__input {
	width: 66.666%;
}
</style>