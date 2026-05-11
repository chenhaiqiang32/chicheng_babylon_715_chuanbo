/** Auto-generated from public/test. Do not edit. */
export const MODEL_URLS: string[] = [
  './test/20new.glb',
  './test/20new_lite.glb',
  './test/donghua01new.glb',
  './test/donghua02new.glb',
  './test/donghua03new.glb',
  './test/gaiban.glb',
];

/** C012H 垂直阵：param.fsmsRaw，与上表 20new / 20new_lite 路径一致 */
export type VerticalArrayFsmsRaw = '0' | '1';
export const VERTICAL_ARRAY_C012_VARIANT: Record<
  VerticalArrayFsmsRaw,
  { url: string; sceneName: '20new' | '20new_lite' }
> = {
  '0': { url: './test/20new.glb', sceneName: '20new' },
  '1': { url: './test/20new_lite.glb', sceneName: '20new_lite' },
};
