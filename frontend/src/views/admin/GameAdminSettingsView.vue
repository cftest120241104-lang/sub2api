<template>
  <AppLayout>
    <div class="space-y-6">
      <section class="card p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">上线设置</h1>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="ready?.ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'"
              >
                {{ ready?.ok ? '服务就绪' : '待检查' }}
              </span>
            </div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              面向游戏后台的运行配置、上线检查和二次开发入口，不再暴露订阅、API Key、OpenAI 等 sub2api 配置项。
            </p>
            <p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">{{ gameServiceAPI.baseUrl }}</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
            <Icon name="refresh" size="sm" :class="{ 'animate-spin': loading }" />
            {{ loading ? '检查中' : '重新检查' }}
          </button>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="服务健康" :value="health?.ok ? 'OK' : '未通过'" icon="server" :tone="health?.ok ? 'success' : 'danger'" hint="GET /health" />
        <MetricCard title="依赖就绪" :value="ready?.ok ? 'READY' : '降级'" icon="database" :tone="ready?.ok ? 'success' : 'warning'" hint="GET /ready" />
        <MetricCard title="渠道游戏配置" :value="snapshot?.totals.enabledChannelGames ?? 0" icon="swap" tone="primary" hint="启用的渠道 × 游戏" />
        <MetricCard title="棋盘模板" :value="snapshot?.boardConfigs.length ?? 0" icon="grid" tone="warning" hint="RTP 可引用模板" />
      </section>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div class="card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">生产检查</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">这些项目是当前后台用于判断非 demo 环境是否具备上线基础的检查项。</p>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-dark-700">
            <div v-for="item in productionChecks" :key="item.key" class="flex items-start justify-between gap-4 px-6 py-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-medium text-gray-900 dark:text-white">{{ item.title }}</h3>
                  <StatusBadge :status="item.status" :label="item.label" />
                </div>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ item.description }}</p>
              </div>
              <RouterLink v-if="item.to" class="btn btn-secondary btn-sm flex-shrink-0" :to="item.to">
                查看
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">服务连接</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">后台经管理代理访问游戏服务。</p>
              </div>
              <Icon name="link" size="lg" class="text-primary-500" />
            </div>
            <dl class="mt-5 space-y-4 text-sm">
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <dt class="text-gray-500 dark:text-gray-400">代理地址</dt>
                <dd class="mt-1 break-all font-mono text-gray-900 dark:text-white">{{ gameServiceAPI.baseUrl }}</dd>
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <dt class="text-gray-500 dark:text-gray-400">Health</dt>
                <dd class="mt-1 font-mono text-gray-900 dark:text-white">{{ health?.service || '-' }}</dd>
              </div>
              <div class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
                <dt class="text-gray-500 dark:text-gray-400">最后检查</dt>
                <dd class="mt-1 font-mono text-gray-900 dark:text-white">{{ checkedAtLabel }}</dd>
              </div>
            </dl>
          </div>

          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">二次开发边界</h2>
            <div class="mt-4 space-y-3">
              <div v-for="item in developmentBoundaries" :key="item.title" class="rounded-xl border border-gray-100 p-4 dark:border-dark-700">
                <div class="flex items-center gap-2">
                  <Icon :name="item.icon" size="sm" class="text-primary-500" />
                  <span class="font-medium text-gray-900 dark:text-white">{{ item.title }}</span>
                </div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">上线配置摘要</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">当前游戏服务返回的数据摘要，用于确认后台连接的是项目服务而不是旧系统。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink class="btn btn-secondary btn-sm" to="/admin/rtp-control">RTP / 棋盘</RouterLink>
            <RouterLink class="btn btn-secondary btn-sm" to="/admin/channel-games">渠道游戏配置</RouterLink>
            <RouterLink class="btn btn-secondary btn-sm" to="/admin/game-service">协议调试</RouterLink>
          </div>
        </div>
        <div class="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="item in summaryCards" :key="item.title" class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/60">
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ item.title }}</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{{ item.value }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.hint }}</div>
          </div>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import gameServiceAPI, { type GameHealth, type GameReady } from '@/api/gameService'
import { loadGameAdminSnapshot, type GameAdminSnapshot } from '@/api/gameAdmin'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/admin/game/GameMetricCard.vue'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'

type IconName = InstanceType<typeof Icon>['$props']['name']
type CheckStatus = 'success' | 'warning' | 'error' | 'inactive'

const appStore = useAppStore()
const loading = ref(false)
const checkedAt = ref<string>('')
const health = ref<GameHealth | null>(null)
const ready = ref<GameReady | null>(null)
const snapshot = ref<GameAdminSnapshot | null>(null)

const checkedAtLabel = computed(() => {
  if (!checkedAt.value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(checkedAt.value))
})

