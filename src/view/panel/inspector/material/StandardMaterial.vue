<template>
  <div>
    <SectionField :title="'Material'">
      <StringField label="Name" :object="material" property="name" />
      <Switch label="Back Face Culling" :object="material" property="backFaceCulling" />
      <Number label="Alpha" :object="material" property="alpha" :min="0" :max="1" />
      <AlphaModeField :object="material" />
      <TransparencyModeField :object="material" />
      <MaterialInspectorUtils :mesh="mesh" :material="material" />
    </SectionField>

    <SectionField title="Material Textures">
      <Texture :object="material" title="Diffuse Texture" property="diffuseTexture" @change="force">
        <Switch label="Use Alpha" :object="material" property="useAlphaFromDiffuseTexture" />
      </Texture>

      <Texture :object="material" title="Bump Texture" property="bumpTexture" @change="force">
        <Switch label="Invert X" :object="material" property="invertNormalMapX" />
        <Switch label="Invert Y" :object="material" property="invertNormalMapY" />
        <Switch label="Use Parallax" :object="material" property="useParallax" @change="force" />
        <template v-if="material.useParallax">
          <Switch label="Use Parallax Occlusion" :object="material" property="useParallaxOcclusion" />
          <Number label="Parallax Scale Bias" :object="material" property="parallaxScaleBias" />
        </template>
      </Texture>

      <Texture :object="material" title="Specular Texture" property="specularTexture" />

      <Texture :object="material" title="Ambient Texture" property="ambientTexture" @change="force">
        <template v-if="material.ambientTexture">
          <Switch label="Use Gray Scale" :object="material" property="useAmbientInGrayScale" />
          <Number label="Strength" :object="material" property="ambientTextureStrength" :min="0" />
        </template>
      </Texture>

      <Texture :object="material" title="Opacity Texture" property="opacityTexture" />
      <Texture :object="material" title="Emissive Texture" property="emissiveTexture" />
      <Texture :object="material" title="Reflection Texture" property="reflectionTexture" acceptCubeTexture
        @change="force" />
    </SectionField>

    <SectionField title="Material Colors">
      <Color label="Diffuse" :object="material" property="diffuseColor" />
      <Color label="Specular" :object="material" property="specularColor" />
      <Color label="Ambient" :object="material" property="ambientColor" />
      <Color label="Emissive" :object="material" property="emissiveColor" />
    </SectionField>

    <SectionField title="Specular Properties">
      <Number label="Specular Power" :object="material" property="specularPower" :min="0" />
      <Number label="Direct Intensity" :object="material" property="directIntensity" :min="0" />
      <Number label="Environment Intensity" :object="material" property="environmentIntensity" :min="0" />
      <Number label="Emissive Intensity" :object="material" property="emissiveIntensity" :min="0" />
      <Number label="Specular Intensity" :object="material" property="specularIntensity" :min="0" />
    </SectionField>

    <SectionField title="Misc">
      <Switch label="Disable Lighting" :object="material" property="disableLighting" />
      <Switch label="Use Specular Over Alpha" :object="material" property="useSpecularOverAlpha" />
      <Switch label="Separate Culling Pass" :object="material" property="separateCullingPass" />
      <Number label="Z Offset" :object="material" property="zOffset" />
      <Number label="Z Offset Units" :object="material" property="zOffsetUnits" />
      <Switch label="Fog Enabled" :object="material" property="fogEnabled" />
    </SectionField>
  </div>
</template>

<script setup lang="ts">
import SectionField from "@/component/common/SectionField.vue"
import StringField from "@/component/base/StringField.vue"
import Switch from "@/component/base/Switch.vue"
import Number from "@/component/base/Number.vue"
import Texture from "@/component/base/Texture.vue"
import Color from "@/component/base/Color.vue"
import AlphaModeField from "@/component/base/AlphaModeField.vue"
import TransparencyModeField from "@/component/base/TransparencyModeField.vue"
import MaterialInspectorUtils from "./MaterialInspectorUtils.vue"

const props = defineProps<{ mesh?: any; material: any; }>()
const force = () => { }
</script>