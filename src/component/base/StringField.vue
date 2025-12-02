<template>
  <Field :title="label" :tooltip="tooltip">
    <input class="input-costum" v-model="value" @change="onEnter" />
  </Field>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import Field from "@/component/common/Field.vue"
import { InfoFilled } from "@element-plus/icons-vue"
import { registerSimpleUndoRedo, onUndoObservable, onRedoObservable } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../tools/property"
import { Editor } from "@/3d/Editor"
const props = defineProps<{
  object: any;
  property: string;
  label?: string;
  tooltip?: string;
  noUndoRedo?: boolean
}>()
const emit = defineEmits<{ (e: "change", value: string): void }>()
const value = ref<string>(getInspectorPropertyValue(props.object, props.property) ?? "")
const oldValue = ref<string>(getInspectorPropertyValue(props.object, props.property) ?? "")

function syncFromObject() {
  const v = props.object ? getInspectorPropertyValue(props.object, props.property) ?? '' : ''
  value.value = v
  oldValue.value = v
}

watch(
  () => [props.object, props.property],
  () => {
    syncFromObject()
  },
  { immediate: true }
)



const onEnter = () => {
  const newValue = value.value

  const object = props.object;
  if (!props.noUndoRedo) {
    console.log('onEnter', newValue, oldValue.value);

    registerSimpleUndoRedo({
      object: object, property: props.property, oldValue: oldValue.value, newValue, executeRedo: true, action: () => {
        Editor.Instance.dispatch('nameChanged', { newName: object.name, id: object.id })
      }
    })
  } else {
    setInspectorEffectivePropertyValue(object, props.property, newValue)
    Editor.Instance.dispatch('nameChanged', { newName: object.name, id: object.id })
  }

  if (newValue !== oldValue.value) {
    oldValue.value = newValue
  }

  emit("change", newValue)

}
onMounted(() => {
  Editor.Instance.on("UndoRedo", () => {
    syncFromObject()
  })
})
onUnmounted(() => {
  Editor.Instance.off("UndoRedo", () => {
  })
})



</script>
<style scoped lang="scss">
.input-costum {
  width: 100%;
  border: none;
  height: 24px;
  padding: 0 5px;
  background-color: var(--input-color);
  border-radius: var(--border-radius);
}
</style>
