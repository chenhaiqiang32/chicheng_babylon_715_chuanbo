import { ModelAssets } from '@/3d/assets/AssetsManager';
import { RuntimeAssets } from '@/3d/assets/RuntimeAssets';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

export const useAssets = defineStore('assets', () => {
  const assets = RuntimeAssets.Instance;
  const assetsArray = shallowRef<[]>([]);

  assets.on('onChanged', () => {
    assetsArray.value = [...assets.sceneAssets];
  });

  return {
    assetsArray,
  };
});
