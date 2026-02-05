<template>
  <SectionField :title="$t('component.material.title')">
    <template #right>
      <ElButton type="info" size="small" @click.stop="shareMaterial">{{ $t('component.material.share') }}</ElButton>
    </template>
    <div style="display: flex; align-items: center; gap:4 px; width: 100%;">
      <StringField :text-width="40" style="flex: 1;" :label="$t('component.material.name')" :object="material"
       property="name" />
       <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>

    <SectionField :title="$t('component.material.base')">
      <Color :label="$t('component.material.diffuseColor')" :object="material" property="diffuseColor"
        @change="(newC, oldC) => changeProperty('diffuseColor', newC, oldC, 'color3')" />
      <Texture :object="material" :title="$t('component.material.diffuseTexture')" property="diffuseColor"/>
      <Switch :label="$t('component.material.disableLighting')" :object="material" property="disableLighting"/>
      <Slider :label="$t('component.material.maxSimultaneousLights')" :object="material" property="maxSimultaneousLights" :max="4"/>
    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Switch from "@/component/base/Switch.vue"
import Texture from "@/component/base/Texture.vue"
import Color from "@/component/base/Color.vue"
import Slider from "@/component/base/Slider.vue"
import { NormalMaterial } from "@babylonjs/materials"
import { useMaterialActions } from "@/store/useMaterialActions"

const props = defineProps<{ mesh?: any; material: NormalMaterial; }>()

// 创建通知父组件事件
const emit = defineEmits<{
  (e: 'matChanged'): void
}>()

const {
  changeProperty,
  changeMaterial,
  shareMaterial
} = useMaterialActions({
  material: props.material,
  mesh: props.mesh,
  emitMatChanged: () => emit('matChanged')
})
</script>