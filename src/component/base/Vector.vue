<template>
	<Field :title="label" :tooltip="tooltip" :text-width="60">
		<el-input-number class="vector-input" size="small" v-model="vx" :step="step" :min="axisMin(0)" :max="axisMax(0)"
			:controls="false" @update:modelValue="val => onAxisChange('x', val as number)" @change="onFinishChange"
			@blur="onFinishChange" />
		<el-input-number class="vector-input" size="small" v-model="vy" :step="step" :min="axisMin(1)" :max="axisMax(1)"
			:controls="false" @update:modelValue="val => onAxisChange('y', val as number)" @change="onFinishChange"
			@blur="onFinishChange" />
		<el-input-number class="vector-input" size="small" v-if="hasZ" v-model="vz" :step="step" :min="axisMin(2)"
			:max="axisMax(2)" :controls="false" @update:modelValue="val => onAxisChange('z', val as number)"
			@change="onFinishChange" @blur="onFinishChange" />
		<el-input-number class="vector-input" size="small" v-if="hasW" v-model="vw" :step="step" :min="axisMin(3)"
			:max="axisMax(3)" :controls="false" @update:modelValue="val => onAxisChange('w', val as number)"
			@change="onFinishChange" @blur="onFinishChange" />
	</Field>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from "vue"
import Field from "@/component/common/Field.vue"
import { registerSimpleUndoRedo, onUndoObservable, onRedoObservable } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "@/tools/property"
const props = defineProps<{
	object: any
	property: string
	label?: any
	tooltip?: any
	step?: number
	asDegrees?: boolean
	grayLabel?: boolean
	min?: number | number[]
	max?: number | number[]
}>()
const emit = defineEmits<{ (e: "change"): void; (e: "finishChange"): void }>()

const pointerOver = ref(false)

const hasZ = computed(() => props.object?.[props.property]?.z !== undefined || props.object?.[props.property]?.w !== undefined)
const hasW = computed(() => props.object?.[props.property]?.w !== undefined)

const toDisplay = (v: number) => (props.asDegrees ? (v * 180) / Math.PI : v)
const toStore = (v: number) => (props.asDegrees ? (v * Math.PI) / 180 : v)

const vx = ref<number>(toDisplay(props.object?.[props.property]?.x ?? 0))
const vy = ref<number>(toDisplay(props.object?.[props.property]?.y ?? 0))
const vz = ref<number>(toDisplay(props.object?.[props.property]?.z ?? 0))
const vw = ref<number>(toDisplay(props.object?.[props.property]?.w ?? 0))

function syncFromObject() {
	vx.value = toDisplay(props.object?.[props.property]?.x ?? 0)
	vy.value = toDisplay(props.object?.[props.property]?.y ?? 0)
	vz.value = toDisplay(props.object?.[props.property]?.z ?? 0)
	vw.value = toDisplay(props.object?.[props.property]?.w ?? 0)
}

watch(() => [props.object, props.property], () => {
	syncFromObject()
}, { immediate: true })

let undoObserver: any = null
let redoObserver: any = null

onMounted(() => {
	undoObserver = onUndoObservable.add(() => syncFromObject())
	redoObserver = onRedoObservable.add(() => syncFromObject())
})

onUnmounted(() => {
	if (undoObserver) onUndoObservable.remove(undoObserver)
	if (redoObserver) onRedoObservable.remove(redoObserver)
})

const axisMin = (i: number) => (Array.isArray(props.min) ? props.min[i] : props.min)
const axisMax = (i: number) => (Array.isArray(props.max) ? props.max[i] : props.max)

const onAxisChange = (axis: "x" | "y" | "z" | "w", val: number) => {
	const storeVal = toStore(val)
	const oldVal = getInspectorPropertyValue(props.object, `${props.property}.${axis}`) ?? 0
	setInspectorEffectivePropertyValue(props.object, `${props.property}.${axis}`, storeVal)
	registerSimpleUndoRedo({
		object: props.object,
		property: `${props.property}.${axis}`,
		oldValue: oldVal,
		newValue: storeVal
	})
	emit("change")
}

const onFinishChange = () => {

	emit("finishChange")
}
</script>

<style lang="scss">
.vector-input {
	flex: 1;
	width: 0;

	&+& {
		margin-left: 8px;
	}

	.el-input__wrapper {
		padding-left: 6px !important;
		padding-right: 6px !important;
	}

}
</style>