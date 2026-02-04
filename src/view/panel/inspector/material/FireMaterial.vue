<template>
  <SectionField :title="$t('component.material.title')">
    <template #right>
      <ElButton type="info" size="small" @clicl.stop="shareMaterial">{{ $t('component.material.share') }}</ElButton>
    </template>
    <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
      <StringField :text-width="40" style="flex: 1;" :label="$t('component.material.name')" :object="material"
        property="name" />
      <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>

    <SectionField :title="$t('component.material.base')">
      <Color :label="$t('component.material.diffuseColor')" :object="material" property="diffuseColor"
        @change="(newC, oldC) => changeProperty('diffuseColor', newC, oldC, 'color3')" />
      <Number :label="$t('component.material.speed')" :object="material" property="speed" />
      <Texture :title="$t('component.material.diffuseTexture')" :object="material" property="diffuseTexture" />
      <Texture :title="$t('component.material.distortionTexture')" :object="material" property="distortionTexture" />
      <Texture :title="$t('component.material.opacityTexture')" :object="material" property="opacityTexture" />
    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Color from "@/component/base/Color.vue";
import Number from "@/component/base/Number.vue";
import Texture from "@/component/base/Texture.vue";
import { ElButton } from "element-plus";
import { useMaterialActions } from "@/store/useMaterialActions";

const props = defineProps<{ mesh?: any; material: any; }>()
const emit = defineEmits<{
  (e: 'matChanged'): void
}>()

const {changeProperty, changeMaterial, shareMaterial} = useMaterialActions({
  material: props.material,
  mesh: props.mesh,
  emitMatChanged: () => emit('matChanged')
})
</script>