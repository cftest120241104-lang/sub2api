<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">游戏管理</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              维护游戏目录、默认 RTP、波动等级、上线版本和渠道启用覆盖情况。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
              <Icon name="refresh" size="sm" />
              {{ loading ? '刷新中' : '刷新' }}
            </button>
            <RouterLink class="btn btn-primary btn-sm" to="/admin/channel-games">
              <Icon name="swap" size="sm" />
              配置渠道
            </RouterLink>
          </div>
        </div>
      </section>

      <div v-if="loading && !snapshot" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="snapshot">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="游戏总数" :value="snapshot.totals.games" icon="grid" hint="游戏目录" />
          <MetricCard title="启用游戏" :value="enabledGames" icon="checkCircle" tone="success" hint="默认状态启用" />
          <MetricCard title="灰度游戏" :value="testingGames" icon="beaker" tone="warning" hint="测试或灰度状态" />
          <MetricCard title="Spin 局数" :value="snapshot.totals.spins" icon="play" tone="danger" hint="最近记录" />
        </section>

        <section class="card p-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div class="relative">
              <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model.trim="keyword" class="input pl-9" placeholder="搜索游戏代码、名称或标签" />
            </div>
            <select v-model="statusFilter" class="input">
              <option value="">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="testing">灰度测试</option>
              <option value="maintenance">维护中</option>
              <option value="disabled">已停用</option>
            </select>
            <select v-model="categoryFilter" class="input">
              <option value="">全部类型</option>
              <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
            </select>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article v-for="game in filteredGames" :key="game.code" class="card p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">{{ game.name }}</h2>
                  <StatusBadge :status="statusVariant(game.status)" :label="statusLabel(game.status)" />
                </div>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ game.code }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 px-3 py-2 text-right dark:bg-dark-900/60">
                <div class="text-xs text-gray-500 dark:text-gray-400">默认 RTP</div>
                <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ game.defaultRtp }}%</div>
              </div>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-4">
              <MiniStat label="类型" :value="game.category" />
              <MiniStat label="波动" :value="volatilityLabel(game.volatility)" />
              <MiniStat label="线数" :value="String(game.lines)" />
              <MiniStat label="版本" :value="game.releaseVersion" />
            </div>

            <div class="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-medium text-gray-900 dark:text-white">渠道覆盖</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ gameMetric(game.code)?.enabledChannels ?? 0 }} / {{ snapshot.channels.length }} 已启用</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="config in gameConfigs(game.code)"
                  :key="config.id"
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="config.status === 'enabled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300'"
                >
                  {{ config.channelCode }} · {{ statusLabel(config.status) }}
                </span>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <span v-for="tag in game.tags" :key="tag" class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-dark-700 dark:text-gray-300">
                  {{ tag }}
                </span>
              </div>
              <RouterLink class="btn btn-secondary btn-sm" :to="{ path: '/admin/channel-games', query: { game: game.code } }">
                渠道配置
              </RouterLink>
            </div>
          </article>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  loadGameAdminSnapshot,
  statusLabel,
  statusVariant,
  type GameAdminSnapshot,
  type GameAdminStatus,
  type GameVolatility,
} from '@/api/gameAdmin'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const loading = ref(false)
const snapshot = ref<GameAdminSnapshot | null>(null)
const keyword = ref('')
const statusFilter = ref<GameAdminStatus | ''>('')
const categoryFilter = ref('')

const MiniStat = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl bg-gray-50 p-3 dark:bg-dark-900/60' }, [
      h('div', { class: 'text-xs text-gray-500 dark:text-gray-400' }, props.label),
      h('div', { class: 'mt-1 truncate text-sm font-medium text-gray-900 dark:text-white', title: props.value }, props.value),
    ])
  },
})

const enabledGames = computed(() => snapshot.value?.games.filter(game => game.status === 'enabled').length ?? 0)
const testingGames = computed(() => snapshot.value?.games.filter(game => game.status === 'testing').length ?? 0)
const categories = computed(() => Array.from(new Set(snapshot.value?.games.map(game => game.category) ?? [])))

const filteredGames = computed(() => {
  const query = keyword.value.toLowerCase()
  return (snapshot.value?.games ?? []).filter((game) => {
    const matchesKeyword = !query ||
      game.code.toLowerCase().includes(query) ||
      game.name.toLowerCase().includes(query) ||
      game.tags.some(tag => tag.toLowerCase().includes(query))
    const matchesStatus = !statusFilter.value || game.status === statusFilter.value
    const matchesCategory = !categoryFilter.value || game.category === categoryFilter.value
    return matchesKeyword && matchesStatus && matchesCategory
  })
})

function gameConfigs(gameCode: string) {
  return snapshot.value?.configs.filter(config => config.gameCode === gameCode) ?? []
}

function gameMetric(gameCode: string) {
  return snapshot.value?.gameMetrics.find(metric => metric.gameCode === gameCode)
}

function volatilityLabel(value: GameVolatility): string {
  const labels: Record<GameVolatility, string> = {
    low: '低',
    medium: '中',
    high: '高',
  }
  return labels[value]
}

async function load() {
  loading.value = true
  try {
    snapshot.value = await loadGameAdminSnapshot()
  } catch (error) {
    console.error(error)
    appStore.showError('游戏数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
