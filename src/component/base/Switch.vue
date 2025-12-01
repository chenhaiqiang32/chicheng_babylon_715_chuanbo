<template>
  <Field :title="label">
    <el-switch style="margin-left: auto;" :model-value="value" @change="onToggle" @click.stop />
  </Field>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { registerSimpleUndoRedo } from "../../tools/undoredo"
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../tools/property"
import Field from "../common/Field.vue";
import { Editor } from "@/3d/Editor";
const props = defineProps<{ object: any; property: string; label?: any; noUndoRedo?: boolean }>()
const emit = defineEmits<{ (e: "change", value: boolean): void }>()

const value = ref<boolean>(getInspectorPropertyValue(props.object, props.property) ?? false)

// 使用更强大的watch来深度监听对象属性变化
watch(
  () => props.object ? getInspectorPropertyValue(props.object, props.property) : false,
  (newVal) => {
    value.value = newVal ?? false
  },
  { immediate: true, deep: true }
)

const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
  const oldValue = value.value;
  const newValue = !oldValue;
  value.value = newValue;
  setInspectorEffectivePropertyValue(props.object, props.property, newValue);
  emit("change", newValue);
  if (!props.noUndoRedo) {
    registerSimpleUndoRedo({
      object: props.object,
      property: props.property,
      oldValue: oldValue,
      newValue: newValue,
      executeRedo: true,
      action: () => {
        Editor.Instance.dispatch('switchChanged', { newSwitch: newValue, id: props.object.id })
        value.value = getInspectorPropertyValue(props.object, props.property) ?? false
        console.log(newValue, 'switchChanged');
      }
    })
  }
}

const onToggle = () => {
  // 当switch组件自身状态改变时也触发相同的逻辑
  handleClick(new MouseEvent('click'));
}
</script>

<style scoped>
.inspector-switch {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: all .3s;
}

.inspector-switch:hover {
  background: rgba(255, 255, 255, 0.1);
  padding-left: 8px;
  padding-right: 8px;
}

.inspector-switch__label {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--title--color);
}

.inspector-switch__control {
  display: flex;
  justify-content: flex-end;
  width: 56px;
}
</style>