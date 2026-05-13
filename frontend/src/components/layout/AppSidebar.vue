<template>
  <aside
    class="sidebar"
    :class="[
      sidebarCollapsed ? 'w-[72px]' : 'w-64',
      { '-translate-x-full lg:translate-x-0': !mobileOpen }
    ]"
  >
    <div class="sidebar-header" :class="{ 'sidebar-header-collapsed': sidebarCollapsed }">
      <div class="sidebar-logo flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-glow">
        <img v-if="settingsLoaded" :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
      </div>
      <div class="sidebar-brand" :class="{ 'sidebar-brand-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">
        <span class="sidebar-brand-title text-lg font-bold text-gray-900 dark:text-white">
          {{ displaySiteName }}
        </span>
        <VersionBadge :version="siteVersion" />
      </div>
    </div>

    <nav class="sidebar-nav scrollbar-hide">
      <div class="sidebar-section">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="sidebar-link mb-1"
          :class="{ 'sidebar-link-active': isActive(item.path), 'sidebar-link-collapsed': sidebarCollapsed }"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="handleMenuItemClick"
        >
          <Icon :name="item.icon" size="md" class="flex-shrink-0" />
          <span
            class="sidebar-label"
            :class="{ 'sidebar-label-collapsed': sidebarCollapsed }"
            :aria-hidden="sidebarCollapsed ? 'true' : 'false'"
          >
            {{ item.label }}
          </span>
        </router-link>
      </div>
    </nav>

    <div class="mt-auto border-t border-gray-100 p-3 dark:border-dark-800">
      <button
        @click="toggleTheme"
        class="sidebar-link mb-2 w-full"
        :class="{ 'sidebar-link-collapsed': sidebarCollapsed }"
        :title="sidebarCollapsed ? (isDark ? '浅色模式' : '深色模式') : undefined"
      >
        <Icon v-if="isDark" name="sun" size="md" class="flex-shrink-0 text-amber-500" />
        <Icon v-else name="moon" size="md" class="flex-shrink-0" />
        <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">
          {{ isDark ? '浅色模式' : '深色模式' }}
        </span>
      </button>

      <button
        @click="toggleSidebar"
        class="sidebar-link w-full"
        :class="{ 'sidebar-link-collapsed': sidebarCollapsed }"
        :title="sidebarCollapsed ? '展开' : '收起'"
      >
        <Icon :name="sidebarCollapsed ? 'chevronRight' : 'chevronLeft'" size="md" class="flex-shrink-0" />
        <span class="sidebar-label" :class="{ 'sidebar-label-collapsed': sidebarCollapsed }" :aria-hidden="sidebarCollapsed ? 'true' : 'false'">收起</span>
      </button>
    </div>
  </aside>

  <transition name="fade">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="closeMobile"
    ></div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores'
import VersionBadge from '@/components/common/VersionBadge.vue'
import Icon from '@/components/icons/Icon.vue'

type IconName = InstanceType<typeof Icon>['$props']['name']

interface NavItem {
  path: string
  label: string
  icon: IconName
}

const route = useRoute()
const appStore = useAppStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const mobileOpen = computed(() => appStore.mobileOpen)
const isDark = ref(document.documentElement.classList.contains('dark'))
const siteLogo = computed(() => appStore.siteLogo)
const siteVersion = computed(() => appStore.siteVersion)
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)
const displaySiteName = computed(() => {
  return !appStore.siteName || appStore.siteName === 'Sub2API' ? 'Game Admin' : appStore.siteName
})

const navItems: NavItem[] = [
  { path: '/admin/dashboard', label: '仪表盘', icon: 'grid' },
  { path: '/admin/channels', label: '渠道管理', icon: 'globe' },
  { path: '/admin/games', label: '游戏管理', icon: 'badge' },
  { path: '/admin/channel-games', label: '渠道游戏配置', icon: 'swap' },
  { path: '/admin/scenarios', label: '场景配置', icon: 'beaker' },
  { path: '/admin/players', label: '玩家 / 会话', icon: 'users' },
  { path: '/admin/spins', label: 'Spin / 注单', icon: 'clipboard' },
  { path: '/admin/game-service', label: '游戏服务调试', icon: 'server' },
  { path: '/admin/announcements', label: '公告管理', icon: 'bell' },
  { path: '/admin/users', label: '管理员用户', icon: 'userCircle' },
  { path: '/admin/settings', label: '系统设置', icon: 'cog' },
]

function toggleSidebar() {
  appStore.toggleSidebar()
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function closeMobile() {
  appStore.setMobileOpen(false)
}

function handleMenuItemClick() {
  if (mobileOpen.value) {
    setTimeout(() => {
      appStore.setMobileOpen(false)
    }, 150)
  }
}

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const savedTheme = localStorage.getItem('theme')
if (
  savedTheme === 'dark' ||
  (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  isDark.value = true
  document.documentElement.classList.add('dark')
}
</script>

<style scoped>
.sidebar-logo {
  flex: 0 0 2.25rem;
  min-width: 2.25rem;
}

.sidebar-header-collapsed {
  gap: 0;
  padding-left: 1.125rem;
  padding-right: 1.125rem;
}

.sidebar-brand {
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
  transition:
    max-width 0.22s ease,
    opacity 0.14s ease,
    transform 0.14s ease;
  max-width: 12rem;
}

.sidebar-brand-collapsed {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-4px);
  pointer-events: none;
}

.sidebar-brand-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-link-collapsed {
  gap: 0;
  padding-left: 0.875rem;
  padding-right: 0.875rem;
}

.sidebar-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    max-width 0.2s ease,
    opacity 0.12s ease,
    transform 0.12s ease;
  max-width: 12rem;
}

.sidebar-label-collapsed {
  max-width: 0;
  opacity: 0;
  transform: translateX(-4px);
  pointer-events: none;
}
</style>
