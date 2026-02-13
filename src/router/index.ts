import { createRouter, createWebHistory } from 'vue-router'
import OHLCVCharView from '../components/OHLCVCharView.vue'

const routes = [
  {
    path: '/',
    name: 'OHLCV',
    component: OHLCVCharView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
