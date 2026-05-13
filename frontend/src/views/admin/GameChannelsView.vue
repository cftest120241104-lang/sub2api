<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">渠道管理</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              管理运营渠道、结算周期、默认分成和渠道级投注限额。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
              <Icon name="refresh" size="sm" />
              {{ loading ? '刷新中' : '刷新' }}
            </button>
            <RouterLink class="btn btn-primary btn-sm" to="/admin/channel-games">
              <Icon name="swap" size="sm" />
              渠道游戏配置
            </RouterLink>
          </div>
        </div>
      </section>

      <div v-if="loading && !snapshot" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="snapshot">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="渠道总数" :value="snapshot.totals.channels" icon="globe" hint="全部接入渠道" />
          <MetricCard title="在线渠道" :value="enabledChannels.length" icon="checkCircle" tone="success" hint="状态为已启用" />
          <MetricCard title="配置游戏" :value="snapshot.totals.enabledChannelGames" icon="grid" tone="warning" hint="启用的渠道游戏" />
          <MetricCard title="活跃玩家" :value="snapshot.totals.activeSessions" icon="users" tone="danger" hint="当前在线会话" />
        </section>

        <section class="card p-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div class="relative">
              <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model.trim="keyword" class="input pl-9" placeholder="搜索渠道代码、名称或运营方" />
            </div>
            <select v-model="statusFilter" class="input">
              <option value="">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="testing">灰度测试</option>
              <option value="maintenance">维护中</option>
              <option value="disabled">已停用</option>
            </select>
            <select v-model="regionFilter" class="input">
              <option value="">全部区域</option>
              <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
            </select>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article
            v-for="channel in filteredChannels"
            :key="channel.code"
            class="card p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">{{ channel.name }}</h2>
                  <StatusBadge :status="statusVariant(channel.status)" :label="statusLabel(channel.status)" />
                </div>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ channel.code }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 px-3 py-2 text-right dark:bg-dark-900/60">
                <div class="text-xs text-gray-500 dark:text-gray-400">默认分成</div>
                <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ channel.sharePercent }}%</div>
              </div>
            </div>

            <dl class="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoItem label="运营方" :value="channel.operator" />
              <InfoItem label="区域 / 币种" :value="`${channel.region} / ${channel.currency}`" />
              <InfoItem label="结算周期" :value="channel.settlementCycle" />
              <InfoItem label="接入方式" :value="modeLabel(channel.apiMode)" />
              <InfoItem label="单注范围" :value="`${formatGameMoney(channel.minBetCents, channel.currency)} - ${formatGameMoney(channel.maxBetCents, channel.currency)}`" />
              <InfoItem label="日限额" :value="formatGameMoney(channel.dailyLimitCents, channel.currency)" />
            </dl>

            <div class="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-medium text-gray-900 dark:text-white">渠道游戏</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ channelEnabledGames(channel.code) }} / {{ snapshot.games.length }} 已启用</span>
              </div>
              <div class="space-y-2">
                <div v-for="config in channelConfigs(channel.code).slice(0, 4)" :key="config.id" class="flex items-center justify-between gap-3 text-sm">
                  <span class="min-w-0 truncate text-gray-700 dark:text-gray-300">{{ gameName(config.gameCode) }}</span>
                  <StatusBadge :status="statusVariant(config.status)" :label="statusLabel(config.status)" />
                </div>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>更新时间：{{ formatDate(channel.updatedAt) }}</span>
              <RouterLink class="btn btn-secondary btn-sm" :to="{ path: '/admin/channel-games', query: { channel: channel.code } }">
                配置游戏
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
  formatGameMoney,
  loadGameAdminSnapshot,
  statusLabel,
  statusVariant,
  type GameAdminSnapshot,
  type GameAdminStatus,
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
const regionFilter = ref('')

const InfoItem = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl bg-gray-50 p-3 dark:bg-dark-900/60' }, [
      h('dt', { class: 'text-xs text-gray-500 dark:text-gray-400' }, props.label),
      h('dd', { class: 'mt-1 truncate text-sm font-medium text-gray-900 dark:text-white', title: props.value }, props.value),
    ])
  },
})

const enabledChannels = computed(() => snapshot.value?.channels.filter(channel => channel.status === 'enabled') ?? [])
const regions = computed(() => Array.from(new Set(snapshot.value?.channels.map(channel => channel.region) ?? [])))

const filteredChannels = computed(() => {
  const query = keyword.value.toLowerCase()
  return (snapshot.value?.channels ?? []).filter((channel) => {
    const matchesKeyword = !query ||
      channel.code.toLowerCase().includes(query) ||
      channel.name.toLowerCase().includes(query) ||
      channel.operator.toLowerCase().includes(query)
    const matchesStatus = !statusFilter.value || channel.status === statusFilter.value
    const matchesRegion = !regionFilter.value || channel.region === regionFilter.value
    return matchesKeyword && matchesStatus && matchesRegion
  })
})

function channelConfigs(channelCode: string) {
  return snapshot.value?.configs.filter(config => config.channelCode === channelCode) ?? []
}

function channelEnabledGames(channelCode: string): number {
  return channelConfigs(channelCode).filter(config => config.status === 'enabled').length
}

function gameName(gameCode: string): string {
  return snapshot.value?.games.find(game => game.code === gameCode)?.name ?? gameCode
}

function modeLabel(mode: string): string {
  const labels: Record<string, string> = {
    direct: '直营网关',
    aggregator: '聚合接入',
    sandbox: '沙盒',
  }
  return labels[mode] ?? mode
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  try {
    snapshot.value = await loadGameAdminSnapshot()
  } catch (error) {
    console.error(error)
    appStore.showError('渠道数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
