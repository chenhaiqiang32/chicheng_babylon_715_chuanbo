import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';


export default defineConfig({
  plugins: [
    vue(),
    // basicSsl(),
    AutoImport({
      resolvers: [
        ElementPlusResolver({
          importStyle: false,
        }),
      ],
    }),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: false,
        }),
      ],
    }),
    createSvgIconsPlugin({
      // 指定需要缓存的图标文件夹
      iconDirs: [path.resolve(process.cwd(), 'src/assets/svg')],
      // 指定symbolId格式
      symbolId: 'icon-[name]',
    }),
  ],
  css: {
    preprocessorOptions: {
      //@ts-ignore
      scss: { api: 'modern-compiler' },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
