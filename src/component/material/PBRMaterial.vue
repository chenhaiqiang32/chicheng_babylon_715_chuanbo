<template>
  <div>
    <SectionField :title="'Material'" :label="material.getClassName()">
      <StringField label="Name" :object="material" property="name" />
      <Switch label="Back Face Culling" :object="material" property="backFaceCulling" />
      <Number label="Alpha" :object="material" property="alpha" :min="0" :max="1" />
      <AlphaModeField :object="material" />
      <TransparencyModeField :object="material" />
      <MaterialInspectorUtils :mesh="mesh" :material="material" />
    </SectionField>

    <SectionField title="Material Textures">
      <Texture :object="material" title="Albedo Texture" property="albedoTexture" @change="force">
        <template v-if="material.albedoTexture">
          <Switch label="Use Alpha" :object="material" property="useAlphaFromDiffuseTexture" />
          <Number label="Alpha Cut Off" :object="material" property="alphaCutOff" :min="0" :max="1" />
        </template>
      </Texture>

      <Texture :object="material" title="Bump Texture" property="bumpTexture" @change="force">
        <template v-if="material.bumpTexture">
          <Switch label="Inverse X" :object="material" property="invertNormalMapX" />
          <Switch label="Inverse Y" :object="material" property="invertNormalMapY" />
          <Switch label="Use Object Space Normal Map" :object="material" property="useObjectSpaceNormalMap" />
          <Switch label="Use Parallax" :object="material" property="useParallax" @change="force" />
          <template v-if="material.useParallax">
            <Switch label="Use Parallax Occlusion" :object="material" property="useParallaxOcclusion" />
            <Number label="Parallax Scale Bias" :object="material" property="parallaxScaleBias" />
          </template>
          <Switch label="Disable Bump Map" :object="material" property="disableBumpMap" @change="force" />
        </template>
      </Texture>

      <template v-if="!material.metallicTexture">
        <Texture :object="material" title="Reflectivity Texture" property="reflectivityTexture" @change="force" />
        <Texture :object="material" title="Micro Surface Texture" property="microSurfaceTexture" @change="force" />
      </template>

      <Texture :object="material" title="Ambient Texture" property="ambientTexture" @change="force">
        <template v-if="material.ambientTexture">
          <Switch label="Use Gray Scale" :object="material" property="useAmbientInGrayScale" />
          <Number label="Strength" :object="material" property="ambientTextureStrength" :min="0" />
          <Number label="Impact On Analytical Lights" :object="material"
            property="ambientTextureImpactOnAnalyticalLights" :min="0" :max="1" />
        </template>
      </Texture>

      <Texture :object="material" title="Opacity Texture" property="opacityTexture" />
      <Texture :object="material" title="Reflection Texture" property="reflectionTexture" @change="force" />

      <Texture :object="material" title="Metallic Texture" property="metallicTexture" @change="force">
        <template v-if="material.metallicTexture">
          <Switch label="Use Roughness from alpha" :object="material" property="useRoughnessFromMetallicTextureAlpha" />
          <Switch label="Use Roughness from green" :object="material" property="useRoughnessFromMetallicTextureGreen" />
          <Switch label="Use Metallness From Blue" :object="material" property="useMetallnessFromMetallicTextureBlue" />
          <Switch label="Use Ambient From Red" :object="material" property="useAmbientOcclusionFromMetallicTextureRed"
            @change="force" />
          <template v-if="material.useAmbientOcclusionFromMetallicTextureRed">
            <Number label="Ambient Strength" :object="material" property="ambientTextureStrength" :min="0" />
          </template>
        </template>
      </Texture>

      <Texture :object="material" title="Metallic Reflectance Texture" property="metallicReflectanceTexture"
        @change="force">
        <template v-if="material.metallicReflectanceTexture">
          <Switch label="Use Only Metallic From Metallic Reflectance Texture" :object="material"
            property="useOnlyMetallicFromMetallicReflectanceTexture" @change="force" />
        </template>
      </Texture>

      <Texture :object="material" title="Emissive Texture" property="emissiveTexture" />
      <Texture :object="material" title="Lightmap Texture" property="lightmapTexture">
        <template v-if="material.lightmapTexture">
          <Switch label="Use Lightmap As Shadowmap" :object="material" property="useLightmapAsShadowmap" />
        </template>
      </Texture>
    </SectionField>

    <SectionField title="Material Colors">
      <Color :label="'Albedo'" :object="material" property="albedoColor" />
      <Color :label="'Reflectivity'" :object="material" property="reflectivityColor" />
      <Color :label="'Reflection'" :object="material" property="reflectionColor" />
      <Color :label="'Ambient'" :object="material" property="ambientColor" />
      <Color :label="'Emissive'" :object="material" property="emissiveColor" />
      <Color v-if="material.metallic !== null" :label="'Metallic Reflectance'" :object="material"
        property="metallicReflectanceColor" />
    </SectionField>

    <SectionField title="Metallic / Roughness">
      <Number label="Metallic F0 Factor" :object="material" property="metallicF0Factor" />
      <Number label="Base Weight" :object="material" property="baseWeight" :min="0" :max="1" />

      <Switch label="Metallic" :object="metallicToggle" property="checked" :noUndoRedo="true"
        @change="toggleMetallic" />
      <Number v-if="material.metallic !== null" label=" " :object="material" property="metallic" :min="0" :max="1" />

      <Switch label="Roughness" :object="roughnessToggle" property="checked" :noUndoRedo="true"
        @change="toggleRoughness" />
      <Number v-if="material.roughness !== null" label=" " :object="material" property="roughness" :min="0" :max="1" />
    </SectionField>

    <SectionField v-if="material.metallic === null && material.roughness === null" title="Micro Surface">
      <Number label="Microsurface" :object="material" property="microSurface" :min="0" :max="1" />
      <template v-if="material.reflectivityTexture">
        <Switch label="Use Auto Micro Surface From Reflectivity Map" :object="material"
          property="useAutoMicroSurfaceFromReflectivityMap" />
        <Switch label="Use Micro Surface From Reflectivity Map Alpha" :object="material"
          property="useMicroSurfaceFromReflectivityMapAlpha" />
      </template>
    </SectionField>

    <SectionField title="Intensity Properties">
      <Number label="Direct Intensity" :object="material" property="directIntensity" :min="0" />
      <Number label="Environment Intensity" :object="material" property="environmentIntensity" :min="0" />
      <Number label="Emissive Intensity" :object="material" property="emissiveIntensity" :min="0" />
      <Number label="Specular Intensity" :object="material" property="specularIntensity" :min="0" />
    </SectionField>

    <SectionField title="Misc">
      <Switch label="Unlit" :object="material" property="unlit" />
      <Switch label="Disable Lighting" :object="material" property="disableLighting" />
      <Switch label="Enable Specular Anti Aliasing" :object="material" property="enableSpecularAntiAliasing" />
      <Switch label="Force Irradiance In Fragment" :object="material" property="forceIrradianceInFragment" />
      <Switch label="Use Radiance Occlusion" :object="material" property="useRadianceOcclusion" />
      <Switch label="Use Horizon Occlusion" :object="material" property="useHorizonOcclusion" />
      <Switch label="Use Physical Light Falloff" :object="material" property="usePhysicalLightFalloff" />
      <Switch label="Use Radiance Over Alpha" :object="material" property="useRadianceOverAlpha" />
      <Switch label="Use Specular Over Alpha" :object="material" property="useSpecularOverAlpha" />
      <Switch label="Separate Culling Pass" :object="material" property="separateCullingPass" />
      <Switch label="Force Alpha Test" :object="material" property="forceAlphaTest" />
      <Number label="Z Offset" :object="material" property="zOffset" />
      <Number label="Z Offset Units" :object="material" property="zOffsetUnits" />
      <Switch label="Fog Enabled" :object="material" property="fogEnabled" />
      <Switch label="Use Logarithmic Depth" :object="material" property="useLogarithmicDepth" />
    </SectionField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
