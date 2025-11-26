import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import './style/index.scss';
import './style/dark.css';
import './style/element.scss';
import 'virtual:svg-icons-register';

import { i18n } from './i18n';

const app = createApp(App);

app.use(i18n);
app.use(createPinia());
app.use(router);

app.mount('#app');
