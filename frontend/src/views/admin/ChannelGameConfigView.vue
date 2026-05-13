<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">渠道游戏配置</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              针对每个渠道绑定游戏，配置状态、分成、RTP、投注范围和功能开关。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
              <Icon name="refresh" size="sm" />
              {{ loading ? '刷新中' : '刷新' }}
            </button>
          </div>
        </div>
      </section>

      <div v-if="loading && !snapshot" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="snapshot">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="配置项" :value="snapshot.configs.length" icon="swap" hint="渠道 × 游戏" />
          <MetricCard title="已启用" :value="enabledConfigCount" icon="checkCircle" tone="success" hint="可对玩家开放" />
          <MetricCard title="灰度测试" :value="testingConfigCount" icon="beaker" tone="warning" hint="仅测试渠道" />
          <MetricCard title="维护/停用" :value="disabledConfigCount" icon="ban" tone="danger" hint="不可进入游戏" />
        </section>

        <section class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div class="space-y-4">
            <div class="card p-5">
              <label class="input-label">渠道</label>
              <select v-model="selectedChannelCode" class="input">
                <option v-for="channel in snapshot.channels" :key="channel.code" :value="channel.code">
                  {{ channel.name }} / {{ channel.code }}
                </option>
              </select>

              <label class="input-label mt-4">游戏</label>
              <select v-model="selectedGameCode" class="input">
                <option v-for="game in snapshot.games" :key="game.code" :value="game.code">
                  {{ game.name }} / {{ game.code }}
                </option>
              </select>

              <div v-if="selectedChannel && selectedGame" class="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <div class="text-xs text-gray-500 dark:text-gray-400">当前绑定</div>
                <div class="mt-2 font-medium text-gray-900 dark:text-white">
                  {{ selectedChannel.name }}
                </div>
                <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ selectedGame.name }}
                </div>
              </div>
            </div>

            <div class="card p-5">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">渠道默认值</h2>
              <dl v-if="selectedChannel" class="mt-4 space-y-3 text-sm">
                <InfoRow label="状态" :value="statusLabel(selectedChannel.status)" />
                <InfoRow label="分成" :value="`${selectedChannel.sharePercent}%`" />
                <InfoRow label="币种" :value="selectedChannel.currency" />
                <InfoRow label="投注范围" :value="`${formatGameMoney(selectedChannel.minBetCents, selectedChannel.currency)} - ${formatGameMoney(selectedChannel.maxBetCents, selectedChannel.currency)}`" />
              </dl>
            </div>
          </div>

          <div class="space-y-6">
            <section v-if="editableConfig && selectedChannel && selectedGame" class="card p-6">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 class="text-base font-semibold text-gray-900 dark:text-white">配置详情</h2>
                  <p class="mt-1 font-mono text-xs text-gray-500">{{ editableConfig.id }}</p>
                </div>
                <StatusBadge :status="statusVariant(editableConfig.status)" :label="statusLabel(editableConfig.status)" />
              </div>

              <div class="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <label class="input-label">状态</label>
                  <select v-model="editableConfig.status" class="input">
                    <option value="enabled">已启用</option>
                    <option value="testing">灰度测试</option>
                    <option value="maintenance">维护中</option>
                    <option value="disabled">已停用</option>
                  </select>
                </div>
                <div>
                  <label class="input-label">渠道分成 (%)</label>
                  <input v-model.number="editableConfig.sharePercent" type="number" min="0" max="100" class="input" />
                </div>
                <div>
                  <label class="input-label">RTP (%)</label>
                  <input v-model.number="editableConfig.rtp" type="number" min="80" max="100" step="0.01" class="input" />
                </div>
                <div>
                  <label class="input-label">Launch Path</label>
                  <input v-model.trim="editableConfig.launchPath" class="input font-mono text-xs" />
                </div>
                <div>
                  <label class="input-label">最小下注</label>
                  <input v-model.number="editableConfig.minBetCents" type="number" min="0" class="input" />
                  <p class="input-hint">{{ formatGameMoney(editableConfig.minBetCents, selectedChannel.currency) }}</p>
                </div>
                <div>
                  <label class="input-label">最大下注</label>
                  <input v-model.number="editableConfig.maxBetCents" type="number" min="0" class="input" />
                  <p class="input-hint">{{ formatGameMoney(editableConfig.maxBetCents, selectedChannel.currency) }}</p>
                </div>
              </div>

              <div class="mt-5 grid gap-4 lg:grid-cols-2">
                <label class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                  <span>
                    <span class="block text-sm font-medium text-gray-900 dark:text-white">Jackpot</span>
                    <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">是否允许奖池类功能</span>
                  </span>
                  <input v-model="editableConfig.jackpotEnabled" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </label>

                <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                  <label class="input-label">功能开关</label>
                  <input v-model.trim="featureFlagsText" class="input" placeholder="baseSpin, freeSpin" />
                  <p class="input-hint">多个开关用逗号分隔。</p>
                </div>
              </div>

              <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  更新时间：{{ formatDate(editableConfig.updatedAt) }}
                </div>
                <button type="button" class="btn btn-primary" :disabled="saving || !isConfigValid" @click="saveConfig">
                  <Icon name="check" size="sm" />
                  {{ saving ? '保存中' : '保存配置' }}
                </button>
              </div>
            </section>

            <section class="card overflow-hidden">
              <div class="card-header">
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">配置矩阵</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">每行是一个渠道游戏绑定。</p>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
                    <tr>
                      <th class="px-6 py-3">渠道</th>
                      <th class="px-6 py-3">游戏</th>
                      <th class="px-6 py-3">状态</th>
                      <th class="px-6 py-3 text-right">分成</th>
                      <th class="px-6 py-3 text-right">RTP</th>
                      <th class="px-6 py-3 text-right">下注范围</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                    <tr
                      v-for="config in filteredConfigs"
                      :key="config.id"
                      class="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-dark-900/60"
                      :class="config.id === editableConfig?.id ? 'bg-primary-50/70 dark:bg-primary-900/20' : ''"
                      @click="selectConfig(config.channelCode, config.gameCode)"
                    >
                      <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">{{ channelName(config.channelCode) }}</div>
                        <div class="font-mono text-xs text-gray-500">{{ config.channelCode }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">{{ gameName(config.gameCode) }}</div>
                        <div class="font-mono text-xs text-gray-500">{{ config.gameCode }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <StatusBadge :status="statusVariant(config.status)" :label="statusLabel(config.status)" />
                      </td>
                      <td class="px-6 py-4 text-right">{{ config.sharePercent }}%</td>
                      <td class="px-6 py-4 text-right">{{ config.rtp }}%</td>
                      <td class="px-6 py-4 text-right font-mono">
                        {{ formatGameMoney(config.minBetCents, channelCurrency(config.channelCode)) }} - {{ formatGameMoney(config.maxBetCents, channelCurrency(config.channelCode)) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  formatGameMoney,
  loadGameAdminSnapshot,
  saveChannelGameConfig,
  statusLabel,
  statusVariant,
  type ChannelGameConfig,
  type GameAdminSnapshot,
} from '@/api/gameAdmin'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const loading = ref(false)
const saving = ref(false)
const snapshot = ref<GameAdminSnapshot | null>(null)
const selectedChannelCode = ref('')
const selectedGameCode = ref('')
const editableConfig = ref<ChannelGameConfig | null>(null)
const featureFlagsText = ref('')

const InfoRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'flex items-center justify-between gap-3' }, [
      h('dt', { class: 'text-gray-500 dark:text-gray-400' }, props.label),
      h('dd', { class: 'truncate font-medium text-gray-900 dark:text-white', title: props.value }, props.value),
    ])
  },
})

