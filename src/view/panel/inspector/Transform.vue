<template>
	<SectionField :title="$t('component.transform.title')">
		<Vector ref="positionRef" :label="$t('component.transform.position')" :object="object" property="position"
			@change="notifyNodeModified" />
		<Vector ref="rotationProxyRef" v-if="hasQuaternion" :label="$t('component.transform.rotation')"
			:object="rotationProxyObj" property="proxy" :asDegrees="true" :step="0.1" @change="applyRotationProxy"
			@finishChange="applyRotationProxy" />
		<Vector ref="rotationRef" v-else :label="$t('component.transform.rotation')" :object="object"
			property="rotation" :asDegrees="true" :step="0.1" @change="notifyNodeModified" />
		<Vector ref="scaleRef" :label="$t('component.transform.scaling')" :object="object" property="scaling"
			@change="notifyNodeModified" />
	</SectionField>
</template>

<script lang='ts' setup>
import {
	Node,
	Quaternion,
	TransformNode
} from '@babylonjs/core';
import { computed } from 'vue';
import { reactive, watch, ref, onMounted, onUnmounted } from 'vue';
import Vector from '@/component/base/Vector.vue'
import SectionField from '@/component/common/SectionField.vue'
import { onNodeModifiedObservable } from "@/tools/observables"
import { Editor } from '@/3d/Editor';
const positionRef = ref<InstanceType<typeof Vector>>()
const rotationProxyRef = ref<InstanceType<typeof Vector>>()
const rotationRef = ref<InstanceType<typeof Vector>>()
const scaleRef = ref<InstanceType<typeof Vector>>()

const props = defineProps<{ object: TransformNode }>();
const getEulerAnglesFromQuaternion = () => {
	if (!hasQuaternion.value) return
	const euler = props.object.rotationQuaternion.toEulerAngles()
	return {
		x: euler.x,
		y: euler.y,
		z: euler.z,
	}
}
const hasQuaternion = ref()
const rotationProxy = ref(getEulerAnglesFromQuaternion())
const rotationProxyObj = computed(() => ({ proxy: rotationProxy.value }))
const emits = defineEmits<{
	(event: 'update:modelValue', value: Node): void;
}>();

watch([() => props.object, hasQuaternion], () => {
	rotationProxy.value = getEulerAnglesFromQuaternion()
	hasQuaternion.value = !!props.object?.rotationQuaternion
}, {
	immediate: true
})
onMounted(() => {
	Editor.Instance.on('onPositionChanged', onPositionChanged)
	Editor.Instance.on('onRotationChanged', onRotationChanged)
	Editor.Instance.on('onScaleChanged', onScaleChanged)
});

function onPositionChanged(e: { object: TransformNode }) {
	if (e.object == props.object) {
		positionRef.value.syncFromObject()
	}
}
function onRotationChanged(e: { object: TransformNode }) {
	if (e.object == props.object) {
		if (hasQuaternion.value) {
			rotationProxy.value = getEulerAnglesFromQuaternion()
		} else {
			rotationRef.value.syncFromObject()
		}
	}
}
function onScaleChanged(e: { object: TransformNode }) {
	if (e.object == props.object) {
		scaleRef.value.syncFromObject()
	}
}
const applyRotationProxy = () => {
	if (!hasQuaternion.value) return
	const q = Quaternion.FromEulerAngles(rotationProxy.value.x, rotationProxy.value.y, rotationProxy.value.z)
	props.object.rotationQuaternion.copyFrom(q)
}
const notifyNodeModified = () => {
	onNodeModifiedObservable.notifyObservers(props.object)
}
onUnmounted(() => {
	Editor.Instance.off('onPositionChanged', onPositionChanged)
	Editor.Instance.off('onRotationChanged', onRotationChanged)
	Editor.Instance.off('onScaleChanged', onScaleChanged)
});


</script>

<style lang='scss' scoped></style>
