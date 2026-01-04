import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useEditor = defineStore('editor', () => {
  const loading = ref(0);
  const setLoading = (v: number) => {
    loading.value = Math.floor(v * 100) * 0.01;
  };
  const editorLayout = ref({
    left: 280,
    bottom: 280,
    right: 280,
  });
  function init() {
    const layoutJson = localStorage.getItem('editorLayout');
    if (layoutJson) {
      editorLayout.value = JSON.parse(layoutJson);
    }
  }
  init();
  watch(
    editorLayout,
    (newVal, oldVal) => {
      localStorage.setItem('editorLayout', JSON.stringify(newVal));
    },
    {
      deep: true,
    },
  );
  return {
    loading,
    setLoading,
    editorLayout,
  };
});
