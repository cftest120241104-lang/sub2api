import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useNavigationLoadingState } from '@/composables/useNavigationLoading'
import { resolveDocumentTitle } from './title'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/admin/dashboard'
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/setup/SetupWizardView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Setup'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Login',
      titleKey: 'common.login'
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Forgot Password',
      titleKey: 'auth.forgotPasswordTitle'
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Reset Password'
    }
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '项目总览'
    }
  },
  {
    path: '/admin/game-service',
    name: 'AdminGameService',
    component: () => import('@/views/admin/GameServiceView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '游戏运营中心'
    }
  },
  {
    path: '/admin/channels',
    name: 'AdminGameChannels',
    component: () => import('@/views/admin/GameChannelsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '渠道管理'
    }
  },
  {
    path: '/admin/games',
    name: 'AdminGames',
    component: () => import('@/views/admin/GamesView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '游戏管理'
    }
  },
  {
    path: '/admin/channel-games',
    name: 'AdminChannelGames',
    component: () => import('@/views/admin/ChannelGameConfigView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '渠道游戏配置'
    }
  },
  {
    path: '/admin/scenarios',
    name: 'AdminScenarioConfigs',
    component: () => import('@/views/admin/ScenarioConfigsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '场景配置'
    }
  },
  {
    path: '/admin/rtp-control',
    name: 'AdminRtpControl',
    component: () => import('@/views/admin/RtpControlView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'RTP 与棋盘控制'
    }
  },
  {
    path: '/admin/players',
    name: 'AdminPlayerSessions',
    component: () => import('@/views/admin/PlayerSessionsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '玩家 / 会话概览'
    }
  },
  {
    path: '/admin/spins',
    name: 'AdminSpinRecords',
    component: () => import('@/views/admin/SpinRecordsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Spin / 注单记录'
    }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '用户管理'
    }
  },
  {
    path: '/admin/announcements',
    name: 'AdminAnnouncements',
    component: () => import('@/views/admin/AnnouncementsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '公告管理',
      titleKey: 'admin.announcements.title'
    }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('@/views/admin/GameAdminSettingsView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '上线设置'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: '404 Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  }
})

let authInitialized = false
const navigationLoading = useNavigationLoadingState()

router.beforeEach((to, _from, next) => {
  navigationLoading.startNavigation()

  const authStore = useAuthStore()
  const appStore = useAppStore()

  if (!authInitialized) {
    authStore.checkAuth()
    authInitialized = true
  }

  document.title = resolveDocumentTitle(
    to.meta.title,
    appStore.siteName,
    to.meta.titleKey as string | undefined
  )

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  if (!requiresAuth) {
    if (authStore.isAuthenticated && authStore.isAdmin && to.path === '/login') {
      next('/admin/dashboard')
      return
    }
    next()
    return
  }

  if (!authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  if (requiresAdmin && !authStore.isAdmin) {
    next('/login')
    return
  }

  next()
})

router.afterEach(() => {
  navigationLoading.endNavigation()
})

router.onError((error) => {
  console.error('Router error:', error)

  const isChunkLoadError =
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Loading CSS chunk') ||
    error.name === 'ChunkLoadError'

  if (!isChunkLoadError) return

  const reloadKey = 'chunk_reload_attempted'
  const lastReload = sessionStorage.getItem(reloadKey)
  const now = Date.now()

  if (!lastReload || now - Number.parseInt(lastReload) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString())
    window.location.reload()
  } else {
    console.error('Chunk load error persists after reload. Please clear browser cache.')
  }
})

export default router
