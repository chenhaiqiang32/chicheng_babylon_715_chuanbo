<template>
	<SectionField title="Transforms">
		<Vector :label="label('Position')" :object="object" property="position" @change="notifyNodeModified" />
		<Vector v-if="hasQuaternion" :label="label('Rotation')" :object="rotationProxyObj" property="proxy"
			:asDegrees="true" :step="0.1" @change="applyRotationProxy" @finishChange="applyRotationProxy" />
		<Vector v-else :label="label('Rotation')" :object="object" property="rotation" :asDegrees="true" :step="0.1"
			@change="notifyNodeModified" />
		<Vector :label="label('Scaling')" :object="object" property="scaling" @change="notifyNodeModified" />
	</SectionField>
</template>

<script lang='ts' setup>
import {
	ArcRotateCamera,
	CascadedShadowGenerator,
	CubeTexture,
	DirectionalLight,
	Engine,
	GizmoManager,
	AbstractMesh,
	MeshBuilder,
	PBRMaterial,
	Scene,
	Vector3,
	Node,
	Quaternion
} from '@babylonjs/core';
import { inject, toRaw, computed } from 'vue';
import { reactive, watch, ref, onMounted, onUnmounted } from 'vue';
import Vector from '@/component/base/Vector.vue'
import SectionField from '@/component/common/SectionField.vue'
import { isMesh } from '@/tools/guards/nodes';
import { onNodeModifiedObservable } from "@/tools/observables"

const props = defineProps<{ editor: any; object: any }>();
const label = (t: string) => t;
const hasQuaternion = computed(() => !!props.object?.rotationQuaternion)
const rotationProxy = ref({ x: 0, y: 0, z: 0 })
const rotationProxyObj = computed(() => ({ proxy: rotationProxy.value }))

const initRotationProxy = () => {
	if (hasQuaternion.value) {
		const e = props.object.rotationQuaternion.toEulerAngles()
		rotationProxy.value = { x: e.x, y: e.y, z: e.z }
	}
}
const nodeName = ref(props.object?.name);
const size = ref({
	x: 0,
	y: 0,
	z: 0,
});
const showPathEditor = ref(false);

const state = {
	p: new Vector3(),
	q: new Vector3(),
	s: new Vector3()
};
function setName() {
	nodeName.value = props.object?.name;
}



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

const visible = ref(false);


watch(() => props.object, (e, o) => {
}, {
	immediate: true,
});

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

<style lang='scss' scoped>
.property {
	padding: 10px;

	.base-info {
		display: flex;
		height: 40px;
		align-items: center;
		margin-bottom: 10px;
		margin-right: 5px;

		.reset {
			margin-left: 10px;
		}


	}

	.btn {
		height: 32px;
		line-height: 32px;
		padding: 0px 15px;
		margin-bottom: 10px;
	}
}

.path-editor {
	padding: 10px;
}
</style>
