import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Capability from '../views/Capability.vue'
import Claim from '../views/Claim.vue'

import { getCurrentUser } from '../lib/firebase'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      requiresAuth: true
    },
    children: [
      { path: '', name: 'Home', redirect: 'capability' },
      {
        path: 'capability',
        name: 'Capability',
        component: Capability,
      },
      {
        path: 'claim',
        name: 'Claim',
        component: Claim,
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})


router.beforeEach(async (to, from, next) => {
  const currentUser = await getCurrentUser()
  const requiresAuth = to.matched.some(x => x.meta.requiresAuth)

  if (requiresAuth && !currentUser) {
    next('/login')
  } else {
    if (currentUser && to.name === 'Login') {
      next('/')
    } else {
      next()
    }
  }
})


export default router
