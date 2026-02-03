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
      <!-- <Color :label="$t('component.material.ambientColor')" :object="material" property="ambientColor"
        @change="(newC, oldC) => changeProperty('albedoColor', newC, oldC, 'color3')" /> -->
      <Color :label="$t('component.material.diffuseColor')" :object="material" property="diffuseColor"
        @change="(newC, oldC) => changeProperty('diffuseColor', newC, oldC, 'color3')" />
      <!-- <Color :label="$t('component.material.specularColor')" :object="material" property="specularColor"
        @change="(newC, oldC) => changeProperty('specularColor', newC, oldC, 'color3')" /> -->
      <Color :label="$t('component.material.emissive')" :object="material" property="emissiveColor"
        @change="(newC, oldC) => changeProperty('emissiveColor', newC, oldC, 'color3')" />
      <Switch :label="$t('component.material.disableLighting')" :object="material" property="disableLighting"/>
    </SectionField>

    <SectionField :title="$t('component.material.texture')">
      <Texture :title="$t('component.material.diffuseTexture')":object="material"  property="diffuseTexture" />
      <Texture :title="$t('component.material.ambientTexture')":object="material"  property="ambientTexture" />
        <template v-if="material.ambientTexture">
            <Switch :label="$t('component.material.useAmbientInGrayScale')" :object="material"
              property="useAmbientInGrayScale" />
            <Slider :label="$t('component.material.ambientTextureStrength')" :object="material"
              property="ambientTextureStrength" :min="0" />
            <Slider :label="$t('component.material.ambientTextureImpactOnAnalyticalLights')" :object="material"
              property="ambientTextureImpactOnAnalyticalLights" :min="0" :max="1" />
          </template>
      <Texture :title="$t('component.material.opacityTexture')":object="material"  property="opacityTexture" />
      <Texture :title="$t('component.material.refractionTexture')":object="material"  property="refractionTexture" />
      <Texture :title="$t('component.material.emissiveTexture')":object="material"  property="emissiveTexture" />
      <Texture :title="$t('component.material.specularTexture')":object="material"  property="specularTexture" />
      <Texture :title="$t('component.material.bumpTexture')":object="material"  property="bumpTexture" />
        <template v-if="material.bumpTexture">
            <Switch :label="$t('component.material.invertNormalMapX')" :object="material" property="invertNormalMapX" />
            <Switch :label="$t('component.material.invertNormalMapY')" :object="material" property="invertNormalMapY" />
            <Switch :label="$t('component.material.useObjectSpaceNormalMap')" :object="material"
              property="useObjectSpaceNormalMap" />
            <Switch :label="$t('component.material.useParallax')" :object="material" property="useParallax"
              @change="force" />
            <template v-if="material.useParallax">
              <Switch :label="$t('component.material.useParallaxOcclusion')" :object="material"
                property="useParallaxOcclusion" />
              <Slider :label="$t('component.material.parallaxScaleBias')" :object="material"
                property="parallaxScaleBias" />
            </template>
            <Switch :label="$t('component.material.disableBumpMap')" :object="material" property="disableBumpMap"
              @change="force" />
          </template>
      <Texture :title="$t('component.material.lightmapTexture')":object="material"  property="lightmapTexture" />
    </SectionField> 

    <SectionField :title="$t('component.material.light')">
      <Slider :label="$t('component.material.specularPower')" :object="material" property="specularPower" :max="64"/>
    </SectionField>

  </SectionField>
</template>

<script setup lang="ts">
import { inject, onMounted, ref, watch, } from "vue"
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Switch from "@/component/base/Switch.vue"
import Texture from "@/component/base/Texture.vue"
import Color from "@/component/base/Color.vue"
import Slider from "@/component/base/Slider.vue"
import { useDialog } from "@/view/dialog"
import { RuntimeLibrary } from "@/3d/assets/RuntimeLibrary"
import { StandardMaterial } from "@babylonjs/core"

const props = defineProps<{ mesh?: any; material: StandardMaterial; }>()
const force = () => { }
const emit =defineEmits<{
  (e: 'matChanged'): void
}>()

async function shareMaterial() {
  props.material.share = true;
  props.material.isDirty = true;
  RuntimeLibrary.Instance.addMaterial(props.material);
}

async function changeMaterial() {
  const ChooseResDialog = (await import('@/view/dialog/ChooseResDialog.vue')).default
  useDialog(ChooseResDialog, {
    choose: async (res: any) => {
      if (res) {
        const material = await RuntimeLibrary.Instance.getMaterial(res.uuid)
        if (material) {
          props.mesh.material = material
          emit('matChanged');
        }
      }
    },
    type: 'material'
  })
}

onMounted(() => {
  window.addEventListener('keydown', (k) => {
    console.log(props.material.roughness);
  })
})

const propertyChanged = inject<(property: string, newValue: any, oldValue: any, type: string) => void>('propertyChanged')

function changeProperty(property: string, newValue: any, oldValue: any, type: string) {
  propertyChanged?.('material.' + property, newValue, oldValue, type);
  // 更新材质球的效果
  RuntimeLibrary.Instance.dispatch('onMaterialChanged', { useCache: false });
}

</script>