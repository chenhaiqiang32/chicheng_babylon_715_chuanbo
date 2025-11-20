import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTheme = defineStore('theme', () => {
  const theme = ref('light')
  function setTheme(newTheme: string) {
    theme.value = newTheme
  }
  return { theme, setTheme }
})
