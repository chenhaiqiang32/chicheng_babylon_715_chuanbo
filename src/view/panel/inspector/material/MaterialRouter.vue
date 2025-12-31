<template>
  <component v-if="object?.material" :key="refreshKey" :is="component" :mesh="object" :material="object.material" @matChanged="handleMatChanged" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
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

const props = defineProps<{ object?: any; }>()
// 强制渲染
const refreshKey = ref(0);
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
const component = computed(() => mapping[props.object?.material?.getClassName?.()] ?? StandardMaterial)
// 材质改变时，强制渲染
function handleMatChanged() {
  refreshKey.value++;
}
</script>