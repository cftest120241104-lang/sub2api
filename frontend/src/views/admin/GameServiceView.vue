<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
              游戏运营中心
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              覆盖游戏服务健康、玩家、注单、钱包流水、GM 调试、审计日志、报表导出和第二阶段模块契约。
            </p>
            <p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              {{ gameServiceAPI.baseUrl }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingStatus || loadingOps" @click="reloadAll">
              <Icon name="refresh" size="sm" />
              {{ loadingStatus || loadingOps ? t('common.loading') : t('common.refresh') }}
            </button>
            <button type="button" class="btn btn-primary btn-sm" :disabled="exporting || !opsSummary" @click="downloadOpsCsv">
              <Icon name="download" size="sm" />
              {{ exporting ? t('common.loading') : '导出 CSV' }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">服务健康</span>
              <StatusBadge :status="health?.ok ? 'success' : 'error'" :label="health?.ok ? 'OK' : 'ERR'" />
            </div>
            <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">
              {{ health?.service || t('common.notAvailable') }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(health?.time) }}</p>
          </div>

          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">就绪状态</span>
              <StatusBadge :status="ready?.ok ? 'success' : 'error'" :label="ready?.ok ? 'READY' : 'DOWN'" />
            </div>
            <div class="mt-3 space-y-2 text-xs">
              <div v-for="item in readyChecks" :key="item.name" class="flex items-center justify-between gap-3">
                <span class="text-gray-600 dark:text-gray-300">{{ item.name }}</span>
                <span :class="item.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ item.ok ? 'OK' : item.error || 'ERR' }}
                </span>
              </div>
              <p v-if="readyChecks.length === 0" class="text-gray-500 dark:text-gray-400">
                {{ t('common.noData') }}
              </p>
            </div>
          </div>

          <MetricCard label="活跃会话" :value="opsSummary?.totals.activeSessions ?? 0" hint="当前未过期 token" />
          <MetricCard label="平台净额" :value="formatMoney(opsSummary?.totals.netCents ?? 0)" hint="下注减派彩" />
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="游戏数" :value="opsSummary?.totals.games ?? 0" hint="已注册 gameCode" />
        <MetricCard label="玩家数" :value="opsSummary?.totals.players ?? 0" hint="按渠道/币种去重" />
        <MetricCard label="注单数" :value="opsSummary?.totals.rounds ?? 0" hint="rounds 表" />
        <MetricCard label="总下注" :value="formatMoney(opsSummary?.totals.totalBetCents ?? 0)" hint="stake 累计" />
        <MetricCard label="总派彩" :value="formatMoney(opsSummary?.totals.totalWinCents ?? 0)" hint="win 累计" />
        <MetricCard label="审计事件" :value="opsSummary?.totals.auditEvents ?? 0" hint="最近 100 条" />
      </section>

      <section class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div class="space-y-6">
          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">测试会话</h2>
            <div class="mt-4 space-y-4">
              <div>
                <label class="input-label">渠道代码</label>
                <input v-model.trim="sessionForm.channelCode" class="input" />
              </div>
              <div>
                <label class="input-label">游戏代码</label>
                <input v-model.trim="sessionForm.gameCode" class="input" />
              </div>
              <div>
                <label class="input-label">玩家 ID</label>
                <input v-model.trim="sessionForm.playerId" class="input" />
              </div>
              <div>
                <label class="input-label">币种</label>
                <input v-model.trim="sessionForm.currency" class="input" />
              </div>
              <button type="button" class="btn btn-primary w-full" :disabled="creatingSession" @click="startSession">
                <Icon name="play" size="sm" />
                {{ creatingSession ? t('common.loading') : '创建并初始化' }}
              </button>
            </div>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">当前测试会话</h2>
            <p class="mt-3 truncate font-mono text-xs text-gray-900 dark:text-white">
              {{ session?.token || '尚未创建会话' }}
            </p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {{ session ? `${session.playerId} / ${session.currency} / ${session.gameCode}` : '创建会话后可切换 GM 场景并发起协议动作' }}
            </p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">GM 场景</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ scenarioState?.current ? `当前场景：${scenarioState.current}` : '创建测试会话后加载场景' }}
                </p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || loadingScenario" @click="loadScenario">
                <Icon name="sync" size="sm" />
                {{ loadingScenario ? t('common.loading') : '加载场景' }}
              </button>
            </div>

            <div v-if="scenarioState" class="mt-5 grid gap-3 md:grid-cols-2">
              <button
                v-for="scenario in scenarioState.scenarios"
                :key="scenario.id"
                type="button"
                class="rounded-xl border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50/60 dark:hover:bg-primary-900/20"
                :class="scenario.id === scenarioState.current ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30' : 'border-gray-100 bg-white dark:border-dark-700 dark:bg-dark-900/50'"
                :disabled="settingScenario === scenario.id"
                @click="chooseScenario(scenario.id)"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="font-medium text-gray-900 dark:text-white">{{ scenario.label }}</span>
                  <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ scenario.id }}</span>
                </div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ scenario.description }}</p>
              </button>
            </div>
            <EmptyState v-else text="暂无 GM 场景数据" />
          </div>

          <div class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">协议测试</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">执行 doInit / doSpin / doCollect 并回写注单、钱包与审计。</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || protocolLoading" @click="runInit">doInit</button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="!session || protocolLoading" @click="runSpin">doSpin</button>
                <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || protocolLoading" @click="runCollect">doCollect</button>
              </div>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label class="input-label">单注金额</label>
                <input v-model.trim="spinForm.coin" class="input" />
              </div>
              <div>
                <label class="input-label">线数</label>
                <input v-model.number="spinForm.lines" type="number" min="1" class="input" />
              </div>
              <div>
                <label class="input-label">局 ID</label>
                <div class="flex gap-2">
                  <input v-model.trim="spinForm.roundId" class="input font-mono text-xs" />
                  <button type="button" class="btn btn-secondary btn-icon" title="重新生成局 ID" @click="resetRoundId">
                    <Icon name="refresh" size="sm" />
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-xl border border-gray-100 bg-gray-950 p-4 dark:border-dark-700">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-medium uppercase text-gray-400">最近协议响应</span>
                <LoadingSpinner v-if="protocolLoading" size="sm" color="white" />
              </div>
              <pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-100">{{ protocolOutput }}</pre>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 2xl:grid-cols-2">
        <DataTable title="玩家概览" :loading="loadingOps" :empty="!opsSummary?.topPlayers.length">
          <template #default>
            <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">玩家</th>
                <th class="px-4 py-3">游戏</th>
                <th class="px-4 py-3 text-right">余额</th>
                <th class="px-4 py-3 text-right">局数</th>
                <th class="px-4 py-3 text-right">平台净额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm dark:divide-dark-700">
              <tr v-for="player in opsSummary?.topPlayers" :key="`${player.channelCode}:${player.playerId}:${player.currency}`">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900 dark:text-white">{{ player.playerId }}</div>
                  <div class="text-xs text-gray-500">{{ player.channelCode }} / {{ player.currency }}</div>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ player.gameCode || '-' }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(player.balanceCents) }}</td>
                <td class="px-4 py-3 text-right">{{ player.rounds }}</td>
                <td class="px-4 py-3 text-right font-mono" :class="player.netCents >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatMoney(player.netCents) }}</td>
              </tr>
            </tbody>
          </template>
        </DataTable>

        <DataTable title="最近注单" :loading="loadingOps" :empty="!opsSummary?.recentRounds.length">
          <template #default>
            <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">局 ID</th>
                <th class="px-4 py-3">玩家</th>
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3 text-right">下注</th>
                <th class="px-4 py-3 text-right">派彩</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm dark:divide-dark-700">
              <tr v-for="round in opsSummary?.recentRounds" :key="round.roundId">
                <td class="max-w-[180px] truncate px-4 py-3 font-mono text-xs" :title="round.roundId">{{ round.roundId }}</td>
                <td class="px-4 py-3">
                  <div class="text-gray-900 dark:text-white">{{ round.playerId }}</div>
                  <div class="text-xs text-gray-500">{{ round.gameCode }} / {{ round.scenarioId }}</div>
                </td>
                <td class="px-4 py-3"><StatusBadge :status="round.status === 'FAILED' ? 'error' : 'success'" :label="round.status" /></td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(round.stakeCents) }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(round.winCents) }}</td>
              </tr>
            </tbody>
          </template>
        </DataTable>

        <DataTable title="钱包流水" :loading="loadingOps" :empty="!opsSummary?.recentTransactions.length">
          <template #default>
            <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">交易</th>
                <th class="px-4 py-3">玩家</th>
                <th class="px-4 py-3">类型</th>
                <th class="px-4 py-3 text-right">金额</th>
                <th class="px-4 py-3 text-right">余额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm dark:divide-dark-700">
              <tr v-for="tx in opsSummary?.recentTransactions" :key="`${tx.channelCode}:${tx.txId}`">
                <td class="max-w-[180px] truncate px-4 py-3 font-mono text-xs" :title="tx.txId">{{ tx.txId }}</td>
                <td class="px-4 py-3">{{ tx.playerId }}</td>
                <td class="px-4 py-3"><StatusBadge :status="tx.type === 'DEBIT' ? 'warning' : 'success'" :label="tx.type" /></td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(tx.amountCents) }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(tx.balanceAfterCents) }}</td>
              </tr>
            </tbody>
          </template>
        </DataTable>

        <DataTable title="审计日志" :loading="loadingOps" :empty="!opsSummary?.recentAuditEvents.length">
          <template #default>
            <thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-dark-900 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">事件</th>
                <th class="px-4 py-3">范围</th>
                <th class="px-4 py-3">时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm dark:divide-dark-700">
              <tr v-for="event in opsSummary?.recentAuditEvents" :key="`${event.id || event.createdAt}:${event.eventType}`">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900 dark:text-white">{{ event.eventType }}</div>
                  <div class="max-w-[360px] truncate font-mono text-xs text-gray-500">{{ JSON.stringify(event.payload) }}</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ event.channelCode || '-' }} / {{ event.gameCode || '-' }} / {{ event.playerId || '-' }}</td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ formatDate(event.createdAt) }}</td>
              </tr>
            </tbody>
          </template>
        </DataTable>
      </section>

      <section class="card p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">第二阶段入口</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              这些模块已在后台展示验收契约，后续按接口契约逐项实现真实配置与处置流程。
            </p>
          </div>
        </div>
        <div class="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="module in opsSummary?.secondStage"
            :key="module.key"
            class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white">{{ module.title }}</h3>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ module.description }}</p>
              </div>
              <StatusBadge :status="module.status === 'planned' ? 'warning' : 'success'" :label="module.status" />
            </div>
            <div class="mt-4">
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400">接口契约</div>
              <div class="mt-2 space-y-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                <button
                  v-for="endpoint in module.endpoints"
                  :key="endpoint"
                  type="button"
                  class="block rounded px-1 py-0.5 text-left transition hover:bg-white hover:text-primary-600 dark:hover:bg-dark-800"
                  @click="loadSecondStageContract(endpoint)"
                >
                  {{ endpoint }}
                </button>
              </div>
            </div>
            <ul class="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <li v-for="item in module.acceptance" :key="item">- {{ item }}</li>
            </ul>
          </div>
        </div>
        <div v-if="secondStageContract" class="mt-5 rounded-xl border border-gray-100 bg-gray-950 p-4 dark:border-dark-700">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-medium uppercase text-gray-400">
              {{ secondStageContract.module.title }} / {{ secondStageContract.status }}
            </span>
            <LoadingSpinner v-if="loadingSecondStage" size="sm" color="white" />
          </div>
          <pre class="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-gray-100">{{ JSON.stringify(secondStageContract, null, 2) }}</pre>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import gameServiceAPI, {
  type GameHealth,
  type GameOpsSummary,
  type GameReady,
  type GameSession,
  type GmScenarioState,
  type ProtocolPayload,
  type SecondStageContract,
} from '@/api/gameService'

