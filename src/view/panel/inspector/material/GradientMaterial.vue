<template>
  <SectionField :title="$t('component.material.title')">

    <template #right>
      <ElButton type="info" size="small" @click.stop="shareMaterial">{{ $t('component.material.share') }}</ElButton>
    </template>
    <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
      <StringField :text-width="40" style="flex: 1;" :label="$t('component.material.name')" :object="material"
        property="name" />
      <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>

    <SectionField :title="$t('component.material.base')">
      <Color :label="$t('component.material.topColor')"  :object="material" property="topColor"
        @change="(newC, oldC) => changeProperty('topColor', newC, oldC, 'color3')" />
      <Slider :label="$t('component.material.topColorAlpha')" :object="material" property="topColorAlpha" :min="0" :max="1" />
      <Color :label="$t('component.material.bottomColor')" :object="material" property="bottomColor"
        @change="(newC, oldC) => changeProperty('bottomColor', newC, oldC, 'color3')" />
      <Slider :label="$t('component.material.bottomColorAlpha')" :object="material" property="bottomColorAlpha" :min="0" :max="1" />
      <Number :label="$t('component.material.offset')" :object="material" property="offset" />
      <Number :label="$t('component.material.scale')" :object="material" property="scale" />
      <Slider :label="$t('component.material.smoothness')" :object="material" property="smoothness" :min="0" :max="1" />
      <Switch :label="$t('component.material.disableLighting')" :object="material" property="disableLighting" />
    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Color from "@/component/base/Color.vue";
import Slider from "@/component/base/Slider.vue";
import Number from "@/component/base/Number.vue";
import Switch from "@/component/base/Switch.vue";

import { ElButton } from "element-plus";
import { GradientMaterial } from "@babylonjs/materials";
import { useMaterialActions } from "@/store/useMaterialActions";

const props = defineProps<{ mesh?: any; material: GradientMaterial; }>()

const emit = defineEmits<{
  (e: 'matChanged'): void
}>()

const { changeProperty, changeMaterial, shareMaterial} = useMaterialActions({
  material: props.material,
  mesh: props.mesh,
  emitMatChanged: () => emit('matChanged')
})

</script>