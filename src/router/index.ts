import { createRouter, createWebHistory } from 'vue-router'
import DroneController from '@/components/DroneController.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DroneController
    }
  ]
})

export default router
