<template>
	<SectionField title="Transform">
		<Vector :label="label('Position')" :object="object" property="position"
			@finishChange="handleTransformsUpdated" />
		<Vector :label="label('Rotation')" :object="object" property="rotation" :asDegrees="true"
			@finishChange="handleTransformsUpdated" />
		<Vector :label="label('Scaling')" :object="object" property="scaling" @finishChange="handleTransformsUpdated" />
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
} from '@babylonjs/core';
import { inject, toRaw } from 'vue';
import { reactive, watch, ref, onMounted, onUnmounted } from 'vue';
import Vector from '@/component/base/Vector.vue'
import SectionField from '@/component/base/SectionField.vue'
import { isMesh } from '@/tools/guards/nodes';

const props = defineProps<{ editor: any; object: AbstractMesh }>();
const label = (t: string) => t;
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
function changePosition() {
	let obj = props.object;

}

function recordCommand(type: 'p' | 's' | 'r', o: Vector, n: Vector) {
	let obj = props.object;

}

function changeRotate() {
}

function changeScale() {
	const x = scale.x;
	const y = scale.y;
	const z = scale.z;
	const obj = props.object;
}



watch(() => props.object, (e, o) => {
}, {
	immediate: true,
});


function changeName() {
	if (props.object) {
		const oldValue = props.object.name;
		const value = nodeName.value;
		const obj = props.object;

	}
}
onMounted(() => {

});

function visibleChanged(data: { visible: boolean; uuid: string; o: Node; }) {

}

const handleTransformsUpdated = () => {
	//if (isMesh(props.object)) updateIblShadowsRenderPipeline(props.object.getScene())
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
