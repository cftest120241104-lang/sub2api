<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Spin / 注单记录</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              查看每一局 Spin 的渠道、游戏、玩家、下注、派彩、状态和场景。
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
            <Icon name="refresh" size="sm" />
            {{ loading ? '刷新中' : '刷新' }}
          </button>
        </div>
      </section>

      <div v-if="loading && !snapshot" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="snapshot">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="记录数" :value="filteredSpins.length" icon="clipboard" hint="当前筛选" />
          <MetricCard title="总下注" :value="formatGameMoney(totalBetCents)" icon="dollar" tone="warning" hint="stake 合计" />
          <MetricCard title="总派彩" :value="formatGameMoney(totalWinCents)" icon="gift" tone="success" hint="win 合计" />
          <MetricCard title="平台净额" :value="formatGameMoney(totalNetCents)" icon="calculator" :tone="totalNetCents >= 0 ? 'success' : 'danger'" hint="下注 - 派彩" />
        </section>

        <section class="card p-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
            <div class="relative">
              <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model.trim="keyword" class="input pl-9" placeholder="搜索局 ID、玩家、渠道或游戏" />
            </div>
            <select v-model="channelFilter" class="input">
              <option value="">全部渠道</option>
              <option v-for="channel in snapshot.channels" :key="channel.code" :value="channel.code">{{ channel.name }}</option>
            </select>
            <select v-model="gameFilter" class="input">
              <option value="">全部游戏</option>
              <option v-for="game in snapshot.games" :key="game.code" :value="game.code">{{ game.name }}</option>
            </select>
            <select v-model="statusFilter" class="input">
              <option value="">全部状态</option>
              <option value="COMPLETED">已完成</option>
              <option value="FAILED">失败</option>
            </select>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="card overflow-hidden">
            <div class="card-header">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">记录列表</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">点击记录查看详情。</p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
                  <tr>
                    <th class="px-6 py-3">局 ID</th>
                    <th class="px-6 py-3">渠道 / 游戏</th>
                    <th class="px-6 py-3">玩家</th>
                    <th class="px-6 py-3">状态</th>
                    <th class="px-6 py-3 text-right">下注</th>
                    <th class="px-6 py-3 text-right">派彩</th>
                    <th class="px-6 py-3 text-right">净额</th>
                    <th class="px-6 py-3">时间</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                  <tr
                    v-for="spin in filteredSpins"
                    :key="spin.roundId"
                    class="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-dark-900/60"
                    :class="selectedSpin?.roundId === spin.roundId ? 'bg-primary-50/70 dark:bg-primary-900/20' : ''"
                    @click="selectedSpin = spin"
                  >
                    <td class="max-w-[220px] truncate px-6 py-4 font-mono text-xs text-gray-900 dark:text-white" :title="spin.roundId">
                      {{ spin.roundId }}
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-gray-900 dark:text-white">{{ channelName(spin.channelCode) }}</div>
                      <div class="text-xs text-gray-500">{{ gameName(spin.gameCode) }}</div>
                    </td>
                    <td class="px-6 py-4 text-gray-700 dark:text-gray-300">{{ spin.playerId }}</td>
                    <td class="px-6 py-4">
                      <StatusBadge :status="statusVariant(spin.status)" :label="statusLabel(spin.status)" />
                    </td>
                    <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(spin.stakeCents, spin.currency) }}</td>
                    <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(spin.winCents, spin.currency) }}</td>
                    <td class="px-6 py-4 text-right font-mono" :class="spin.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatGameMoney(spin.netCents, spin.currency) }}
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-500">{{ formatDate(spin.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <aside class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">记录详情</h2>
            <div v-if="selectedSpin" class="mt-5 space-y-4">
              <DetailRow label="局 ID" :value="selectedSpin.roundId" mono />
              <DetailRow label="渠道" :value="`${channelName(selectedSpin.channelCode)} / ${selectedSpin.channelCode}`" />
              <DetailRow label="游戏" :value="`${gameName(selectedSpin.gameCode)} / ${selectedSpin.gameCode}`" />
              <DetailRow label="玩家" :value="selectedSpin.playerId" />
              <DetailRow label="币种" :value="selectedSpin.currency" />
              <DetailRow label="场景" :value="selectedSpin.scenarioId" />
              <DetailRow label="下注" :value="formatGameMoney(selectedSpin.stakeCents, selectedSpin.currency)" />
              <DetailRow label="派彩" :value="formatGameMoney(selectedSpin.winCents, selectedSpin.currency)" />
              <DetailRow label="平台净额" :value="formatGameMoney(selectedSpin.netCents, selectedSpin.currency)" />
              <DetailRow label="时间" :value="formatDate(selectedSpin.createdAt)" />
            </div>
            <div v-else class="mt-5 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
              选择一条 Spin 记录查看详情
            </div>
          </aside>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import {
  formatGameMoney,
  loadGameAdminSnapshot,
  statusLabel,
  statusVariant,
  type GameAdminSnapshot,
  type SpinRecordOverview,
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
const channelFilter = ref('')
const gameFilter = ref('')
const statusFilter = ref('')
const selectedSpin = ref<SpinRecordOverview | null>(null)

const DetailRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    mono: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl bg-gray-50 p-3 dark:bg-dark-900/60' }, [
      h('div', { class: 'text-xs text-gray-500 dark:text-gray-400' }, props.label),
      h('div', {
        class: ['mt-1 break-words text-sm font-medium text-gray-900 dark:text-white', props.mono ? 'font-mono text-xs' : ''],
      }, props.value),
    ])
  },
})

const filteredSpins = computed(() => {
  const query = keyword.value.toLowerCase()
  return (snapshot.value?.spins ?? []).filter((spin) => {
    const matchesKeyword = !query ||
      spin.roundId.toLowerCase().includes(query) ||
      spin.playerId.toLowerCase().includes(query) ||
      spin.channelCode.toLowerCase().includes(query) ||
      spin.gameCode.toLowerCase().includes(query)
    const matchesChannel = !channelFilter.value || spin.channelCode === channelFilter.value
    const matchesGame = !gameFilter.value || spin.gameCode === gameFilter.value
    const matchesStatus = !statusFilter.value || spin.status === statusFilter.value
    return matchesKeyword && matchesChannel && matchesGame && matchesStatus
  })
})

const totalBetCents = computed(() => filteredSpins.value.reduce((sum, spin) => sum + spin.stakeCents, 0))
const totalWinCents = computed(() => filteredSpins.value.reduce((sum, spin) => sum + spin.winCents, 0))
const totalNetCents = computed(() => filteredSpins.value.reduce((sum, spin) => sum + spin.netCents, 0))

function channelName(code: string): string {
  return snapshot.value?.channels.find(channel => channel.code === code)?.name ?? code
}

function gameName(code: string): string {
  return snapshot.value?.games.find(game => game.code === code)?.name ?? code
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  try {
    snapshot.value = await loadGameAdminSnapshot()
    selectedSpin.value = snapshot.value.spins[0] ?? null
  } catch (error) {
    console.error(error)
    appStore.showError('Spin 记录加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
