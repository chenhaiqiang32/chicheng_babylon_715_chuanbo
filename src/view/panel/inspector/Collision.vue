<template>
  <SectionField title="Collisions" :isProcessing="computingCollisionMesh">
    <Switch label="Enable" :object="mesh" property="checkCollisions" @change="onCheckCollisionsChanged" />
    <div v-if="mesh.checkCollisions" class="collision-types" @mousemove="setTemporaryCollisionMeshVisible(true)"
      @mouseleave="setTemporaryCollisionMeshVisible(false)">
      <div class="collision-type" :class="{ active: collisionMesh?.type === 'cube' }"
        @click="configureCollisionMesh('cube')">
        <div class="icon">■</div>
        <div class="label">cube</div>
      </div>
      <div class="collision-type" :class="{ active: collisionMesh?.type === 'sphere' }"
        @click="configureCollisionMesh('sphere')">
        <div class="icon">●</div>
        <div class="label">sphere</div>
      </div>
      <div class="collision-type" :class="{ active: collisionMesh?.type === 'capsule' }"
        @click="configureCollisionMesh('capsule')">
        <div class="icon">⟂</div>
        <div class="label">capsule</div>
      </div>
      <div class="collision-type" :class="{ active: collisionMesh?.type === 'lod' }"
        @click="configureCollisionMesh('lod')">
        <div class="icon">#</div>
        <div class="label">lod</div>
      </div>
    </div>
  </SectionField>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from "vue"
import SectionField from '@/component/common/SectionField.vue'
import Switch from "@/component/base/Switch.vue";
import { AbstractMesh, Mesh, Tools } from '@babylonjs/core';
import { UniqueNumber } from "@/tools/guards/tools";
//import { getCollisionMeshFor } from "../../tools/mesh/collision"
import { isInstancedMesh, isMesh } from "@/tools/guards/nodes"
import { CollisionMesh, type CollisionMeshType } from "@/tools/node/collision"

const props = defineProps<{ object: AbstractMesh }>()

const mesh = computed<AbstractMesh>(() => {
  let m: any = props.object._masterMesh ?? props.object
  if (isInstancedMesh(m)) m = m.sourceMesh
  return m
})

const collisionMesh = ref<CollisionMesh | null>(null)
const computingCollisionMesh = ref(false)

const refreshCollisionRef = () => {
  // try { collisionMesh.value = getCollisionMeshFor(mesh.value as Mesh) } catch { collisionMesh.value = null }
}

watch(() => mesh.value, refreshCollisionRef, { immediate: true })

const onCheckCollisionsChanged = (v: boolean) => {
  if (!v && isMesh(mesh.value) && collisionMesh.value) {
    disposeCollisionMesh()
  }
  //  props.editor.layout.graph.refresh()
}

const configureCollisionMesh = async (type: CollisionMeshType) => {
  if (collisionMesh.value?.type === type) {
    disposeCollisionMesh()
    return
  }

  computingCollisionMesh.value = true

  collisionMesh.value?.dispose(false, false)
  const cm = new CollisionMesh(`${mesh.value.name} Collider`, mesh.value.getScene(), mesh.value)
  cm.id = Tools.RandomId()
  cm.uniqueId = UniqueNumber.Get()

  collisionMesh.value = cm
  await cm.setType(type, mesh.value)

  //props.editor.layout.graph.refresh()
  computingCollisionMesh.value = false

  setTemporaryCollisionMeshVisible(collisionMesh.value.isVisible)
}

const setTemporaryCollisionMeshVisible = (visible: boolean) => {
  mesh.value.visibility = visible ? 0.35 : 1
  if (collisionMesh.value) {
    collisionMesh.value.isVisible = visible
    collisionMesh.value.instances?.forEach((i) => (i.isVisible = visible))
  }
}

const disposeCollisionMesh = () => {
  collisionMesh.value?.dispose()
  collisionMesh.value = null
  setTemporaryCollisionMeshVisible(false)
}

onBeforeUnmount(() => {
  if (collisionMesh.value?.isVisible) setTemporaryCollisionMeshVisible(false)
})
</script>

<style scoped>
.collision-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.collision-type {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background: var(--bg-color-2);
  cursor: pointer;
  transition: background .3s ease-in-out;
}

.collision-type:hover {
  background: var(--bg-color-3);
}

.collision-type.active {
  background: var(--bg-color-3);
}

.icon {
  font-size: 42px;
}

.label {
  text-transform: capitalize;
}
</style>