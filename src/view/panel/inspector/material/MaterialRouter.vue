<template>
  <component :is="componentName" :mesh="mesh" :material="material" />
</template>

<script setup lang="ts">
import { computed } from "vue"
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

const props = defineProps<{ mesh?: any; material: any; }>()

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

const componentName = computed(() => mapping[props.material?.getClassName?.()] ?? StandardMaterial)
</script>