//import { registerSimpleUndoRedo } from "../../tools/undoredo"
import AlphaModeField from "../base/AlphaModeField.vue"
import TransparencyModeField from "../base/TransparencyModeField.vue"
import MaterialInspectorUtils from "../base/MaterialInspectorUtils.vue"
import SectionField from "../base/SectionField.vue"
import StringField from "../base/StringField.vue"
import Switch from "../base/Switch.vue"
import Number from "../base/Number.vue"
import Texture from "../base/Texture.vue"
import Color from "../base/Color.vue"
const props = defineProps<{ mesh?: any; material: any; editor: any }>()

const labelDiv = (t: string) => ({ render: () => t }) as any
const force = () => { }
const metallicToggle = computed(() => ({ checked: props.material.metallic !== null }))
const roughnessToggle = computed(() => ({ checked: props.material.roughness !== null }))

const toggleMetallic = (v: boolean) => {
  // registerSimpleUndoRedo({ object: props.material, property: "metallic", oldValue: props.material.metallic, newValue: v ? 1 : null, executeRedo: true })
}

const toggleRoughness = (v: boolean) => {
  // registerSimpleUndoRedo({ object: props.material, property: "roughness", oldValue: props.material.roughness, newValue: v ? 1 : null, executeRedo: true })
}
</script>