const selectedChannel = computed(() => snapshot.value?.channels.find(channel => channel.code === selectedChannelCode.value))
const selectedGame = computed(() => snapshot.value?.games.find(game => game.code === selectedGameCode.value))

const enabledConfigCount = computed(() => snapshot.value?.configs.filter(config => config.status === 'enabled').length ?? 0)
const testingConfigCount = computed(() => snapshot.value?.configs.filter(config => config.status === 'testing').length ?? 0)
const disabledConfigCount = computed(() => snapshot.value?.configs.filter(config => config.status === 'disabled' || config.status === 'maintenance').length ?? 0)

const filteredConfigs = computed(() => {
  return (snapshot.value?.configs ?? []).filter((config) => {
    const matchesChannel = !selectedChannelCode.value || config.channelCode === selectedChannelCode.value
    const matchesGame = !selectedGameCode.value || config.gameCode === selectedGameCode.value
    return matchesChannel || matchesGame
  })
})

const isConfigValid = computed(() => {
  if (!editableConfig.value) return false
  return editableConfig.value.minBetCents >= 0 &&
    editableConfig.value.maxBetCents >= editableConfig.value.minBetCents &&
    editableConfig.value.sharePercent >= 0 &&
    editableConfig.value.sharePercent <= 100 &&
    editableConfig.value.rtp >= 80 &&
    editableConfig.value.rtp <= 100
})

watch([selectedChannelCode, selectedGameCode, snapshot], syncEditableConfig)

watch(featureFlagsText, (value) => {
  if (!editableConfig.value) return
  editableConfig.value.featureFlags = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
})

function selectDefaults() {
  if (!snapshot.value) return
  selectedChannelCode.value = String(route.query.channel || snapshot.value.channels[0]?.code || '')
  selectedGameCode.value = String(route.query.game || snapshot.value.games[0]?.code || '')
}

function syncEditableConfig() {
  const config = snapshot.value?.configs.find(item =>
    item.channelCode === selectedChannelCode.value && item.gameCode === selectedGameCode.value
  )
  editableConfig.value = config ? { ...config, featureFlags: [...config.featureFlags] } : null
  featureFlagsText.value = editableConfig.value?.featureFlags.join(', ') ?? ''
}

function selectConfig(channelCode: string, gameCode: string) {
  selectedChannelCode.value = channelCode
  selectedGameCode.value = gameCode
  void router.replace({
    path: '/admin/channel-games',
    query: { channel: channelCode, game: gameCode },
  })
}

function channelName(code: string): string {
  return snapshot.value?.channels.find(channel => channel.code === code)?.name ?? code
}

function channelCurrency(code: string): string {
  return snapshot.value?.channels.find(channel => channel.code === code)?.currency ?? 'USD'
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
    selectDefaults()
    syncEditableConfig()
  } catch (error) {
    console.error(error)
    appStore.showError('渠道游戏配置加载失败')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!editableConfig.value || !isConfigValid.value) return
  saving.value = true
  try {
    await saveChannelGameConfig(editableConfig.value)
    snapshot.value = await loadGameAdminSnapshot()
    syncEditableConfig()
    appStore.showSuccess('渠道游戏配置已保存')
  } catch (error) {
    console.error(error)
    appStore.showError('渠道游戏配置保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
