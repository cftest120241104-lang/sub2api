import gameServiceAPI, {
  type GameHealth,
  type GameOpsSummary,
  type GameReady,
  type GameRound,
  type GameSession,
  type PlayerSummary,
} from '@/api/gameService'

export type GameAdminStatus = 'enabled' | 'disabled' | 'maintenance' | 'testing'
export type GameVolatility = 'low' | 'medium' | 'high'

export interface GameAdminChannel {
  code: string
  name: string
  operator: string
  region: string
  currency: string
  status: GameAdminStatus
  settlementCycle: string
  sharePercent: number
  apiMode: 'direct' | 'aggregator' | 'sandbox'
  minBetCents: number
  maxBetCents: number
  dailyLimitCents: number
  lastSyncAt: string
}

export interface GameAdminGame {
  code: string
  name: string
  provider: string
  category: string
  status: GameAdminStatus
  defaultRtp: number
  volatility: GameVolatility
  lines: number
  minBetCents: number
  maxBetCents: number
  releaseVersion: string
  tags: string[]
}

export interface ChannelGameConfig {
  id: string
  channelCode: string
  gameCode: string
  status: GameAdminStatus
  sharePercent: number
  rtp: number
  minBetCents: number
  maxBetCents: number
  jackpotEnabled: boolean
  featureFlags: string[]
  launchPath: string
  updatedAt: string
}

export interface PlayerSessionOverview {
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
  balanceCents: number
  rounds: number
  totalBetCents: number
  totalWinCents: number
  netCents: number
  activeSession: boolean
  lastSeenAt: string
  sessionExpiresAt?: string
}

export interface SpinRecordOverview {
  roundId: string
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
  stakeCents: number
  winCents: number
  netCents: number
  status: string
  scenarioId: string
  createdAt: string
}

export interface ChannelMetric {
  channelCode: string
  channelName: string
  status: GameAdminStatus
  enabledGames: number
  activePlayers: number
  totalBetCents: number
  totalWinCents: number
  netCents: number
  sharePercent: number
}

export interface GameMetric {
  gameCode: string
  gameName: string
  status: GameAdminStatus
  enabledChannels: number
  rounds: number
  totalBetCents: number
  totalWinCents: number
  netCents: number
  rtp: number
}

export interface GameAdminSnapshot {
  generatedAt: string
  service: {
    baseUrl: string
    healthOk: boolean
    readyOk: boolean
    usingMock: boolean
    message: string
  }
  totals: {
    channels: number
    games: number
    enabledChannelGames: number
    players: number
    activeSessions: number
    spins: number
    totalBetCents: number
    totalWinCents: number
    netCents: number
  }
  channels: GameAdminChannel[]
  games: GameAdminGame[]
  configs: ChannelGameConfig[]
  players: PlayerSessionOverview[]
  spins: SpinRecordOverview[]
  channelMetrics: ChannelMetric[]
  gameMetrics: GameMetric[]
}

const CONFIG_STORAGE_KEY = 'game_admin_channel_game_configs_v1'

const mockChannels: GameAdminChannel[] = [
  {
    code: 'demo',
    name: 'Demo 直营网关',
    operator: '自营测试渠道',
    region: 'Global',
    currency: 'USD',
    status: 'enabled',
    settlementCycle: 'T+1',
    sharePercent: 18,
    apiMode: 'sandbox',
    minBetCents: 20,
    maxBetCents: 200000,
    dailyLimitCents: 150000000,
    lastSyncAt: '2026-05-13T08:10:00.000Z',
  },
  {
    code: 'asia',
    name: 'Asia Partner',
    operator: '亚洲代理线',
    region: 'APAC',
    currency: 'USD',
    status: 'enabled',
    settlementCycle: 'weekly',
    sharePercent: 22,
    apiMode: 'aggregator',
    minBetCents: 50,
    maxBetCents: 500000,
    dailyLimitCents: 320000000,
    lastSyncAt: '2026-05-13T07:42:00.000Z',
  },
  {
    code: 'latam',
    name: 'LatAm MXN',
    operator: '拉美渠道',
    region: 'LATAM',
    currency: 'MXN',
    status: 'testing',
    settlementCycle: 'monthly',
    sharePercent: 16,
    apiMode: 'aggregator',
    minBetCents: 100,
    maxBetCents: 800000,
    dailyLimitCents: 210000000,
    lastSyncAt: '2026-05-13T06:18:00.000Z',
  },
  {
    code: 'eu',
    name: 'EU White Label',
    operator: '欧洲白标',
    region: 'EU',
    currency: 'EUR',
    status: 'maintenance',
    settlementCycle: 'T+2',
    sharePercent: 20,
    apiMode: 'direct',
    minBetCents: 20,
    maxBetCents: 250000,
    dailyLimitCents: 180000000,
    lastSyncAt: '2026-05-13T05:50:00.000Z',
  },
]