const { t } = useI18n()
const appStore = useAppStore()

const loadingStatus = ref(false)
const loadingOps = ref(false)
const exporting = ref(false)
const creatingSession = ref(false)
const loadingScenario = ref(false)
const settingScenario = ref<string | null>(null)
const protocolLoading = ref(false)

const health = ref<GameHealth | null>(null)
const ready = ref<GameReady | null>(null)
const opsSummary = ref<GameOpsSummary | null>(null)
const session = ref<GameSession | null>(null)
const scenarioState = ref<GmScenarioState | null>(null)
const lastProtocol = ref<ProtocolPayload | null>(null)
const secondStageContract = ref<SecondStageContract | null>(null)
const loadingSecondStage = ref(false)

const sessionForm = reactive({
  channelCode: 'demo',
  gameCode: 'vs10jokerhot',
  playerId: `admin-test-${Date.now()}`,
  currency: 'USD',
})

const spinForm = reactive({
  coin: '1.00',
  lines: 20,
  roundId: createRoundId(),
})

const readyChecks = computed(() => {
  if (!ready.value?.checks) return []
  return Object.entries(ready.value.checks).map(([name, check]) => ({ name, ...check }))
})

const protocolOutput = computed(() => {
  return lastProtocol.value ? JSON.stringify(lastProtocol.value, null, 2) : '暂无协议响应'
})

