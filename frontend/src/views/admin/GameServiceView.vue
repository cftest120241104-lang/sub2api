<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">游戏服务调试</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              直连 Pragmatic gameService，创建测试会话并执行 doInit / doSpin / doCollect。
            </p>
            <p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">{{ gameServiceAPI.baseUrl }}</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingStatus" @click="loadStatus">
            <Icon name="refresh" size="sm" />
            {{ loadingStatus ? '检查中' : '检查状态' }}
          </button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">Health</span>
              <StatusBadge :status="health?.ok ? 'success' : 'error'" :label="health?.ok ? 'OK' : 'ERR'" />
            </div>
            <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">{{ health?.service || '未连接' }}</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ health?.time ? formatDate(health.time) : '-' }}</p>
          </div>

          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">Ready</span>
              <StatusBadge :status="ready?.ok ? 'success' : 'warning'" :label="ready?.ok ? 'READY' : '降级'" />
            </div>
            <div class="mt-3 space-y-1 text-xs">
              <div v-for="item in readyChecks" :key="item.name" class="flex justify-between gap-3">
                <span class="text-gray-600 dark:text-gray-300">{{ item.name }}</span>
                <span :class="item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                  {{ item.ok ? 'OK' : item.error || 'ERR' }}
                </span>
              </div>
              <p v-if="readyChecks.length === 0" class="text-gray-500 dark:text-gray-400">暂无检查项</p>
            </div>
          </div>

          <MetricCard title="最近玩家" :value="snapshot?.totals.players ?? 0" icon="users" hint="运营接口聚合" />
          <MetricCard title="最近 Spin" :value="snapshot?.totals.spins ?? 0" icon="play" tone="warning" hint="运营接口聚合" />
        </div>
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
                {{ creatingSession ? '创建中' : '创建并初始化' }}
              </button>
            </div>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">当前会话</h2>
            <p class="mt-3 truncate font-mono text-xs text-gray-900 dark:text-white">
              {{ session?.token || '尚未创建会话' }}
            </p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {{ session ? `${session.channelCode} / ${session.gameCode} / ${session.playerId}` : '创建后可执行协议动作' }}
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
                {{ loadingScenario ? '加载中' : '加载场景' }}
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
            <div v-else class="mt-5 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
              暂无 GM 场景数据
            </div>
          </div>

          <div class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">协议测试</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">执行基础 Pragmatic 协议动作并查看原始响应。</p>
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
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import gameServiceAPI, {
  type GameHealth,
  type GameReady,
  type GameSession,
  type GmScenarioState,
  type ProtocolPayload,
} from '@/api/gameService'
import { loadGameAdminSnapshot, type GameAdminSnapshot } from '@/api/gameAdmin'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'

const appStore = useAppStore()

const loadingStatus = ref(false)
const creatingSession = ref(false)
const loadingScenario = ref(false)
const settingScenario = ref<string | null>(null)
const protocolLoading = ref(false)

const health = ref<GameHealth | null>(null)
const ready = ref<GameReady | null>(null)
const snapshot = ref<GameAdminSnapshot | null>(null)
const session = ref<GameSession | null>(null)
const scenarioState = ref<GmScenarioState | null>(null)
const lastProtocol = ref<ProtocolPayload | null>(null)

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function handleError(error: unknown, fallback: string) {
  appStore.showError(extractApiErrorMessage(error, fallback))
}

async function loadStatus() {
  loadingStatus.value = true
  try {
    const [healthResult, readyResult, snapshotResult] = await Promise.allSettled([
      gameServiceAPI.getHealth(),
      gameServiceAPI.getReady(),
      loadGameAdminSnapshot(),
    ])
    health.value = healthResult.status === 'fulfilled' ? healthResult.value : null
    ready.value = readyResult.status === 'fulfilled' ? readyResult.value : null
    snapshot.value = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null
  } catch (error) {
    handleError(error, '游戏服务状态加载失败')
  } finally {
    loadingStatus.value = false
  }
}

async function refreshSnapshot() {
  snapshot.value = await loadGameAdminSnapshot()
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
    await refreshSnapshot()
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
    await refreshSnapshot()
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
    await refreshSnapshot()
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
    await refreshSnapshot()
  } catch (error) {
    handleError(error, '协议动作执行失败')
  } finally {
    protocolLoading.value = false
  }
}

onMounted(() => {
  void loadStatus()
})
</script>
