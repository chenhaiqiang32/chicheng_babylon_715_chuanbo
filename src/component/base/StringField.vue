<template>
  <Field :title="label" :tooltip="tooltip">
    <input class="input-costum" v-model="value" @change="onEnter" />
  </Field>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import Field from "@/component/common/Field.vue"
import { registerPropertyUndoRedo, } from "../../tools/undoredo"
import { getObjectValue, setObjectValue } from "../../tools/property"
import { Editor } from "@/3d/Editor"
import { _EventBus } from "@/utils/dispatch"
const props = defineProps<{
  object: any;
  property: string;
  label?: string;
  tooltip?: string;
  noUndoRedo?: boolean
}>()
const emit = defineEmits<{ (e: "change", value: string): void }>()
const value = ref<string>(getObjectValue(props.object, props.property) ?? "")
const oldValue = ref<string>(getObjectValue(props.object, props.property) ?? "")

function syncFromObject() {
  const v = props.object ? getObjectValue(props.object, props.property) ?? '' : ''
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
  registerPropertyUndoRedo({
    object: object, property: props.property, oldValue: oldValue.value, newValue, executeRedo: true, action: () => {
      _EventBus.dispatch('onStringChanged', { key: props.property, object: props.object })
      syncFromObject()
    }
  })
  if (newValue !== oldValue.value) {
    oldValue.value = newValue
  }

  emit("change", newValue)

}

function onStringChanged(data: { key: string; object: any }) {
  if (data.key === props.property && data.object === props.object) {
    syncFromObject()
  }
}

onMounted(() => {
  _EventBus.on('onStringChanged', onStringChanged)
})
onUnmounted(() => {
  _EventBus.off('onStringChanged', onStringChanged)
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