const mockGames: GameAdminGame[] = [
  {
    code: 'vs10jokerhot',
    name: 'Joker Hot Reels',
    provider: 'Pragmatic Play',
    category: 'Slot',
    status: 'enabled',
    defaultRtp: 96.5,
    volatility: 'medium',
    lines: 20,
    minBetCents: 20,
    maxBetCents: 200000,
    releaseVersion: 'mvp-1.0.3',
    tags: ['hot', 'slot', 'classic'],
  },
  {
    code: 'vs20fruitsw',
    name: 'Sweet Bonanza Lite',
    provider: 'Pragmatic Play',
    category: 'Slot',
    status: 'enabled',
    defaultRtp: 96.48,
    volatility: 'high',
    lines: 20,
    minBetCents: 20,
    maxBetCents: 300000,
    releaseVersion: 'mvp-1.1.0',
    tags: ['feature-buy', 'high-volatility'],
  },
  {
    code: 'vswaysrhino',
    name: 'Rhino Megaways',
    provider: 'Pragmatic Play',
    category: 'Megaways',
    status: 'testing',
    defaultRtp: 95.8,
    volatility: 'high',
    lines: 117649,
    minBetCents: 50,
    maxBetCents: 500000,
    releaseVersion: 'mvp-0.9.6',
    tags: ['megaways', 'staging'],
  },
  {
    code: 'bjma',
    name: 'Blackjack Azure',
    provider: 'Internal Lab',
    category: 'Table',
    status: 'disabled',
    defaultRtp: 99.2,
    volatility: 'low',
    lines: 1,
    minBetCents: 100,
    maxBetCents: 1000000,
    releaseVersion: 'prototype-0.3.0',
    tags: ['table', 'manual-review'],
  },
]

const mockPlayers: PlayerSessionOverview[] = [
  {
    channelCode: 'demo',
    gameCode: 'vs10jokerhot',
    playerId: 'demo-player-1001',
    currency: 'USD',
    balanceCents: 128340,
    rounds: 42,
    totalBetCents: 231000,
    totalWinCents: 218500,
    netCents: 12500,
    activeSession: true,
    lastSeenAt: '2026-05-13T08:42:10.000Z',
    sessionExpiresAt: '2026-05-13T10:42:10.000Z',
  },
  {
    channelCode: 'asia',
    gameCode: 'vs20fruitsw',
    playerId: 'ap-88291',
    currency: 'USD',
    balanceCents: 90450,
    rounds: 18,
    totalBetCents: 189000,
    totalWinCents: 221200,
    netCents: -32200,
    activeSession: true,
    lastSeenAt: '2026-05-13T08:39:42.000Z',
    sessionExpiresAt: '2026-05-13T09:50:00.000Z',
  },
  {
    channelCode: 'latam',
    gameCode: 'vs10jokerhot',
    playerId: 'mx-7780',
    currency: 'MXN',
    balanceCents: 345600,
    rounds: 26,
    totalBetCents: 312000,
    totalWinCents: 241000,
    netCents: 71000,
    activeSession: false,
    lastSeenAt: '2026-05-13T07:58:01.000Z',
  },
  {
    channelCode: 'eu',
    gameCode: 'vswaysrhino',
    playerId: 'eu-preview-12',
    currency: 'EUR',
    balanceCents: 66500,
    rounds: 9,
    totalBetCents: 90000,
    totalWinCents: 82000,
    netCents: 8000,
    activeSession: false,
    lastSeenAt: '2026-05-12T22:18:00.000Z',
  },
]

