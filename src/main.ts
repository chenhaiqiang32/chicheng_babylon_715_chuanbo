import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import './style/index.scss';
import './style/dark.css';
import './style/element.scss';
import 'virtual:svg-icons-register';

import { i18n } from './i18n';
import { undo, redo } from './tools/undoredo';
import { registerKeyDown } from './utils/ShortcutKey';
import { useEditor } from './store/useEditor';
import { Editor } from './3d/Editor';
import { ArcRotateCamera } from '@babylonjs/core';

const app = createApp(App);
app.use(i18n);
app.use(createPinia());
app.use(router);

app.mount('#app');

registerKeyDown((event) => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey && key === 'z') {
    undo();
  } else if ((event.ctrlKey || event.metaKey) && key === 'y') {
    redo();
  } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'z') {
    redo();
  }
  if (event.ctrlKey && key == '5') {
    useEditor().edit = !useEditor().edit;
    const camera = Editor.Instance.Scene.activeCamera as ArcRotateCamera;
    camera.useAutoRotationBehavior = !useEditor().edit;
  }
});