const MetricCard = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    hint: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/60' }, [
      h('div', { class: 'text-sm text-gray-500 dark:text-gray-400' }, props.label),
      h('div', { class: 'mt-2 truncate text-2xl font-semibold text-gray-900 dark:text-white' }, String(props.value)),
      h('div', { class: 'mt-1 text-xs text-gray-500 dark:text-gray-400' }, props.hint),
    ])
  },
})

const EmptyState = defineComponent({
  props: {
    text: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'mt-5 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400' }, props.text)
  },
})

const DataTable = defineComponent({
  props: {
    title: { type: String, required: true },
    loading: { type: Boolean, default: false },
    empty: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'card overflow-hidden' }, [
      h('div', { class: 'flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700' }, [
        h('h2', { class: 'text-base font-semibold text-gray-900 dark:text-white' }, props.title),
        props.loading ? h(LoadingSpinner, { size: 'sm' }) : null,
      ]),
      props.empty
        ? h('div', { class: 'p-8 text-center text-sm text-gray-500 dark:text-gray-400' }, '暂无数据')
        : h('div', { class: 'overflow-x-auto' }, [
            h('table', { class: 'min-w-full' }, slots.default?.()),
          ]),
    ])
  },
})

function createRoundId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `round-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resetRoundId() {
  spinForm.roundId = createRoundId()
}

function requireSession(): GameSession {
  if (!session.value) throw new Error('请先创建测试会话')
  return session.value
}

function formatDate(value?: string): string {
  if (!value) return t('common.notAvailable')
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function handleError(error: unknown, fallback: string) {
  appStore.showError(extractApiErrorMessage(error, fallback))
}

async function loadStatus() {
  loadingStatus.value = true
  try {
    const [healthResult, readyResult] = await Promise.all([
      gameServiceAPI.getHealth(),
      gameServiceAPI.getReady(),
    ])
    health.value = healthResult
    ready.value = readyResult
  } catch (error) {
    handleError(error, '游戏服务状态加载失败')
  } finally {
    loadingStatus.value = false
  }
}

async function loadOps() {
  loadingOps.value = true
  try {
    opsSummary.value = await gameServiceAPI.getOpsSummary()
  } catch (error) {
    handleError(error, '运营数据加载失败')
  } finally {
    loadingOps.value = false
  }
}

async function reloadAll() {
  await Promise.all([loadStatus(), loadOps()])
}

async function startSession() {
  creatingSession.value = true
  try {
    session.value = await gameServiceAPI.createSession({ ...sessionForm })
    scenarioState.value = await gameServiceAPI.getScenario({
      token: session.value.token,
      gameCode: session.value.gameCode,
    })
    lastProtocol.value = await gameServiceAPI.initGame({
      token: session.value.token,
      gameCode: session.value.gameCode,
    })
    await loadOps()
    appStore.showSuccess('测试会话已创建')
  } catch (error) {
    handleError(error, '测试会话创建失败')
  } finally {
    creatingSession.value = false
  }
}

async function loadScenario() {
  loadingScenario.value = true
  try {
    const current = requireSession()
    scenarioState.value = await gameServiceAPI.getScenario({
      token: current.token,
      gameCode: current.gameCode,
    })
  } catch (error) {
    handleError(error, 'GM 场景加载失败')
  } finally {
    loadingScenario.value = false
  }
}

async function chooseScenario(scenario: string) {
  settingScenario.value = scenario
  try {
    const current = requireSession()
    scenarioState.value = await gameServiceAPI.setScenario(
      {
        token: current.token,
        gameCode: current.gameCode,
      },
      scenario,
    )
    await loadOps()
    appStore.showSuccess('GM 场景已切换')
  } catch (error) {
    handleError(error, 'GM 场景切换失败')
  } finally {
    settingScenario.value = null
  }
}

async function runInit() {
  protocolLoading.value = true
  try {
    const current = requireSession()
    lastProtocol.value = await gameServiceAPI.initGame({
      token: current.token,
      gameCode: current.gameCode,
    })
    await loadOps()
  } catch (error) {
    handleError(error, '协议动作执行失败')
  } finally {
    protocolLoading.value = false
  }
}

async function runSpin() {
  protocolLoading.value = true
  try {
    const current = requireSession()
    lastProtocol.value = await gameServiceAPI.spinGame({
      token: current.token,
      gameCode: current.gameCode,
      coin: spinForm.coin,
      lines: spinForm.lines,
      roundId: spinForm.roundId,
    })
    if (lastProtocol.value.na !== 'c') resetRoundId()
    await loadOps()
  } catch (error) {
    handleError(error, '协议动作执行失败')
  } finally {
    protocolLoading.value = false
  }
}

async function runCollect() {
  protocolLoading.value = true
  try {
    const current = requireSession()
    lastProtocol.value = await gameServiceAPI.collectGame({
      token: current.token,
      gameCode: current.gameCode,
    })
    resetRoundId()
    await loadOps()
  } catch (error) {
    handleError(error, '协议动作执行失败')
  } finally {
    protocolLoading.value = false
  }
}

async function downloadOpsCsv() {
  exporting.value = true
  try {
    const blob = await gameServiceAPI.exportOpsCsv()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `game-ops-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    handleError(error, '运营报表导出失败')
  } finally {
    exporting.value = false
  }
}

async function loadSecondStageContract(endpoint: string) {
  loadingSecondStage.value = true
  try {
    secondStageContract.value = await gameServiceAPI.getSecondStageContract(endpoint)
  } catch (error) {
    handleError(error, '第二阶段接口加载失败')
  } finally {
    loadingSecondStage.value = false
  }
}

onMounted(() => {
  void reloadAll()
})
</script>
