<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">场景配置</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              配置每个游戏的中奖/不中奖、下一步动作、倍率、盘面和中奖线，用于运营验收与二次开发。
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
          <MetricCard title="游戏数" :value="snapshot.games.length" icon="grid" hint="已接入目录" />
          <MetricCard title="场景数" :value="snapshot.scenarios.length" icon="beaker" tone="warning" hint="全部游戏场景" />
          <MetricCard title="可用场景" :value="enabledScenarioCount" icon="checkCircle" tone="success" hint="enabled=true" />
          <MetricCard title="收分场景" :value="collectScenarioCount" icon="play" tone="danger" hint="nextStep=collect" />
        </section>

        <section class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside class="space-y-4">
            <div class="card p-5">
              <label class="input-label">游戏</label>
              <select v-model="selectedGameCode" class="input">
                <option v-for="game in snapshot.games" :key="game.code" :value="game.code">
                  {{ game.name }} / {{ game.code }}
                </option>
              </select>

              <label class="input-label mt-4">场景</label>
              <select v-model="selectedScenarioId" class="input">
                <option v-for="scenario in gameScenarios" :key="scenario.id" :value="scenario.id">
                  {{ scenario.label }} / {{ scenario.id }}
                </option>
              </select>
            </div>

            <div class="card p-5">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">场景列表</h2>
              <div class="mt-4 space-y-2">
                <button
                  v-for="scenario in gameScenarios"
                  :key="scenario.id"
                  type="button"
                  class="w-full rounded-lg border px-3 py-2 text-left text-sm transition"
                  :class="scenario.id === selectedScenarioId ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 dark:border-dark-700 dark:bg-dark-900/60'"
                  @click="selectedScenarioId = scenario.id"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-medium text-gray-900 dark:text-white">{{ scenario.label }}</span>
                    <StatusBadge :status="scenario.enabled ? 'success' : 'inactive'" :label="scenario.enabled ? '可用' : '停用'" />
                  </div>
                  <div class="mt-1 font-mono text-xs text-gray-500">{{ scenario.id }}</div>
                </button>
              </div>
            </div>
          </aside>

          <section v-if="editableScenario" class="card p-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">配置详情</h2>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ selectedGameCode }} / {{ editableScenario.id }}</p>
              </div>
              <StatusBadge :status="editableScenario.enabled ? 'success' : 'inactive'" :label="editableScenario.enabled ? '可用' : '停用'" />
            </div>

            <div class="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label class="input-label">场景 ID</label>
                <input v-model.trim="editableScenario.id" class="input font-mono text-xs" disabled />
              </div>
              <div>
                <label class="input-label">名称</label>
                <input v-model.trim="editableScenario.label" class="input" />
              </div>
              <div>
                <label class="input-label">结果类型</label>
                <select v-model="editableScenario.outcomeType" class="input">
                  <option value="noWin">不中奖</option>
                  <option value="lineWin">普通线奖</option>
                  <option value="bigWin">大奖</option>
                  <option value="specialWin">特殊奖</option>
                  <option value="jackpot">Jackpot</option>
                </select>
              </div>
              <div>
                <label class="input-label">下一步动作</label>
                <select v-model="editableScenario.nextStep" class="input">
                  <option value="idle">继续 Spin</option>
                  <option value="collect">需要收分</option>
                  <option value="bonus">进入 Bonus</option>
                  <option value="freeSpinBonus">进入 Free Spin</option>
                </select>
              </div>
              <div>
                <label class="input-label">总赔付倍率</label>
                <input v-model.number="editableScenario.payoutMultiplier" type="number" min="0" step="0.01" class="input" />
              </div>
              <label class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                <span>
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">启用场景</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">停用后 GM 与 Spin 不可选择该场景</span>
                </span>
                <input v-model="editableScenario.enabled" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
            </div>

            <div class="mt-4">
              <label class="input-label">描述</label>
              <textarea v-model.trim="editableScenario.description" class="input min-h-20"></textarea>
            </div>

            <div class="mt-6 grid gap-4 xl:grid-cols-2">
              <div>
                <label class="input-label">盘面 JSON</label>
                <textarea v-model="screenText" class="input min-h-64 font-mono text-xs"></textarea>
              </div>
              <div>
                <label class="input-label">中奖线 JSON</label>
                <textarea v-model="lineWinsText" class="input min-h-64 font-mono text-xs"></textarea>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ validationMessage || '配置将直接写入服务端场景配置表，并影响下一次 Spin。' }}
              </div>
              <button type="button" class="btn btn-primary" :disabled="saving || Boolean(validationMessage)" @click="save">
                <Icon name="check" size="sm" />
                {{ saving ? '保存中' : '保存场景' }}
              </button>
            </div>
          </section>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  loadGameAdminSnapshot,
  saveScenarioConfig,
  type GameAdminSnapshot,
  type ScenarioConfig,
} from '@/api/gameAdmin'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const loading = ref(false)
const saving = ref(false)
const snapshot = ref<GameAdminSnapshot | null>(null)
const selectedGameCode = ref('')
const selectedScenarioId = ref('')
const editableScenario = ref<ScenarioConfig | null>(null)
const screenText = ref('')
const lineWinsText = ref('')
const validationMessage = ref('')

const gameScenarios = computed(() => {
  return (snapshot.value?.scenarios ?? []).filter(scenario =>
    scenario.gameCode === selectedGameCode.value
  )
})
const enabledScenarioCount = computed(() => snapshot.value?.scenarios.filter(scenario => scenario.enabled).length ?? 0)
const collectScenarioCount = computed(() => snapshot.value?.scenarios.filter(scenario => scenario.nextStep === 'collect').length ?? 0)

watch([selectedScenarioId, snapshot], syncEditableScenario)
watch(selectedGameCode, () => {
  selectedScenarioId.value = gameScenarios.value[0]?.id || ''
  syncEditableScenario()
})
watch([screenText, lineWinsText], validateJson)

function selectDefaults() {
  if (!snapshot.value) return
  selectedGameCode.value ||= snapshot.value.games[0]?.code || ''
  selectedScenarioId.value ||= gameScenarios.value[0]?.id || ''
}

function syncEditableScenario() {
  const scenario = gameScenarios.value.find(item => item.id === selectedScenarioId.value)
  editableScenario.value = scenario ? JSON.parse(JSON.stringify(scenario)) as ScenarioConfig : null
  screenText.value = editableScenario.value ? JSON.stringify(editableScenario.value.screen, null, 2) : ''
  lineWinsText.value = editableScenario.value ? JSON.stringify(editableScenario.value.lineWins || [], null, 2) : ''
  validateJson()
}

function validateJson() {
  try {
    JSON.parse(screenText.value || '{}')
    JSON.parse(lineWinsText.value || '[]')
    validationMessage.value = ''
  } catch (error) {
    validationMessage.value = error instanceof Error ? error.message : 'JSON 格式非法'
  }
}

async function load() {
  loading.value = true
  try {
    snapshot.value = await loadGameAdminSnapshot()
    selectDefaults()
    syncEditableScenario()
  } catch (error) {
    console.error(error)
    appStore.showError('场景配置加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!editableScenario.value || validationMessage.value) return
  saving.value = true
  try {
    const payload = {
      ...editableScenario.value,
      screen: JSON.parse(screenText.value),
      lineWins: JSON.parse(lineWinsText.value),
    }
    await saveScenarioConfig(selectedGameCode.value, payload)
    snapshot.value = await loadGameAdminSnapshot()
    syncEditableScenario()
    appStore.showSuccess('场景配置已保存')
  } catch (error) {
    console.error(error)
    appStore.showError('场景配置保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
