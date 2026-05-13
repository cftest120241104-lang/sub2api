<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">玩家 / 会话概览</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              按渠道和游戏查看玩家余额、会话状态、投注派彩和最近活跃时间。
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
          <MetricCard title="玩家数" :value="snapshot.totals.players" icon="users" hint="最近活跃玩家" />
          <MetricCard title="活跃会话" :value="snapshot.totals.activeSessions" icon="bolt" tone="success" hint="当前在线" />
          <MetricCard title="玩家余额" :value="formatGameMoney(totalBalanceCents)" icon="dollar" tone="warning" hint="按当前列表汇总" />
          <MetricCard title="平台净额" :value="formatGameMoney(snapshot.totals.netCents)" icon="calculator" :tone="snapshot.totals.netCents >= 0 ? 'success' : 'danger'" hint="投注 - 派彩" />
        </section>

        <section class="card p-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <div class="relative">
              <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model.trim="keyword" class="input pl-9" placeholder="搜索玩家、渠道或游戏" />
            </div>
            <select v-model="channelFilter" class="input">
              <option value="">全部渠道</option>
              <option v-for="channel in snapshot.channels" :key="channel.code" :value="channel.code">{{ channel.name }}</option>
            </select>
            <select v-model="gameFilter" class="input">
              <option value="">全部游戏</option>
              <option v-for="game in snapshot.games" :key="game.code" :value="game.code">{{ game.name }}</option>
            </select>
            <select v-model="sessionFilter" class="input">
              <option value="">全部会话</option>
              <option value="active">仅活跃</option>
              <option value="inactive">仅离线</option>
            </select>
          </div>
        </section>

        <section class="card overflow-hidden">
          <div class="card-header flex items-center justify-between">
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">玩家列表</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">当前筛选 {{ filteredPlayers.length }} 名玩家。</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
                <tr>
                  <th class="px-6 py-3">玩家</th>
                  <th class="px-6 py-3">渠道 / 游戏</th>
                  <th class="px-6 py-3">会话</th>
                  <th class="px-6 py-3 text-right">余额</th>
                  <th class="px-6 py-3 text-right">局数</th>
                  <th class="px-6 py-3 text-right">投注</th>
                  <th class="px-6 py-3 text-right">派彩</th>
                  <th class="px-6 py-3 text-right">净额</th>
                  <th class="px-6 py-3">最近活跃</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                <tr v-for="player in filteredPlayers" :key="`${player.channelCode}:${player.gameCode}:${player.playerId}:${player.currency}`">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900 dark:text-white">{{ player.playerId }}</div>
                    <div class="text-xs text-gray-500">{{ player.currency }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-gray-900 dark:text-white">{{ channelName(player.channelCode) }}</div>
                    <div class="text-xs text-gray-500">{{ gameName(player.gameCode) }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <StatusBadge :status="player.activeSession ? 'success' : 'inactive'" :label="player.activeSession ? '在线' : '离线'" />
                    <div v-if="player.sessionExpiresAt" class="mt-1 text-xs text-gray-500">
                      到期 {{ formatDate(player.sessionExpiresAt) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(player.balanceCents, player.currency) }}</td>
                  <td class="px-6 py-4 text-right">{{ player.rounds }}</td>
                  <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(player.totalBetCents, player.currency) }}</td>
                  <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(player.totalWinCents, player.currency) }}</td>
                  <td class="px-6 py-4 text-right font-mono" :class="player.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                    {{ formatGameMoney(player.netCents, player.currency) }}
                  </td>
                  <td class="px-6 py-4 text-xs text-gray-500">{{ formatDate(player.lastSeenAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  formatGameMoney,
  loadGameAdminSnapshot,
  type GameAdminSnapshot,
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
const sessionFilter = ref<'active' | 'inactive' | ''>('')

const filteredPlayers = computed(() => {
  const query = keyword.value.toLowerCase()
  return (snapshot.value?.players ?? []).filter((player) => {
    const matchesKeyword = !query ||
      player.playerId.toLowerCase().includes(query) ||
      player.channelCode.toLowerCase().includes(query) ||
      player.gameCode.toLowerCase().includes(query)
    const matchesChannel = !channelFilter.value || player.channelCode === channelFilter.value
    const matchesGame = !gameFilter.value || player.gameCode === gameFilter.value
    const matchesSession = !sessionFilter.value ||
      (sessionFilter.value === 'active' ? player.activeSession : !player.activeSession)
    return matchesKeyword && matchesChannel && matchesGame && matchesSession
  })
})

const totalBalanceCents = computed(() => {
  return filteredPlayers.value.reduce((sum, player) => sum + player.balanceCents, 0)
})

function channelName(code: string): string {
  return snapshot.value?.channels.find(channel => channel.code === code)?.name ?? code
}

function gameName(code: string): string {
  return snapshot.value?.games.find(game => game.code === code)?.name ?? code
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
    appStore.showError('玩家会话数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
