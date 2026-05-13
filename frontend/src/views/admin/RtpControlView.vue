<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">RTP 与棋盘控制</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              按渠道、游戏、币种、玩家分层、投注区间和时间窗配置 RTP 档位、命中规则、棋盘模板和运行统计。
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
            <Icon name="refresh" size="sm" />
            {{ loading ? '刷新中' : '刷新' }}
          </button>
        </div>
      </section>

      <div v-if="loading && !overview" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>

      <template v-else-if="overview">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="RTP 档位" :value="overview.profiles.length" icon="chart" hint="rtp_profiles" />
          <MetricCard title="控制规则" :value="overview.rules.length" icon="filter" tone="warning" hint="rtp_rules" />
          <MetricCard title="棋盘模板" :value="overview.boardConfigs.length" icon="grid" tone="success" hint="game_board_configs" />
          <MetricCard title="统计桶" :value="overview.runtimeStats.length" icon="database" tone="danger" hint="rtp_runtime_stats" />
        </section>

        <section class="card p-3">
          <div class="tabs w-full overflow-x-auto">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="tab whitespace-nowrap"
              :class="{ 'tab-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </section>

        <section v-if="activeTab === 'profiles'" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div class="card p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">RTP 档位</h2>
              <button type="button" class="btn btn-secondary btn-sm" @click="resetProfileForm">
                <Icon name="plus" size="sm" />
                新建档位
              </button>
            </div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>档位</th>
                    <th>目标 RTP</th>
                    <th>容差</th>
                    <th>状态</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="profile in overview.profiles" :key="profile.profileId">
                    <td>
                      <div class="font-medium text-gray-900 dark:text-white">{{ profile.label }}</div>
                      <div class="font-mono text-xs text-gray-500">{{ profile.profileId }}</div>
                    </td>
                    <td>{{ permilleLabel(profile.targetRtpPermille) }}</td>
                    <td>{{ permilleGapLabel(profile.tolerancePermille) }}</td>
                    <td>
                      <StatusBadge :status="profile.enabled ? 'success' : 'inactive'" :label="profile.enabled ? '启用' : '停用'" />
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn btn-ghost btn-sm" @click="editProfile(profile)">
                        <Icon name="edit" size="sm" />
                        编辑
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">编辑 RTP 档位</h2>
            <div class="mt-5 space-y-4">
              <div>
                <label class="input-label">档位 ID</label>
                <input v-model.trim="profileForm.profileId" class="input font-mono text-xs" />
              </div>
              <div>
                <label class="input-label">名称</label>
                <input v-model.trim="profileForm.label" class="input" />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="input-label">目标 RTP 千分比</label>
                  <input v-model.number="profileForm.targetRtpPermille" type="number" min="0" max="1000" class="input" />
                  <p class="input-hint">{{ permilleLabel(profileForm.targetRtpPermille) }}</p>
                </div>
                <div>
                  <label class="input-label">容差千分比</label>
                  <input v-model.number="profileForm.tolerancePermille" type="number" min="0" max="1000" class="input" />
                  <p class="input-hint">{{ permilleGapLabel(profileForm.tolerancePermille) }}</p>
                </div>
              </div>
              <div>
                <label class="input-label">描述</label>
                <textarea v-model.trim="profileForm.description" class="input min-h-20"></textarea>
              </div>
              <label class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                <span>
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">启用档位</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">停用后规则不会使用该档位</span>
                </span>
                <input v-model="profileForm.enabled" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
              <button type="button" class="btn btn-primary w-full" :disabled="savingProfile" @click="submitProfile">
                <Icon name="check" size="sm" />
                {{ savingProfile ? '保存中' : '保存档位' }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'rules'" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div class="card p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">RTP 规则</h2>
              <button type="button" class="btn btn-secondary btn-sm" @click="resetRuleForm">
                <Icon name="plus" size="sm" />
                新建规则
              </button>
            </div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>规则</th>
                    <th>范围</th>
                    <th>档位</th>
                    <th>投注区间</th>
                    <th>状态</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rule in overview.rules" :key="rule.ruleId">
                    <td>
                      <div class="font-medium text-gray-900 dark:text-white">{{ rule.label }}</div>
                      <div class="font-mono text-xs text-gray-500">{{ rule.ruleId }} · P{{ rule.priority }}</div>
                    </td>
                    <td class="font-mono text-xs">
                      {{ rule.channelCode || '*' }} / {{ rule.gameCode || '*' }} / {{ rule.currency || '*' }} / {{ rule.playerSegment }}
                    </td>
                    <td>{{ rule.profileId || permilleLabel(rule.targetRtpPermille || 0) }}</td>
                    <td>{{ centsLabel(rule.minBetCents) }} - {{ centsLabel(rule.maxBetCents) }}</td>
                    <td>
                      <StatusBadge :status="rule.enabled ? 'success' : 'inactive'" :label="rule.enabled ? '启用' : '停用'" />
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn btn-ghost btn-sm" @click="editRule(rule)">
                        <Icon name="edit" size="sm" />
                        编辑
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">编辑 RTP 规则</h2>
            <div class="mt-5 space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="input-label">规则 ID</label>
                  <input v-model.trim="ruleForm.ruleId" class="input font-mono text-xs" />
                </div>
                <div>
                  <label class="input-label">优先级</label>
                  <input v-model.number="ruleForm.priority" type="number" class="input" />
                </div>
              </div>
              <div>
                <label class="input-label">名称</label>
                <input v-model.trim="ruleForm.label" class="input" />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="input-label">渠道</label>
                  <input v-model.trim="ruleForm.channelCode" class="input" placeholder="留空表示全部" />
                </div>
                <div>
                  <label class="input-label">游戏</label>
                  <select v-model="ruleForm.gameCode" class="input">
                    <option value="">全部游戏</option>
                    <option v-for="game in games" :key="game.code" :value="game.code">{{ game.name }} / {{ game.code }}</option>
                  </select>
                </div>
                <div>
                  <label class="input-label">币种</label>
                  <input v-model.trim="ruleForm.currency" class="input" placeholder="留空表示全部" />
                </div>
                <div>
                  <label class="input-label">玩家分层</label>
                  <input v-model.trim="ruleForm.playerSegment" class="input" />
                </div>
                <div>
                  <label class="input-label">最小投注分</label>
                  <input v-model.number="ruleForm.minBetCents" type="number" min="1" class="input" />
                </div>
                <div>
                  <label class="input-label">最大投注分</label>
                  <input v-model.number="ruleForm.maxBetCents" type="number" min="1" class="input" />
                </div>
              </div>
              <div>
                <label class="input-label">RTP 档位</label>
                <select v-model="ruleForm.profileId" class="input">
                  <option value="">不绑定档位，使用规则内目标 RTP</option>
                  <option v-for="profile in overview.profiles" :key="profile.profileId" :value="profile.profileId">
                    {{ profile.label }} / {{ permilleLabel(profile.targetRtpPermille) }}
                  </option>
                </select>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="input-label">规则目标 RTP</label>
                  <input v-model.number="ruleForm.targetRtpPermille" type="number" min="0" max="1000" class="input" />
                </div>
                <div>
                  <label class="input-label">规则容差</label>
                  <input v-model.number="ruleForm.tolerancePermille" type="number" min="0" max="1000" class="input" />
                </div>
              </div>
              <div>
                <label class="input-label">场景权重 JSON</label>
                <textarea v-model="scenarioWeightsText" class="input min-h-40 font-mono text-xs"></textarea>
                <p v-if="ruleJsonError" class="input-error-text">{{ ruleJsonError }}</p>
              </div>
              <label class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                <span>
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">启用规则</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">优先级高的规则会先命中</span>
                </span>
                <input v-model="ruleForm.enabled" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
              <button type="button" class="btn btn-primary w-full" :disabled="savingRule || Boolean(ruleJsonError)" @click="submitRule">
                <Icon name="check" size="sm" />
                {{ savingRule ? '保存中' : '保存规则' }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'boards'" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div class="card p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">棋盘模板</h2>
              <button type="button" class="btn btn-secondary btn-sm" @click="resetBoardForm">
                <Icon name="plus" size="sm" />
                新建棋盘
              </button>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <button
                v-for="board in overview.boardConfigs"
                :key="`${board.gameCode}:${board.boardId}`"
                type="button"
                class="cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-dark-700 dark:bg-dark-900/60 dark:hover:bg-primary-900/20"
                @click="editBoard(board)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ board.label }}</div>
                    <div class="mt-1 font-mono text-xs text-gray-500">{{ board.gameCode }} / {{ board.boardId }}</div>
                  </div>
                  <StatusBadge :status="board.enabled ? 'success' : 'inactive'" :label="board.enabled ? '启用' : '停用'" />
                </div>
                <BoardPreview class="mt-4" :screen="board.screen" />
                <div class="mt-3 flex flex-wrap gap-2">
                  <span v-for="tag in board.tags" :key="tag" class="rounded bg-white px-2 py-1 text-xs text-gray-600 dark:bg-dark-800 dark:text-gray-300">
                    {{ tag }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">编辑棋盘模板</h2>
            <div class="mt-5 space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="input-label">游戏</label>
                  <select v-model="boardForm.gameCode" class="input">
                    <option v-for="game in games" :key="game.code" :value="game.code">{{ game.name }} / {{ game.code }}</option>
                  </select>
                </div>
                <div>
                  <label class="input-label">棋盘 ID</label>
                  <input v-model.trim="boardForm.boardId" class="input font-mono text-xs" />
                </div>
              </div>
              <div>
                <label class="input-label">名称</label>
                <input v-model.trim="boardForm.label" class="input" />
              </div>
              <div>
                <label class="input-label">标签</label>
                <input v-model.trim="boardTagsText" class="input" placeholder="用逗号分隔，例如 qa,rtp,base" />
              </div>
              <div>
                <label class="input-label">描述</label>
                <textarea v-model.trim="boardForm.description" class="input min-h-20"></textarea>
              </div>
              <div>
                <label class="input-label">棋盘 JSON</label>
                <textarea v-model="boardScreenText" class="input min-h-48 font-mono text-xs"></textarea>
                <p v-if="boardJsonError" class="input-error-text">{{ boardJsonError }}</p>
              </div>
              <label class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/60">
                <span>
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">启用棋盘</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">可被后续场景模板引用</span>
                </span>
                <input v-model="boardForm.enabled" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
              <button type="button" class="btn btn-primary w-full" :disabled="savingBoard || Boolean(boardJsonError)" @click="submitBoard">
                <Icon name="check" size="sm" />
                {{ savingBoard ? '保存中' : '保存棋盘' }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'stats'" class="card p-6">
          <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">RTP 运行统计</h2>
            <div class="relative md:w-80">
              <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model.trim="statsKeyword" class="input pl-9" placeholder="搜索渠道、游戏、规则或档位" />
            </div>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>范围</th>
                  <th>档位 / 规则</th>
                  <th>局数</th>
                  <th>投注</th>
                  <th>派彩</th>
                  <th>实际 RTP</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in filteredStats" :key="stat.bucketKey">
                  <td class="font-mono text-xs">{{ stat.channelCode }} / {{ stat.gameCode }} / {{ stat.currency }} / {{ stat.playerSegment }}</td>
                  <td>
                    <div class="font-mono text-xs text-gray-900 dark:text-white">{{ stat.profileId }}</div>
                    <div class="font-mono text-xs text-gray-500">{{ stat.ruleId }}</div>
                  </td>
                  <td>{{ formatNumber(stat.rounds) }}</td>
                  <td>{{ centsLabel(stat.totalBetCents) }}</td>
                  <td>{{ centsLabel(stat.totalWinCents) }}</td>
                  <td>
                    <span class="font-semibold" :class="stat.actualRtpPermille > 1000 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
                      {{ permilleLabel(stat.actualRtpPermille) }}
                    </span>
                  </td>
                  <td>{{ formatDate(stat.updatedAt) }}</td>
                </tr>
                <tr v-if="filteredStats.length === 0">
                  <td colspan="7" class="py-10 text-center text-gray-500 dark:text-gray-400">暂无运行统计</td>
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
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import gameServiceAPI, {
  type GameBoardConfig,
  type GameReelScreen,
  type OpsGameCatalogItem,
  type RtpControlOverview,
  type RtpProfile,
  type RtpRule,
} from '@/api/gameService'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'

type TabKey = 'profiles' | 'rules' | 'boards' | 'stats'

const appStore = useAppStore()
const loading = ref(false)
const savingProfile = ref(false)
const savingRule = ref(false)
const savingBoard = ref(false)
const overview = ref<RtpControlOverview | null>(null)
const games = ref<OpsGameCatalogItem[]>([])
const activeTab = ref<TabKey>('profiles')
const scenarioWeightsText = ref('')
const ruleJsonError = ref('')
const boardScreenText = ref('')
const boardTagsText = ref('')
const boardJsonError = ref('')
const statsKeyword = ref('')

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'profiles', label: 'RTP 档位' },
  { key: 'rules', label: '控制规则' },
  { key: 'boards', label: '棋盘模板' },
  { key: 'stats', label: '运行统计' },
]

const defaultScreen: GameReelScreen = {
  rows: 3,
  columns: 5,
  symbols: [8, 11, 7, 9, 14, 8, 10, 4, 2, 14, 4, 10, 7, 2, 14],
  symbolsAbove: [14, 14, 7, 14, 8],
  symbolsBelow: [13, 7, 4, 10, 8],
}

const profileForm = reactive({
  profileId: 'rtp-965',
  label: '96.5% RTP 档',
  description: '',
  targetRtpPermille: 965,
  tolerancePermille: 20,
  enabled: true,
})

const ruleForm = reactive({
  ruleId: 'rule-vs10jokerhot-default',
  label: '默认 RTP 规则',
  priority: 100,
  channelCode: '',
  gameCode: 'vs10jokerhot',
  currency: '',
  playerSegment: 'default',
  minBetCents: undefined as number | undefined,
  maxBetCents: undefined as number | undefined,
  profileId: 'default-965',
  targetRtpPermille: undefined as number | undefined,
  tolerancePermille: undefined as number | undefined,
  enabled: true,
})

const boardForm = reactive({
  gameCode: 'vs10jokerhot',
  boardId: 'board-base',
  label: '基础棋盘',
  description: '',
  enabled: true,
})

const BoardPreview = defineComponent({
  props: {
    screen: { type: Object as () => GameReelScreen, required: true },
  },
  setup(props, { attrs }) {
    return () => h('div', { ...attrs, class: ['grid grid-cols-5 gap-1', attrs.class] }, props.screen.symbols.map((symbol, index) =>
      h('div', {
        key: index,
        class: 'flex aspect-square items-center justify-center rounded-md border border-gray-200 bg-white font-mono text-xs font-semibold text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200',
      }, String(symbol))
    ))
  },
})

const filteredStats = computed(() => {
  const query = statsKeyword.value.toLowerCase()
  const stats = overview.value?.runtimeStats ?? []
  if (!query) return stats
  return stats.filter(stat => [
    stat.channelCode,
    stat.gameCode,
    stat.profileId,
    stat.ruleId,
    stat.playerSegment,
    stat.currency,
  ].some(value => value.toLowerCase().includes(query)))
})

watch(scenarioWeightsText, validateScenarioWeights)
watch(boardScreenText, validateBoardScreen)

function applyProfile(profile: Partial<RtpProfile>) {
  profileForm.profileId = profile.profileId || ''
  profileForm.label = profile.label || ''
  profileForm.description = profile.description || ''
  profileForm.targetRtpPermille = profile.targetRtpPermille ?? 965
  profileForm.tolerancePermille = profile.tolerancePermille ?? 20
  profileForm.enabled = profile.enabled ?? true
}

function applyRule(rule: Partial<RtpRule>) {
  ruleForm.ruleId = rule.ruleId || ''
  ruleForm.label = rule.label || ''
  ruleForm.priority = rule.priority ?? 100
  ruleForm.channelCode = rule.channelCode || ''
  ruleForm.gameCode = rule.gameCode || ''
  ruleForm.currency = rule.currency || ''
  ruleForm.playerSegment = rule.playerSegment || 'default'
  ruleForm.minBetCents = rule.minBetCents
  ruleForm.maxBetCents = rule.maxBetCents
  ruleForm.profileId = rule.profileId || ''
  ruleForm.targetRtpPermille = rule.targetRtpPermille
  ruleForm.tolerancePermille = rule.tolerancePermille
  ruleForm.enabled = rule.enabled ?? true
  scenarioWeightsText.value = JSON.stringify(rule.scenarioWeights || [{ scenarioId: 'no-win', weight: 1 }], null, 2)
}

function applyBoard(board: Partial<GameBoardConfig>) {
  boardForm.gameCode = board.gameCode || games.value[0]?.code || 'vs10jokerhot'
  boardForm.boardId = board.boardId || ''
  boardForm.label = board.label || ''
  boardForm.description = board.description || ''
  boardForm.enabled = board.enabled ?? true
  boardTagsText.value = (board.tags || []).join(',')
  boardScreenText.value = JSON.stringify(board.screen || defaultScreen, null, 2)
}

function resetProfileForm() {
  applyProfile({
    profileId: `rtp-${Date.now()}`,
    label: '新 RTP 档位',
    targetRtpPermille: 965,
    tolerancePermille: 20,
    enabled: true,
  })
}

function resetRuleForm() {
  applyRule({
    ruleId: `rtp-rule-${Date.now()}`,
    label: '新 RTP 规则',
    priority: 100,
    gameCode: games.value[0]?.code || 'vs10jokerhot',
    playerSegment: 'default',
    profileId: overview.value?.profiles[0]?.profileId || '',
    scenarioWeights: [{ scenarioId: 'no-win', weight: 1 }],
    enabled: true,
  })
}

function resetBoardForm() {
  applyBoard({
    gameCode: games.value[0]?.code || 'vs10jokerhot',
    boardId: `board-${Date.now()}`,
    label: '新棋盘模板',
    screen: defaultScreen,
    tags: ['rtp'],
    enabled: true,
  })
}

function editProfile(profile: RtpProfile) {
  applyProfile(profile)
}

function editRule(rule: RtpRule) {
  applyRule(rule)
}

function editBoard(board: GameBoardConfig) {
  applyBoard(board)
}

function validateScenarioWeights() {
  try {
    const parsed = JSON.parse(scenarioWeightsText.value || '[]')
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('场景权重不能为空')
    ruleJsonError.value = ''
  } catch (error) {
    ruleJsonError.value = error instanceof Error ? error.message : '场景权重 JSON 非法'
  }
}

function validateBoardScreen() {
  try {
    const parsed = JSON.parse(boardScreenText.value || '{}') as GameReelScreen
    if (!parsed.rows || !parsed.columns || !Array.isArray(parsed.symbols)) throw new Error('棋盘必须包含 rows、columns、symbols')
    if (parsed.symbols.length !== parsed.rows * parsed.columns) throw new Error('symbols 数量必须等于 rows * columns')
    boardJsonError.value = ''
  } catch (error) {
    boardJsonError.value = error instanceof Error ? error.message : '棋盘 JSON 非法'
  }
}

async function load() {
  loading.value = true
  try {
    const [overviewResult, gamesResult] = await Promise.all([
      gameServiceAPI.getRtpControlOverview(),
      gameServiceAPI.getGames(),
    ])
    overview.value = overviewResult
    games.value = gamesResult
    if (!profileForm.profileId && overviewResult.profiles[0]) applyProfile(overviewResult.profiles[0])
    if (!ruleForm.ruleId && overviewResult.rules[0]) applyRule(overviewResult.rules[0])
    if (!boardForm.boardId && overviewResult.boardConfigs[0]) applyBoard(overviewResult.boardConfigs[0])
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, 'RTP 控制数据加载失败'))
  } finally {
    loading.value = false
  }
}

