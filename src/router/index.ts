import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      props: (route) => ({
        edit: route.query.runtime ? false : true,
        projectId: route.query.projectId as string,
      }),
      component: () => import('@/view/index.vue'),
    },
    {
      path: '/app',
      component: () => import('@/view/app/index.vue'),
    },
  ],
});

export default router;