const mockSpins: SpinRecordOverview[] = [
  {
    roundId: 'round-demo-00042',
    channelCode: 'demo',
    gameCode: 'vs10jokerhot',
    playerId: 'demo-player-1001',
    currency: 'USD',
    stakeCents: 2000,
    winCents: 4500,
    netCents: -2500,
    status: 'COMPLETED',
    scenarioId: 'base-win',
    createdAt: '2026-05-13T08:41:10.000Z',
  },
  {
    roundId: 'round-asia-80218',
    channelCode: 'asia',
    gameCode: 'vs20fruitsw',
    playerId: 'ap-88291',
    currency: 'USD',
    stakeCents: 5000,
    winCents: 0,
    netCents: 5000,
    status: 'COMPLETED',
    scenarioId: 'lose',
    createdAt: '2026-05-13T08:37:02.000Z',
  },
  {
    roundId: 'round-latam-71920',
    channelCode: 'latam',
    gameCode: 'vs10jokerhot',
    playerId: 'mx-7780',
    currency: 'MXN',
    stakeCents: 12000,
    winCents: 3000,
    netCents: 9000,
    status: 'COMPLETED',
    scenarioId: 'near-miss',
    createdAt: '2026-05-13T07:56:22.000Z',
  },
  {
    roundId: 'round-eu-00009',
    channelCode: 'eu',
    gameCode: 'vswaysrhino',
    playerId: 'eu-preview-12',
    currency: 'EUR',
    stakeCents: 10000,
    winCents: 0,
    netCents: 10000,
    status: 'FAILED',
    scenarioId: 'maintenance',
    createdAt: '2026-05-12T22:15:40.000Z',
  },
]

