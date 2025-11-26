<template>
  <component :is="componentName" :mesh="mesh" :material="material" :editor="editor" />
</template>

<script setup lang="ts">
import { computed } from "vue"
import PBRMaterial from "@/component/material/PBRMaterial.vue"
import StandardMaterial from "@/component/material/StandardMaterial.vue"
import NodeMaterialInspector from "@/component/material/NodeMaterialInspector.vue"
import MultiMaterialInspector from "@/component/material/MultiMaterialInspector.vue"
import SkyMaterialInspector from "@/component/material/SkyMaterialInspector.vue"
import GridMaterialInspector from "@/component/material/GridMaterialInspector.vue"
import NormalMaterialInspector from "@/component/material/NormalMaterialInspector.vue"
import WaterMaterialInspector from "@/component/material/WaterMaterialInspector.vue"
import LavaMaterialInspector from "@/component/material/LavaMaterialInspector.vue"
import TriPlanarMaterialInspector from "@/component/material/TriPlanarMaterialInspector.vue"
import CellMaterialInspector from "@/component/material/CellMaterialInspector.vue"
import FireMaterialInspector from "@/component/material/FireMaterialInspector.vue"
import GradientMaterialInspector from "@/component/material/GradientMaterialInspector.vue"

const props = defineProps<{ mesh?: any; material: any; editor: any }>()

const mapping: Record<string, any> = {
  PBRMaterial: PBRMaterial,
  StandardMaterial: StandardMaterial,
  NodeMaterial: NodeMaterialInspector,
  MultiMaterial: MultiMaterialInspector,
  SkyMaterial: SkyMaterialInspector,
  GridMaterial: GridMaterialInspector,
  NormalMaterial: NormalMaterialInspector,
  WaterMaterial: WaterMaterialInspector,
  LavaMaterial: LavaMaterialInspector,
  TriPlanarMaterial: TriPlanarMaterialInspector,
  CellMaterial: CellMaterialInspector,
  FireMaterial: FireMaterialInspector,
  GradientMaterial: GradientMaterialInspector,
}

const componentName = computed(() => mapping[props.material?.getClassName?.()] ?? StandardMaterial)
</script>