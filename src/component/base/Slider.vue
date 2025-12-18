<template>
	<Field :title="label" :tooltip="tooltip">
		<!--@vue-ignore -->
		<ElSlider class="custom-slider" v-model="value" :show-tooltip="false" :step="step" :min="min ?? 0"
			:max="max ?? 1" :controls="false" @input="onInput" @change="onBlur" size="small" />
		<span class="slider-value">{{ value.toFixed(2) }}</span>
	</Field>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { registerPropertyUndoRedo } from "../../tools/undoredo"
import { getObjectValue, setObjectValue } from "@/tools/property"
import Field from "@/component/common/Field.vue"
import { ElSlider } from "element-plus"
import { _EventBus } from "@/utils/dispatch"
const props = defineProps<{
	object: any;
	property: string;
	label?: any;
	tooltip?: any;
	step?: number;
	min?: number;
	max?: number;
	noUndoRedo?: boolean
}>()
const emit = defineEmits<{
	(e: "change", value: number, oldValue: number): void;
}>()

const min = props.min ?? 0
const max = props.max ?? 1
const step = props.step ?? (max - min) / 100;
const value = ref<number>()
let oldValue = 0

watch(() => [props.object], () => {
	getValue()
}, {
	immediate: true
})

function getValue() {
	value.value = getObjectValue(props.object, props.property) ?? 0
	oldValue = value.value
}

const onInput = () => {
	setObjectValue(props.object, props.property, value.value)
}

onMounted(() => {
	_EventBus.on('onSliderChanged', onColorChangeEvent)
})
onUnmounted(() => {
	_EventBus.off('onSliderChanged', onColorChangeEvent)
})


function onColorChangeEvent(data: {
	key: string;
	object: any;
}) {
	if (props.object == data.object && props.property == data.key) {
		getValue()
	}
}

const onBlur = () => {
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
			action: () => {
				_EventBus.dispatch('onSliderChanged', {
					key: property,
					object: object
				})
			},
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