function configId(channelCode: string, gameCode: string): string {
  return `${channelCode}:${gameCode}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getStoredConfigs(): ChannelGameConfig[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as ChannelGameConfig[] : []
  } catch {
    return []
  }
}

function setStoredConfigs(configs: ChannelGameConfig[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs))
}

function defaultConfig(channel: GameAdminChannel, game: GameAdminGame): ChannelGameConfig {
  const disabledForMaintenance = channel.status === 'maintenance' || game.status === 'disabled'
  return {
    id: configId(channel.code, game.code),
    channelCode: channel.code,
    gameCode: game.code,
    status: disabledForMaintenance ? 'disabled' : game.status === 'testing' || channel.status === 'testing' ? 'testing' : 'enabled',
    sharePercent: channel.sharePercent,
    rtp: game.defaultRtp,
    minBetCents: Math.max(channel.minBetCents, game.minBetCents),
    maxBetCents: Math.min(channel.maxBetCents, game.maxBetCents),
    jackpotEnabled: game.volatility === 'high' && channel.status !== 'maintenance',
    featureFlags: game.tags.includes('feature-buy') ? ['featureBuy', 'freeSpin'] : ['baseSpin'],
    launchPath: `/game/${channel.code}/${game.code}`,
    updatedAt: nowIso(),
  }
}

function buildConfigs(channels: GameAdminChannel[], games: GameAdminGame[]): ChannelGameConfig[] {
  const stored = new Map(getStoredConfigs().map(config => [config.id, config]))
  return channels.flatMap(channel =>
    games.map(game => stored.get(configId(channel.code, game.code)) ?? defaultConfig(channel, game))
  )
}

function mergeChannels(summary?: GameOpsSummary): GameAdminChannel[] {
  const byCode = new Map(mockChannels.map(channel => [channel.code, clone(channel)]))
  const codes = uniq([
    ...(summary?.recentSessions ?? []).map(session => session.channelCode),
    ...(summary?.recentRounds ?? []).map(round => round.channelCode),
    ...(summary?.topPlayers ?? []).map(player => player.channelCode),
  ].filter(Boolean))

  for (const code of codes) {
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        name: `${code.toUpperCase()} 渠道`,
        operator: '外部渠道',
        region: 'Unknown',
        currency: summary?.topPlayers.find(player => player.channelCode === code)?.currency ?? 'USD',
        status: 'enabled',
        settlementCycle: 'T+1',
        sharePercent: 18,
        apiMode: 'direct',
        minBetCents: 20,
        maxBetCents: 200000,
        dailyLimitCents: 100000000,
        lastSyncAt: summary?.generatedAt ?? nowIso(),
      })
    }
  }

  return Array.from(byCode.values())
}

function mergeGames(summary?: GameOpsSummary): GameAdminGame[] {
  const byCode = new Map(mockGames.map(game => [game.code, clone(game)]))
  const codes = uniq([
    ...(summary?.games ?? []).map(game => game.gameCode),
    ...(summary?.recentSessions ?? []).map(session => session.gameCode),
    ...(summary?.recentRounds ?? []).map(round => round.gameCode),
    ...(summary?.topPlayers ?? []).map(player => player.gameCode || ''),
  ].filter(Boolean))

  for (const code of codes) {
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        name: code,
        provider: 'Pragmatic Play',
        category: 'Slot',
        status: 'enabled',
        defaultRtp: 96,
        volatility: 'medium',
        lines: 20,
        minBetCents: 20,
        maxBetCents: 200000,
        releaseVersion: 'live',
        tags: ['live'],
      })
    }
  }

  return Array.from(byCode.values())
}

function mapPlayers(summary?: GameOpsSummary): PlayerSessionOverview[] {
  if (!summary?.topPlayers.length) return clone(mockPlayers)
  const sessionKeys = new Map(
    summary.recentSessions.map(session => [
      `${session.channelCode}:${session.gameCode}:${session.playerId}:${session.currency}`,
      session,
    ])
  )

  return summary.topPlayers.map((player: PlayerSummary) => {
    const session = sessionKeys.get(`${player.channelCode}:${player.gameCode || ''}:${player.playerId}:${player.currency}`)
    return {
      channelCode: player.channelCode,
      gameCode: player.gameCode || session?.gameCode || '-',
      playerId: player.playerId,
      currency: player.currency,
      balanceCents: player.balanceCents,
      rounds: player.rounds,
      totalBetCents: player.totalBetCents,
      totalWinCents: player.totalWinCents,
      netCents: player.netCents,
      activeSession: Boolean(session),
      lastSeenAt: player.lastSeenAt || session?.expiresAt || summary.generatedAt,
      sessionExpiresAt: session?.expiresAt,
    }
  })
}

function mapSpins(summary?: GameOpsSummary): SpinRecordOverview[] {
  if (!summary?.recentRounds.length) return clone(mockSpins)
  return summary.recentRounds.map((round: GameRound) => ({
    roundId: round.roundId,
    channelCode: round.channelCode,
    gameCode: round.gameCode,
    playerId: round.playerId,
    currency: round.currency,
    stakeCents: round.stakeCents,
    winCents: round.winCents,
    netCents: round.stakeCents - round.winCents,
    status: round.status,
    scenarioId: round.scenarioId,
    createdAt: round.createdAt,
  }))
}

function toMockSummary(): Pick<GameOpsSummary, 'generatedAt'> {
  return { generatedAt: nowIso() }
}

function buildMetrics(
  channels: GameAdminChannel[],
  games: GameAdminGame[],
  configs: ChannelGameConfig[],
  players: PlayerSessionOverview[],
  spins: SpinRecordOverview[],
): Pick<GameAdminSnapshot, 'totals' | 'channelMetrics' | 'gameMetrics'> {
  const channelMetrics = channels.map((channel) => {
    const channelSpins = spins.filter(spin => spin.channelCode === channel.code)
    return {
      channelCode: channel.code,
      channelName: channel.name,
      status: channel.status,
      enabledGames: configs.filter(config => config.channelCode === channel.code && config.status === 'enabled').length,
      activePlayers: players.filter(player => player.channelCode === channel.code && player.activeSession).length,
      totalBetCents: channelSpins.reduce((sum, spin) => sum + spin.stakeCents, 0),
      totalWinCents: channelSpins.reduce((sum, spin) => sum + spin.winCents, 0),
      netCents: channelSpins.reduce((sum, spin) => sum + spin.netCents, 0),
      sharePercent: channel.sharePercent,
    }
  })

  const gameMetrics = games.map((game) => {
    const gameSpins = spins.filter(spin => spin.gameCode === game.code)
    const gameConfigs = configs.filter(config => config.gameCode === game.code)
    return {
      gameCode: game.code,
      gameName: game.name,
      status: game.status,
      enabledChannels: gameConfigs.filter(config => config.status === 'enabled').length,
      rounds: gameSpins.length,
      totalBetCents: gameSpins.reduce((sum, spin) => sum + spin.stakeCents, 0),
      totalWinCents: gameSpins.reduce((sum, spin) => sum + spin.winCents, 0),
      netCents: gameSpins.reduce((sum, spin) => sum + spin.netCents, 0),
      rtp: gameConfigs.length
        ? Number((gameConfigs.reduce((sum, config) => sum + config.rtp, 0) / gameConfigs.length).toFixed(2))
        : game.defaultRtp,
    }
  })

  return {
    totals: {
      channels: channels.length,
      games: games.length,
      enabledChannelGames: configs.filter(config => config.status === 'enabled').length,
      players: players.length,
      activeSessions: players.filter(player => player.activeSession).length,
      spins: spins.length,
      totalBetCents: spins.reduce((sum, spin) => sum + spin.stakeCents, 0),
      totalWinCents: spins.reduce((sum, spin) => sum + spin.winCents, 0),
      netCents: spins.reduce((sum, spin) => sum + spin.netCents, 0),
    },
    channelMetrics,
    gameMetrics,
  }
}

function buildSnapshot(params: {
  health?: GameHealth
  ready?: GameReady
  summary?: GameOpsSummary
  usingMock: boolean
  message: string
}): GameAdminSnapshot {
  const summary = params.summary ?? toMockSummary()
  const channels = mergeChannels(params.summary)
  const games = mergeGames(params.summary)
  const configs = buildConfigs(channels, games)
  const players = mapPlayers(params.summary)
  const spins = mapSpins(params.summary)
  const metrics = buildMetrics(channels, games, configs, players, spins)

  return {
    generatedAt: summary.generatedAt,
    service: {
      baseUrl: gameServiceAPI.baseUrl,
      healthOk: params.health?.ok ?? !params.usingMock,
      readyOk: params.ready?.ok ?? !params.usingMock,
      usingMock: params.usingMock,
      message: params.message,
    },
    channels,
    games,
    configs,
    players,
    spins,
    ...metrics,
  }
}

export async function loadGameAdminSnapshot(): Promise<GameAdminSnapshot> {
  const [healthResult, readyResult, summaryResult] = await Promise.allSettled([
    gameServiceAPI.getHealth(),
    gameServiceAPI.getReady(),
    gameServiceAPI.getOpsSummary(),
  ])

  const health = healthResult.status === 'fulfilled' ? healthResult.value : undefined
  const ready = readyResult.status === 'fulfilled' ? readyResult.value : undefined

  if (summaryResult.status === 'fulfilled') {
    return buildSnapshot({
      health,
      ready,
      summary: summaryResult.value,
      usingMock: false,
      message: ready?.ok === false ? '游戏服务部分检查未通过，运营数据来自实时接口。' : '运营数据来自游戏服务实时接口。',
    })
  }

  return buildSnapshot({
    health,
    ready,
    usingMock: true,
    message: '未连接游戏服务运营接口，当前展示本地 mock 数据。',
  })
}

export async function saveChannelGameConfig(config: ChannelGameConfig): Promise<ChannelGameConfig> {
  const snapshot = await loadGameAdminSnapshot()
  const updated = { ...config, updatedAt: nowIso() }
  const nextConfigs = snapshot.configs.map(item => item.id === updated.id ? updated : item)
  if (!nextConfigs.some(item => item.id === updated.id)) {
    nextConfigs.push(updated)
  }
  setStoredConfigs(nextConfigs)
  return updated
}

export function resetChannelGameConfigs(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(CONFIG_STORAGE_KEY)
}

export function formatGameMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatGameNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function statusLabel(status: GameAdminStatus | string): string {
  const labels: Record<string, string> = {
    enabled: '已启用',
    disabled: '已停用',
    maintenance: '维护中',
    testing: '灰度测试',
    COMPLETED: '已完成',
    FAILED: '失败',
  }
  return labels[status] ?? status
}

export function statusVariant(status: GameAdminStatus | string): 'success' | 'warning' | 'error' | 'inactive' {
  if (status === 'enabled' || status === 'COMPLETED') return 'success'
  if (status === 'testing' || status === 'maintenance') return 'warning'
  if (status === 'FAILED') return 'error'
  return 'inactive'
}

export function sessionFromGameSession(session: GameSession): PlayerSessionOverview {
  return {
    channelCode: session.channelCode,
    gameCode: session.gameCode,
    playerId: session.playerId,
    currency: session.currency,
    balanceCents: 0,
    rounds: 0,
    totalBetCents: 0,
    totalWinCents: 0,
    netCents: 0,
    activeSession: true,
    lastSeenAt: nowIso(),
    sessionExpiresAt: session.expiresAt,
  }
}
