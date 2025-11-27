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
import SectionField from "./SectionField.vue"

const props = defineProps<{ mesh?: any; material: any }>()

const handleRemove = async () => {
  //  const confirm = await showConfirm("Remove Material", "Are you sure you want to remove this material?")
  if (!confirm) return
  const mesh = props.mesh!
  const material = props.material
  // registerUndoRedo({ executeRedo: true, undo: () => (mesh.material = material), redo: () => (mesh.material = null) })
  // onRedoObservable.notifyObservers()
}

const handleExport = async () => {
  const data = props.material.serialize()
  // const destination = saveSingleFileDialog({ title: "Export Material", filters: [{ name: "Material File", extensions: ["material"] }], defaultPath: join(dirname(projectConfiguration.path!), "assets") })
  //if (!destination) return
  //  await writeJSON(destination, data, { spaces: 4 })
  // toast.success("Material exported successfully!")
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