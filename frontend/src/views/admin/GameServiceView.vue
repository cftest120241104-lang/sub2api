<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ t('admin.gameService.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.gameService.description') }}
            </p>
            <p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              {{ gameServiceAPI.baseUrl }}
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingStatus" @click="loadStatus">
            <Icon name="refresh" size="sm" />
            {{ loadingStatus ? t('common.loading') : t('common.refresh') }}
          </button>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.gameService.health') }}</span>
              <StatusBadge :status="health?.ok ? 'success' : 'error'" :label="health?.ok ? t('common.active') : t('common.error')" />
            </div>
            <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">
              {{ health?.service || t('common.notAvailable') }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(health?.time) }}</p>
          </div>

          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.gameService.readiness') }}</span>
              <StatusBadge :status="ready?.ok ? 'success' : 'error'" :label="ready?.ok ? t('admin.gameService.ready') : t('admin.gameService.notReady')" />
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

          <div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.gameService.currentSession') }}</span>
            <p class="mt-3 truncate font-mono text-xs text-gray-900 dark:text-white">
              {{ session?.token || t('admin.gameService.noSession') }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ session ? `${session.playerId} / ${session.currency}` : t('admin.gameService.createSessionHint') }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ t('admin.gameService.testSession') }}
          </h2>
          <div class="mt-4 space-y-4">
            <div>
              <label class="input-label">{{ t('admin.gameService.channelCode') }}</label>
              <input v-model.trim="sessionForm.channelCode" class="input" />
            </div>
            <div>
              <label class="input-label">{{ t('admin.gameService.gameCode') }}</label>
              <input v-model.trim="sessionForm.gameCode" class="input" />
            </div>
            <div>
              <label class="input-label">{{ t('admin.gameService.playerId') }}</label>
              <input v-model.trim="sessionForm.playerId" class="input" />
            </div>
            <div>
              <label class="input-label">{{ t('admin.gameService.currency') }}</label>
              <input v-model.trim="sessionForm.currency" class="input" />
            </div>
            <button type="button" class="btn btn-primary w-full" :disabled="creatingSession" @click="startSession">
              <Icon name="play" size="sm" />
              {{ creatingSession ? t('common.loading') : t('admin.gameService.createSession') }}
            </button>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ t('admin.gameService.gmScenarios') }}
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ scenarioState?.current ? t('admin.gameService.currentScenario', { id: scenarioState.current }) : t('admin.gameService.scenarioHint') }}
                </p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || loadingScenario" @click="loadScenario">
                <Icon name="sync" size="sm" />
                {{ loadingScenario ? t('common.loading') : t('admin.gameService.loadScenarios') }}
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
              {{ t('admin.gameService.noScenarioData') }}
            </div>
          </div>

          <div class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ t('admin.gameService.protocolTest') }}
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.gameService.protocolDescription') }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || protocolLoading" @click="runInit">
                  {{ t('admin.gameService.doInit') }}
                </button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="!session || protocolLoading" @click="runSpin">
                  {{ t('admin.gameService.doSpin') }}
                </button>
                <button type="button" class="btn btn-secondary btn-sm" :disabled="!session || protocolLoading" @click="runCollect">
                  {{ t('admin.gameService.doCollect') }}
                </button>
              </div>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label class="input-label">{{ t('admin.gameService.coin') }}</label>
                <input v-model.trim="spinForm.coin" class="input" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.gameService.lines') }}</label>
                <input v-model.number="spinForm.lines" type="number" min="1" class="input" />
              </div>
              <div>
                <label class="input-label">{{ t('admin.gameService.roundId') }}</label>
                <div class="flex gap-2">
                  <input v-model.trim="spinForm.roundId" class="input font-mono text-xs" />
                  <button type="button" class="btn btn-secondary btn-icon" :title="t('admin.gameService.regenerateRoundId')" @click="resetRoundId">
                    <Icon name="refresh" size="sm" />
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-xl border border-gray-100 bg-gray-950 p-4 dark:border-dark-700">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {{ t('admin.gameService.lastProtocol') }}
                </span>
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
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import gameServiceAPI, {
  type GameHealth,
  type GameReady,
  type GameSession,
  type GmScenarioState,
  type ProtocolPayload,
} from '@/api/gameService'

const { t } = useI18n()
const appStore = useAppStore()

const loadingStatus = ref(false)
const creatingSession = ref(false)
const loadingScenario = ref(false)
const settingScenario = ref<string | null>(null)
const protocolLoading = ref(false)

const health = ref<GameHealth | null>(null)
const ready = ref<GameReady | null>(null)
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
  return lastProtocol.value ? JSON.stringify(lastProtocol.value, null, 2) : t('admin.gameService.noProtocolOutput')
})

function createRoundId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `round-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resetRoundId() {
  spinForm.roundId = createRoundId()
}

function requireSession(): GameSession {
  if (!session.value) throw new Error(t('admin.gameService.sessionRequired'))
  return session.value
}

function formatDate(value?: string): string {
  if (!value) return t('common.notAvailable')
  return new Intl.DateTimeFormat(undefined, {
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
    const [healthResult, readyResult] = await Promise.all([
      gameServiceAPI.getHealth(),
      gameServiceAPI.getReady(),
    ])
    health.value = healthResult
    ready.value = readyResult
  } catch (error) {
    handleError(error, t('admin.gameService.statusFailed'))
  } finally {
    loadingStatus.value = false
  }
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
    appStore.showSuccess(t('admin.gameService.sessionCreated'))
  } catch (error) {
    handleError(error, t('admin.gameService.sessionCreateFailed'))
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
    handleError(error, t('admin.gameService.scenarioLoadFailed'))
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
    appStore.showSuccess(t('admin.gameService.scenarioSet'))
  } catch (error) {
    handleError(error, t('admin.gameService.scenarioSetFailed'))
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
  } catch (error) {
    handleError(error, t('admin.gameService.protocolFailed'))
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
  } catch (error) {
    handleError(error, t('admin.gameService.protocolFailed'))
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
  } catch (error) {
    handleError(error, t('admin.gameService.protocolFailed'))
  } finally {
    protocolLoading.value = false
  }
}

onMounted(() => {
  void loadStatus()
})
</script>
