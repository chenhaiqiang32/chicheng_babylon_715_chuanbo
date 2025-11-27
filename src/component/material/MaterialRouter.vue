<template>
  <component :is="componentName" :mesh="mesh" :material="material" :editor="editor" />
</template>

<script setup lang="ts">
import { computed } from "vue"
import PBRMaterial from "@/component/material/PBRMaterial.vue"
import StandardMaterial from "@/component/material/StandardMaterial.vue"
import NodeMaterial from "@/component/material/NodeMaterial.vue"
import MultiMaterial from "@/component/material/MultiMaterial.vue"
import SkyMaterial from "@/component/material/SkyMaterial.vue"
import GridMaterial from "@/component/material/GridMaterial.vue"
import NormalMaterial from "@/component/material/NormalMaterial.vue"
import WaterMaterial from "@/component/material/WaterMaterial.vue"
import LavaMaterial from "@/component/material/LavaMaterial.vue"
import TriPlanarMaterial from "@/component/material/TriPlanarMaterial.vue"
import CellMaterial from "@/component/material/CellMaterial.vue"
import FireMaterial from "@/component/material/FireMaterial.vue"
import GradientMaterial from "@/component/material/GradientMaterial.vue"

const props = defineProps<{ mesh?: any; material: any; editor: any }>()

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