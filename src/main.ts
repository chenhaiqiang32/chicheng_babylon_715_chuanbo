import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import './style/index.scss';
import './style/dark.css';
import './style/element.scss';
import { i18n } from './i18n';
import { undo, redo, onUndoObservable, onRedoObservable } from './tools/undoredo';

const app = createApp(App);

app.use(i18n);
app.use(createPinia());
app.use(router);

app.mount('#app');

// 添加全局键盘事件监听，实现撤销/重做功能
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
  //  event.preventDefault();
    undo();
  }
  else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault();
    redo();
  }

  else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
  //  event.preventDefault();
    redo();
  }
});
