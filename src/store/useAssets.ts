import { RuntimeLibrary } from '@/3d/assets/runtimeLibrary';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

export const useAssets = defineStore('assets', () => {
  const assets = RuntimeLibrary.Instance;
  const assetsArray = shallowRef<[]>([]);

  assets.on('onChanged', () => {});

  return {
    assetsArray,
  };
});
