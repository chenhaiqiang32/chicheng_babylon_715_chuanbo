import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/view/index.vue'),
    },
    {
      path: '/app',
      component: () => import('@/view/app/index.vue'),
    },
  ],
});

export default router;
