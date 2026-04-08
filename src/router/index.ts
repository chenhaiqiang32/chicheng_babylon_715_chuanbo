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
      props: (route) => ({
        projectId: route.query.projectId as string,
      }),
      component: () => import('@/view/app/index.vue'),
    },
    {
      path: '/app/3d',
      props: (route) => ({
        projectId: route.query.projectId as string,
      }),
      component: () => import('@/view/app/viewer3d.vue'),
    },
    /** 独立三维页别名：供 public/demo-3d-host.html 等 iframe 使用，与 /app 无耦合 */
    {
      path: '/3d-viewer',
      props: (route) => ({
        projectId: route.query.projectId as string,
      }),
      component: () => import('@/view/app/viewer3d.vue'),
    },
  ],
});

export default router;
