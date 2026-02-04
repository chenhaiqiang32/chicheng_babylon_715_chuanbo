<template>
  <SectionField :title="$t('component.material.title')">

    <template #right>
      <ElButton type="info" size="small" @click.stop="shareMaterial">{{ $t('component.material.share') }}</ElButton>
    </template>
    <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
      <StringField :text-width="40" style="flex: 1;" :label="$t('component.material.name')" :object="material" property="name" />
      <ElButton type="info" size="small" @click="changeMaterial">更换</ElButton>
    </div>

    <SectionField :title="$t('component.material.base')">
      <Slider :label="$t('component.material.luminance')" :object="material" property="luminance" :min="0" :max="1"/>
      <Number :label="$t('component.material.turbidity')" :object="material" property="turbidity"/>
      <Number :label="$t('component.material.rayleigh')"  :object="material" property="rayleigh" />
      <Number :label="$t('component.material.distance')"  :object="material" property="distance" />

      <Vector :label="$t('component.material.cameraOffset')" :object="material" property="cameraOffset" />
      <Vector :label="$t('component.material.up')"        :object="material" property="up" />
      <Switch :label="$t('component.material.useSunPosition')" :object="material" property="useSunPosition" />
        <template v-if="material.useSunPosition" >
          <Vector :label="$t('component.material.sunPosition')" :object="material" property="sunPosition" />
        </template>

    </SectionField>
  </SectionField>
</template>

<script setup lang="ts">
import SectionField from '@/component/common/SectionField.vue';
import StringField from '@/component/base/StringField.vue';
import Slider from '@/component/base/Slider.vue';
import Number from '@/component/base/Number.vue';
import Switch from '@/component/base/Switch.vue';
import Vector from '@/component/base/Vector.vue';
import { useMaterialActions } from '@/store/useMaterialActions';
import { ElButton } from 'element-plus';
import { SkyMaterial } from '@babylonjs/materials';

const props = defineProps<{ mesh?: any; material: SkyMaterial; }>()

const emit = defineEmits<{
  (e: 'matChanged'): void
}>()

const {changeProperty, changeMaterial, shareMaterial} = useMaterialActions({
  material: props.material,
  mesh: props.mesh,
  emitMatChanged: () => emit('matChanged')
})

</script>