<template>
	<SectionField :title="$t('component.transform.title')">
		<Vector :label="$t('component.transform.position')" :object="object" property="position"
			@change="notifyNodeModified" />
		<Vector v-if="hasQuaternion" :label="$t('component.transform.rotation')" :object="rotationProxyObj"
			property="proxy" :asDegrees="true" :step="0.1" @change="applyRotationProxy"
			@finishChange="applyRotationProxy" />
		<Vector v-else :label="$t('component.transform.rotation')" :object="object" property="rotation"
			:asDegrees="true" :step="0.1" @change="notifyNodeModified" />
		<Vector :label="$t('component.transform.scaling')" :object="object" property="scaling"
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

const props = defineProps<{ object: TransformNode }>();
const label = (t: string) => t;
const getEulerAnglesFromQuaternion = () => {
	if (!hasQuaternion.value) return
	const euler = props.object.rotationQuaternion.toEulerAngles()
	console.log(euler);

	return {
		x: euler.x,
		y: euler.y,
		z: euler.z,
	}
}
const hasQuaternion = computed(() => !!props.object?.rotationQuaternion)
const rotationProxy = ref(getEulerAnglesFromQuaternion())
const rotationProxyObj = computed(() => ({ proxy: rotationProxy.value }))
const emits = defineEmits<{
	(event: 'update:modelValue', value: Node): void;
}>();
const position = reactive<Vector>({
	x: 0,
	y: 0,
	z: 0,
});
const rotation = reactive<Vector>({
	x: 0,
	y: 0,
	z: 0,
});
const scale = reactive<Vector>({
	x: 1,
	y: 1,
	z: 1,
});

watch([() => props.object, hasQuaternion], () => {
	rotationProxy.value = getEulerAnglesFromQuaternion()
}, {
	immediate: true
})
// watch(() => props.object, (e, o) => {

// }, {
// 	immediate: true,
// });

onMounted(() => {

});
const applyRotationProxy = () => {
	if (!hasQuaternion.value) return
	const q = Quaternion.FromEulerAngles(rotationProxy.value.x, rotationProxy.value.y, rotationProxy.value.z)
	props.object.rotationQuaternion.copyFrom(q)
}
const notifyNodeModified = () => {
	onNodeModifiedObservable.notifyObservers(props.object)
}
onUnmounted(() => {
});


</script>

<style lang='scss' scoped></style>
