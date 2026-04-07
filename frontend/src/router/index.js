import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/povesti', name: 'stories', component: () => import('../views/StoriesView.vue') },
  { path: '/povesti/:slug', name: 'product', component: () => import('../views/ProductView.vue') },
  { path: '/pagini/:slug', name: 'page', component: () => import('../views/PageView.vue') },
  { path: '/politici/:slug', name: 'policy', component: () => import('../views/PageView.vue') },
  { path: '/blog/:category', name: 'blog-index', component: () => import('../views/BlogIndexView.vue') },
  { path: '/blog/:category/:slug', name: 'blog-post', component: () => import('../views/BlogPostView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
