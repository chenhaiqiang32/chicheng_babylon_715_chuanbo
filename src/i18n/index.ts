import { createI18n } from 'vue-i18n';
import zh from './zh.json';
import en from './en.json';

export const i18n = createI18n({
  locale: 'zh',
  fallbackLocale: 'zh',
  messages: {
    zh,
    en,
  },
});

export function $i18nT(key: string) {
  return i18n.global.t(key);
}
globalThis.$i18nT = $i18nT;
