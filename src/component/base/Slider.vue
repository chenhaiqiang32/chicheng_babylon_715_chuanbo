<template>
	<Field :title="label" :tooltip="tooltip">
		<!--@vue-ignore -->
		<ElSlider class="custom-slider" v-model="value" show-tooltip="false" :step="step" :min="min ?? 0"
			:max="max ?? 1" :controls="false" @input="onInput" @change="onBlur" size="small" />
		<span class="slider-value">{{ value }}</span>
	</Field>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { registerSimpleUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "@/tools/property"
import Field from "@/component/common/Field.vue"
import { ElSlider } from "element-plus"
const props = defineProps<{ object: any; property: string; label?: any; tooltip?: any; step?: number; min?: number; max?: number; noUndoRedo?: boolean }>()
const emit = defineEmits<{ (e: "change", value: number): void; (e: "finishChange", value: number, oldValue: number): void }>()

const min = props.min ?? 0
const max = props.max ?? 1
const step = props.step ?? (max - min) / 100;
const value = ref<number>(getInspectorPropertyValue(props.object, props.property) ?? 1)
const oldValue = ref<number>(getInspectorPropertyValue(props.object, props.property) ?? 1)

watch(() => [props.object, props.property], () => {
	value.value = getInspectorPropertyValue(props.object, props.property) ?? 0
	oldValue.value = getInspectorPropertyValue(props.object, props.property) ?? 0
})

const onInput = () => {
	setInspectorEffectivePropertyValue(props.object, props.property, value.value)
	emit("change", value.value)
}

const onBlur = () => {
	const newValue = value.value
	if (newValue !== oldValue.value && !props.noUndoRedo) {
		registerSimpleUndoRedo({
			object: props.object, property: props.property, oldValue: oldValue.value, newValue, executeRedo: true, action() {
				value.value = getInspectorPropertyValue(props.object, props.property) ?? 0
				oldValue.value = getInspectorPropertyValue(props.object, props.property) ?? 0
			},
		})
		emit("finishChange", newValue, oldValue.value)
		oldValue.value = newValue
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
}
</style>
