<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">游戏运营仪表盘</h1>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="snapshot?.service.usingMock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
              >
                {{ snapshot?.service.usingMock ? 'Mock 数据' : '实时数据' }}
              </span>
            </div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              聚合多渠道、多游戏的投注、派彩、玩家会话和渠道游戏配置状态。
            </p>
            <p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              {{ snapshot?.service.baseUrl || gameServiceAPI.baseUrl }}
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
            <Icon name="refresh" size="sm" />
            {{ loading ? '刷新中' : '刷新' }}
          </button>
        </div>

        <div v-if="snapshot" class="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-dark-700 dark:bg-dark-900/60 dark:text-gray-300">
          {{ snapshot.service.message }}
        </div>
      </section>

      <div v-if="loading && !snapshot" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="snapshot">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="渠道数" :value="snapshot.totals.channels" icon="globe" tone="primary" hint="运营渠道总数" />
          <MetricCard title="游戏数" :value="snapshot.totals.games" icon="grid" tone="success" hint="游戏目录总数" />
          <MetricCard title="启用配置" :value="snapshot.totals.enabledChannelGames" icon="badge" tone="warning" hint="渠道 × 游戏启用项" />
          <MetricCard title="活跃会话" :value="snapshot.totals.activeSessions" icon="users" tone="danger" hint="当前在线玩家会话" />
        </section>

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Spin 局数" :value="formatGameNumber(snapshot.totals.spins)" icon="play" tone="primary" hint="最近局记录" />
          <MetricCard title="总下注" :value="formatGameMoney(snapshot.totals.totalBetCents)" icon="dollar" tone="warning" hint="stake 汇总" />
          <MetricCard title="总派彩" :value="formatGameMoney(snapshot.totals.totalWinCents)" icon="gift" tone="success" hint="win 汇总" />
          <MetricCard title="平台净额" :value="formatGameMoney(snapshot.totals.netCents)" icon="calculator" :tone="snapshot.totals.netCents >= 0 ? 'success' : 'danger'" hint="下注 - 派彩" />
        </section>

        <section class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div class="card overflow-hidden">
            <div class="card-header flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">渠道经营概览</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">按渠道汇总启用游戏、活跃玩家、下注和净额。</p>
              </div>
              <RouterLink class="btn btn-secondary btn-sm" to="/admin/channels">渠道管理</RouterLink>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
                  <tr>
                    <th class="px-6 py-3">渠道</th>
                    <th class="px-6 py-3">状态</th>
                    <th class="px-6 py-3 text-right">启用游戏</th>
                    <th class="px-6 py-3 text-right">活跃玩家</th>
                    <th class="px-6 py-3 text-right">总下注</th>
                    <th class="px-6 py-3 text-right">净额</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                  <tr v-for="item in snapshot.channelMetrics" :key="item.channelCode">
                    <td class="px-6 py-4">
                      <div class="font-medium text-gray-900 dark:text-white">{{ item.channelName }}</div>
                      <div class="font-mono text-xs text-gray-500">{{ item.channelCode }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <StatusBadge :status="statusVariant(item.status)" :label="statusLabel(item.status)" />
                    </td>
                    <td class="px-6 py-4 text-right">{{ item.enabledGames }}</td>
                    <td class="px-6 py-4 text-right">{{ item.activePlayers }}</td>
                    <td class="px-6 py-4 text-right font-mono">{{ formatGameMoney(item.totalBetCents) }}</td>
                    <td class="px-6 py-4 text-right font-mono" :class="item.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatGameMoney(item.netCents) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">服务状态</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">后台与游戏服务的连接状态。</p>
              </div>
              <Icon name="server" size="lg" class="text-primary-500" />
            </div>
            <div class="mt-5 space-y-4">
              <div class="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <span class="text-sm text-gray-500 dark:text-gray-400">Health</span>
                <StatusBadge :status="snapshot.service.healthOk ? 'success' : 'error'" :label="snapshot.service.healthOk ? 'OK' : 'ERR'" />
              </div>
              <div class="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <span class="text-sm text-gray-500 dark:text-gray-400">Ready</span>
                <StatusBadge :status="snapshot.service.readyOk ? 'success' : 'warning'" :label="snapshot.service.readyOk ? 'READY' : '降级'" />
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <div class="text-sm text-gray-500 dark:text-gray-400">最后生成</div>
                <div class="mt-2 font-mono text-sm text-gray-900 dark:text-white">{{ formatDate(snapshot.generatedAt) }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-2">
          <div class="card overflow-hidden">
            <div class="card-header flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">热门游戏</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">按局数和渠道启用情况排序。</p>
              </div>
              <RouterLink class="btn btn-secondary btn-sm" to="/admin/games">游戏管理</RouterLink>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-dark-700">
              <div v-for="game in topGames" :key="game.gameCode" class="flex items-center justify-between gap-4 px-6 py-4">
                <div class="min-w-0">
                  <div class="truncate font-medium text-gray-900 dark:text-white">{{ game.gameName }}</div>
                  <div class="font-mono text-xs text-gray-500">{{ game.gameCode }} · RTP {{ game.rtp }}%</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ game.rounds }} 局</div>
                  <div class="text-xs text-gray-500">{{ game.enabledChannels }} 个渠道</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card overflow-hidden">
            <div class="card-header flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">最近 Spin</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">最近局记录和输赢结果。</p>
              </div>
              <RouterLink class="btn btn-secondary btn-sm" to="/admin/spins">Spin 记录</RouterLink>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-dark-700">
              <div v-for="spin in snapshot.spins.slice(0, 6)" :key="spin.roundId" class="flex items-center justify-between gap-4 px-6 py-4">
                <div class="min-w-0">
                  <div class="truncate font-mono text-xs text-gray-900 dark:text-white">{{ spin.roundId }}</div>
                  <div class="mt-1 text-xs text-gray-500">{{ spin.channelCode }} / {{ spin.gameCode }} / {{ spin.playerId }}</div>
                </div>
                <div class="text-right">
                  <StatusBadge :status="statusVariant(spin.status)" :label="statusLabel(spin.status)" />
                  <div class="mt-1 font-mono text-xs" :class="spin.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                    {{ formatGameMoney(spin.netCents, spin.currency) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import gameServiceAPI from '@/api/gameService'
import {
  formatGameMoney,
  formatGameNumber,
  loadGameAdminSnapshot,
  statusLabel,
  statusVariant,
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

const topGames = computed(() => {
  return [...(snapshot.value?.gameMetrics ?? [])]
    .sort((a, b) => b.rounds - a.rounds || b.enabledChannels - a.enabledChannels)
    .slice(0, 6)
})

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  try {
    snapshot.value = await loadGameAdminSnapshot()
  } catch (error) {
    console.error(error)
    appStore.showError('游戏运营仪表盘加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