async function submitProfile() {
  savingProfile.value = true
  try {
    await gameServiceAPI.saveRtpProfile({ ...profileForm, config: {} })
    await load()
    appStore.showSuccess('RTP 档位已保存')
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, 'RTP 档位保存失败'))
  } finally {
    savingProfile.value = false
  }
}

async function submitRule() {
  validateScenarioWeights()
  if (ruleJsonError.value) return
  savingRule.value = true
  try {
    await gameServiceAPI.saveRtpRule({
      ...ruleForm,
      channelCode: ruleForm.channelCode || undefined,
      gameCode: ruleForm.gameCode || undefined,
      currency: ruleForm.currency || undefined,
      profileId: ruleForm.profileId || undefined,
      minBetCents: optionalNumber(ruleForm.minBetCents),
      maxBetCents: optionalNumber(ruleForm.maxBetCents),
      targetRtpPermille: optionalNumber(ruleForm.targetRtpPermille),
      tolerancePermille: optionalNumber(ruleForm.tolerancePermille),
      scenarioWeights: JSON.parse(scenarioWeightsText.value),
      conditions: {},
    })
    await load()
    appStore.showSuccess('RTP 规则已保存')
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, 'RTP 规则保存失败'))
  } finally {
    savingRule.value = false
  }
}

async function submitBoard() {
  validateBoardScreen()
  if (boardJsonError.value) return
  savingBoard.value = true
  try {
    await gameServiceAPI.saveBoardConfig({
      ...boardForm,
      tags: boardTagsText.value.split(',').map(item => item.trim()).filter(Boolean),
      screen: JSON.parse(boardScreenText.value),
    })
    await load()
    appStore.showSuccess('棋盘模板已保存')
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, '棋盘模板保存失败'))
  } finally {
    savingBoard.value = false
  }
}

function permilleLabel(value: number): string {
  return `${(value / 10).toFixed(1)}%`
}

function permilleGapLabel(value: number): string {
  return `±${(value / 10).toFixed(1)}%`
}

function centsLabel(value?: number): string {
  if (value === undefined || value === null) return '*'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value / 100)
}

function optionalNumber(value?: number): number | undefined {
  return value === undefined || value === null || Number.isNaN(value) ? undefined : value
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

onMounted(() => {
  resetProfileForm()
  resetRuleForm()
  resetBoardForm()
  void load()
})
</script>
