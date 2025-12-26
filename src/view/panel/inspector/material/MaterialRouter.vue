<template>
  <component v-if="currentMaterial" :is="currentComponent" :mesh="object" :material="currentMaterial"
    @materialChanged="onMaterialChanged" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import PBRMaterial from "./PBRMaterial.vue"
import StandardMaterial from "./StandardMaterial.vue"
import NodeMaterial from "./NodeMaterial.vue"
import MultiMaterial from "./MultiMaterial.vue"
import SkyMaterial from "./SkyMaterial.vue"
import GridMaterial from "./GridMaterial.vue"
import NormalMaterial from "./NormalMaterial.vue"
import WaterMaterial from "./WaterMaterial.vue"
import LavaMaterial from "./LavaMaterial.vue"
import TriPlanarMaterial from "./TriPlanarMaterial.vue"
import CellMaterial from "./CellMaterial.vue"
import FireMaterial from "./FireMaterial.vue"
import GradientMaterial from "./GradientMaterial.vue"
import { Material } from "@babylonjs/core"

const props = defineProps<{ object?: any; }>()

// 响应式地跟踪当前材质
const currentMaterial = ref(props.object?.material)

const onMaterialChanged = (newMaterial: Material) => {
  // 更新当前材质
  currentMaterial.value = newMaterial;
  // 或者更新相关的状态
}
const mapping: Record<string, any> = {
  PBRMaterial: PBRMaterial,

  StandardMaterial: StandardMaterial,
  NodeMaterial: NodeMaterial,
  MultiMaterial: MultiMaterial,
  SkyMaterial: SkyMaterial,
  GridMaterial: GridMaterial,
  NormalMaterial: NormalMaterial,
  WaterMaterial: WaterMaterial,
  LavaMaterial: LavaMaterial,
  TriPlanarMaterial: TriPlanarMaterial,
  CellMaterial: CellMaterial,
  FireMaterial: FireMaterial,
  GradientMaterial: GradientMaterial,
}

// 根据当前材质选择合适的组件
const currentComponent = computed(() => {
  if (!currentMaterial.value) return null
  return mapping[currentMaterial.value.getClassName?.()] ?? StandardMaterial
})
</script>