const productionChecks = computed<Array<{
  key: string
  title: string
  description: string
  status: CheckStatus
  label: string
  to?: string
}>>(() => {
  const serviceOk = Boolean(health.value?.ok)
  const readyOk = Boolean(ready.value?.ok)
  const hasChannels = (snapshot.value?.totals.channels ?? 0) > 0
  const hasGames = (snapshot.value?.totals.games ?? 0) > 0
  const hasChannelGames = (snapshot.value?.totals.enabledChannelGames ?? 0) > 0
  const hasBoards = (snapshot.value?.boardConfigs.length ?? 0) > 0
  const hasScenarios = (snapshot.value?.scenarios.length ?? 0) > 0

  return [
    {
      key: 'service',
      title: '游戏服务连接',
      description: '后台必须通过管理代理连接 pragmaticplay-server，生产环境不应依赖 Mock 数据。',
      status: serviceOk && readyOk ? 'success' : serviceOk ? 'warning' : 'error',
      label: serviceOk && readyOk ? '通过' : serviceOk ? '降级' : '失败',
      to: '/admin/game-service',
    },
    {
      key: 'channel-games',
      title: '多渠道多游戏配置',
      description: '每个渠道与游戏需要独立启停、RTP、投注上下限、分成和发布路径。',
      status: hasChannels && hasGames && hasChannelGames ? 'success' : 'warning',
      label: hasChannels && hasGames && hasChannelGames ? '已配置' : '待配置',
      to: '/admin/channel-games',
    },
    {
      key: 'rtp',
      title: 'RTP 与棋盘模板',
      description: '上线前需要至少有可用 RTP 档位、规则和棋盘模板，避免运营只能手写结果 JSON。',
      status: hasBoards ? 'success' : 'warning',
      label: hasBoards ? '已准备' : '缺模板',
      to: '/admin/rtp-control',
    },
    {
      key: 'scenarios',
      title: '结果场景配置',
      description: '场景决定不中奖、中奖、大奖、特殊奖等结果类型，是 RTP 规则的候选池。',
      status: hasScenarios ? 'success' : 'warning',
      label: hasScenarios ? '已加载' : '待配置',
      to: '/admin/scenarios',
    },
    {
      key: 'auth',
      title: '后台鉴权边界',
      description: '管理端使用登录态访问代理接口，游戏服务管理密钥只保存在服务端配置中。',
      status: 'success',
      label: '已隔离',
    },
    {
      key: 'demo',
      title: '非 demo 运行约束',
      description: '生产链路应通过会话 token 启动游戏，Docker 默认使用 Postgres 持久化和 platform 渠道。',
      status: readyOk ? 'success' : 'warning',
      label: readyOk ? '可检查' : '待检查',
    },
  ]
})

const summaryCards = computed(() => [
  {
    title: '渠道',
    value: snapshot.value?.totals.channels ?? 0,
    hint: '运营渠道目录',
  },
  {
    title: '游戏',
    value: snapshot.value?.totals.games ?? 0,
    hint: '游戏目录',
  },
  {
    title: '场景',
    value: snapshot.value?.scenarios.length ?? 0,
    hint: '可被 RTP 选择的结果池',
  },
  {
    title: '最近 Spin',
    value: snapshot.value?.totals.spins ?? 0,
    hint: '注单与局状态记录',
  },
])

const developmentBoundaries: Array<{
  title: string
  description: string
  icon: IconName
}> = [
  {
    title: 'client',
    description: '按游戏分支维护客户端，保留 Pragmatic 兼容解析，同时优先使用语义化 JSON 接口。',
    icon: 'grid',
  },
  {
    title: 'server',
    description: '负责渠道、会话、钱包、局状态、场景、RTP、棋盘和协议适配，不把结果逻辑写死到客户端。',
    icon: 'server',
  },
  {
    title: 'admin',
    description: '只保留游戏运营功能，sub2api 的订阅、API Key、OpenAI 账号和支付模块不作为后台入口。',
    icon: 'cog',
  },
]

async function load() {
  loading.value = true
  try {
    const [healthResult, readyResult, snapshotResult] = await Promise.allSettled([
      gameServiceAPI.getHealth(),
      gameServiceAPI.getReady(),
      loadGameAdminSnapshot(),
    ])

    if (healthResult.status === 'fulfilled') health.value = healthResult.value
    if (readyResult.status === 'fulfilled') ready.value = readyResult.value
    if (snapshotResult.status === 'fulfilled') snapshot.value = snapshotResult.value

    checkedAt.value = new Date().toISOString()

    const firstError = [healthResult, readyResult, snapshotResult].find(result => result.status === 'rejected')
    if (firstError?.status === 'rejected') {
      appStore.showWarning(extractApiErrorMessage(firstError.reason, '部分上线检查加载失败'))
    }
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, '上线设置加载失败'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
