<template>
  <div class="utils-row">
    <el-button type="default" class="w-full" @click="handleExport">Export...</el-button>
    <el-button v-if="mesh" type="danger" class="w-full" @click="handleRemove">Remove</el-button>
  </div>
  <!-- <SectionField title="Utils">
    <div class="utils-row">
      <el-button type="default" class="w-full" @click="handleExport">Export...</el-button>
      <el-button v-if="mesh" type="danger" class="w-full" @click="handleRemove">Remove</el-button>
    </div>
  </SectionField> -->
</template>

<script setup lang="ts">
// import { writeJSON } from "fs-extra"
// import { join, dirname } from "path/posix"
// import { toast } from "sonner"
// import { saveSingleFileDialog } from "../../../editor/tools/dialog"
// import { onRedoObservable, registerUndoRedo } from "../../../editor/tools/undoredo"
// import { showConfirm } from "../../../editor/ui/dialog"
// import { projectConfiguration } from "../../../editor/project/configuration"
import SectionField from "@/component/common/SectionField.vue"

const props = defineProps<{ mesh?: any; material: any }>()

const handleRemove = async () => {
  if (!confirm) return
  const mesh = props.mesh!
  const material = props.material
}

const handleExport = async () => {
  const data = props.material.serialize()
}
</script>

<style scoped>
.utils-row {
  display: flex;
  gap: 8px;
  align-items: center;

}

.utils-row>* {
  width: 50%;
}
</style>