import gameServiceAPI, {
  type GameOpsSummary,
  type GameRound,
  type GameSession,
  type GameScenarioDefinition,
  type GameBoardConfig,
  type OpsChannelCatalogItem,
  type OpsChannelGameConfig,
  type OpsGameCatalogItem,
  type PlayerSummary,
} from '@/api/gameService'

export type GameAdminStatus = 'enabled' | 'disabled' | 'maintenance' | 'testing'
export type GameVolatility = 'low' | 'medium' | 'high'
export type GameAdminChannel = OpsChannelCatalogItem
export type GameAdminGame = OpsGameCatalogItem
export type ChannelGameConfig = OpsChannelGameConfig
export type ScenarioConfig = GameScenarioDefinition & {
  gameCode: string
}
export type BoardConfig = GameBoardConfig

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
  scenarios: ScenarioConfig[]
  boardConfigs: BoardConfig[]
  players: PlayerSessionOverview[]
  spins: SpinRecordOverview[]
  channelMetrics: ChannelMetric[]
  gameMetrics: GameMetric[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function mapPlayers(summary: GameOpsSummary): PlayerSessionOverview[] {
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

function mapSpins(summary: GameOpsSummary): SpinRecordOverview[] {
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

export async function loadGameAdminSnapshot(): Promise<GameAdminSnapshot> {
  const [health, ready, summary, channels, games, configs, boardConfigs] = await Promise.all([
    gameServiceAPI.getHealth(),
    gameServiceAPI.getReady(),
    gameServiceAPI.getOpsSummary(),
    gameServiceAPI.getChannels(),
    gameServiceAPI.getGames(),
    gameServiceAPI.getChannelGameConfigs(),
    gameServiceAPI.getBoardConfigs(),
  ])
  const players = mapPlayers(summary)
  const spins = mapSpins(summary)
  const scenarios = (await Promise.all(
    games.map(async (game) => {
      const gameScenarios = await gameServiceAPI.getScenarioConfigs(game.code)
      return gameScenarios.map(scenario => ({ ...scenario, gameCode: game.code }))
    })
  )).flat()
  const metrics = buildMetrics(channels, games, configs, players, spins)

  return {
    generatedAt: summary.generatedAt,
    service: {
      baseUrl: gameServiceAPI.baseUrl,
      healthOk: health.ok,
      readyOk: ready.ok,
      usingMock: false,
      message: ready.ok ? '运营数据来自游戏服务实时接口。' : '游戏服务部分检查未通过，运营数据来自实时接口。',
    },
    channels,
    games,
    configs,
    scenarios,
    boardConfigs,
    players,
    spins,
    ...metrics,
  }
}

export async function saveChannelGameConfig(config: ChannelGameConfig): Promise<ChannelGameConfig> {
  return gameServiceAPI.saveChannelGameConfig(config)
}

export async function saveScenarioConfig(gameCode: string, config: Partial<ScenarioConfig>): Promise<ScenarioConfig> {
  const saved = await gameServiceAPI.saveScenarioConfig(gameCode, config)
  return { ...saved, gameCode }
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
    CREATED: '已创建',
    RESULT_READY: '待收分',
    COLLECTED: '已收分',
  }
  return labels[status] ?? status
}

export function statusVariant(status: GameAdminStatus | string): 'success' | 'warning' | 'error' | 'inactive' {
  if (status === 'enabled' || status === 'COMPLETED' || status === 'COLLECTED') return 'success'
  if (status === 'testing' || status === 'maintenance' || status === 'RESULT_READY') return 'warning'
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
