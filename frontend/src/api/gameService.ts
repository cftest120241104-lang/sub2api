/**
 * 游戏服务 API 客户端。
 *
 * 该客户端直连 pragmaticplay_games/server，不复用 Sub2API 的 /api/v1
 * 鉴权拦截器，因为游戏服务返回普通 JSON 或 Pragmatic 表单协议文本。
 */
import axios, { type AxiosInstance } from 'axios'

const DEFAULT_GAME_SERVICE_BASE_URL = '/api/v1/admin/game-service'
const GAME_SERVICE_BASE_URL = (
  import.meta.env.VITE_GAME_SERVICE_PROXY_BASE_URL ||
  import.meta.env.VITE_GAME_SERVICE_BASE_URL ||
  DEFAULT_GAME_SERVICE_BASE_URL
).replace(/\/+$/, '')

const gameServiceClient: AxiosInstance = axios.create({
  baseURL: GAME_SERVICE_BASE_URL,
  timeout: 15000,
})

gameServiceClient.interceptors.request.use((config) => {
  if (GAME_SERVICE_BASE_URL.startsWith('/')) {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export interface GameHealth {
  ok: boolean
  service: string
  time: string
}

export interface GameReady extends GameHealth {
  checks: Record<string, { ok: boolean; error?: string }>
}

export interface GameSession {
  token: string
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
  expiresAt: string
}

export interface GameScenario {
  id: string
  label: string
  description: string
  outcomeType?: string
  payoutMultiplier?: number
  nextStep?: string
  requiresCollect?: boolean
  enabled?: boolean
}

export interface GmScenarioState {
  current: string
  channelCode: string
  gameCode: string
  playerId: string
  scenarios: GameScenario[]
}

export interface GameRound {
  roundId: string
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
  stakeCents: number
  winCents: number
  status: string
  scenarioId: string
  rawResult: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface LedgerTransaction {
  txId: string
  channelCode: string
  playerId: string
  currency: string
  roundId: string
  type: 'DEBIT' | 'CREDIT' | 'REFUND'
  amountCents: number
  balanceAfterCents: number
  createdAt: string
}

export interface AuditEvent {
  id?: number
  channelCode?: string
  gameCode?: string
  playerId?: string
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface PlayerSummary {
  channelCode: string
  gameCode?: string
  playerId: string
  currency: string
  balanceCents: number
  rounds: number
  totalBetCents: number
  totalWinCents: number
  netCents: number
  lastSeenAt?: string
}

export interface SecondStageModule {
  key: string
  title: string
  status: 'planned' | 'contract-ready' | 'mvp-ready'
  description: string
  endpoints: string[]
  acceptance: string[]
}

export interface SecondStageContract {
  generatedAt: string
  module: SecondStageModule
  status: SecondStageModule['status']
  data: Record<string, unknown>
  nextActions: string[]
}

export interface OpsRiskRule {
  id: string
  name: string
  scope: string
  metric: string
  thresholdCents?: number
  thresholdCount?: number
  action: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsRiskEvent {
  id: string
  ruleId: string
  severity: string
  channelCode?: string
  gameCode?: string
  playerId?: string
  roundId?: string
  message: string
  status: string
  payload: Record<string, unknown>
  createdAt: string
  resolvedAt?: string
}

export interface OpsGameBranch {
  id: string
  gameCode: string
  version: string
  status: string
  rolloutPercent: number
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsReleasePlan {
  id: string
  channelCode: string
  gameCode: string
  targetVersion: string
  rolloutPercent: number
  rollbackVersion?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface OpsCampaign {
  id: string
  name: string
  type: string
  status: string
  budgetCents: number
  startsAt?: string
  endsAt?: string
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsReward {
  id: string
  campaignId: string
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
  amountCents: number
  ledgerTxId?: string
  status: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface OpsTenant {
  id: string
  name: string
  status: string
  channelCodes: string[]
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface OpsChannelSettlement {
  id: string
  tenantId: string
  channelCode: string
  period: string
  totalBetCents: number
  totalWinCents: number
  netCents: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface OpsAlertRule {
  id: string
  name: string
  source: string
  severity: string
  condition: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsAlertEvent {
  id: string
  ruleId: string
  source: string
  severity: string
  message: string
  status: string
  payload: Record<string, unknown>
  createdAt: string
  resolvedAt?: string
}

export interface SecondStageSnapshot {
  riskRules: OpsRiskRule[]
  riskEvents: OpsRiskEvent[]
  gameBranches: OpsGameBranch[]
  releasePlans: OpsReleasePlan[]
  campaigns: OpsCampaign[]
  rewards: OpsReward[]
  tenants: OpsTenant[]
  settlements: OpsChannelSettlement[]
  alertRules: OpsAlertRule[]
  alertEvents: OpsAlertEvent[]
}

export interface GameOpsSummary {
  generatedAt: string
  totals: {
    games: number
    sessions: number
    activeSessions: number
    players: number
    rounds: number
    totalBetCents: number
    totalWinCents: number
    netCents: number
    transactions: number
    auditEvents: number
  }
  games: Array<{
    gameCode: string
    scenarios: number
  }>
  recentSessions: Array<GameSession & { id?: string; createdAt?: string }>
  recentRounds: GameRound[]
  recentTransactions: LedgerTransaction[]
  recentAuditEvents: AuditEvent[]
  topPlayers: PlayerSummary[]
  secondStage: SecondStageModule[]
}

export interface GameScenarioDefinition extends GameScenario {
  outcomeType: 'noWin' | 'lineWin' | 'bigWin' | 'specialWin' | 'jackpot'
  payoutMultiplier: number
  nextStep: 'idle' | 'collect' | 'bonus' | 'freeSpinBonus'
  screen: {
    rows: number
    columns: number
    symbols: number[]
    symbolsAbove: number[]
    symbolsBelow: number[]
  } | Array<{
    rows: number
    columns: number
    symbols: number[]
    symbolsAbove: number[]
    symbolsBelow: number[]
  }>
  lineWins?: Array<{
    lineIndex: number
    payoutMultiplier: number
    positions: number[]
  }>
  jackpotLevel?: number
  enabled: boolean
}

export interface GameReelScreen {
  rows: number
  columns: number
  symbols: number[]
  symbolsAbove: number[]
  symbolsBelow: number[]
}

export interface GameBoardConfig {
  gameCode: string
  boardId: string
  label: string
  description: string
  screen: GameReelScreen
  tags: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RtpProfile {
  profileId: string
  label: string
  description: string
  targetRtpPermille: number
  tolerancePermille: number
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RtpScenarioWeight {
  scenarioId: string
  weight: number
  boardId?: string
  minRtpGapPermille?: number
  maxRtpGapPermille?: number
}

export type RtpStatsWindow = 'lifetime' | 'daily' | 'hourly'

export interface RtpRule {
  ruleId: string
  label: string
  priority: number
  channelCode?: string
  gameCode?: string
  currency?: string
  playerSegment: string
  deviceType?: string
  countryCode?: string
  regionCode?: string
  vipLevel?: string
  campaignId?: string
  trafficSource?: string
  minBetCents?: number
  maxBetCents?: number
  minBalanceCents?: number
  maxBalanceCents?: number
  activeFrom?: string
  activeUntil?: string
  profileId?: string
  targetRtpPermille?: number
  tolerancePermille?: number
  boardId?: string
  statsWindow: RtpStatsWindow
  scenarioWeights: RtpScenarioWeight[]
  conditions: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RtpRuntimeStats {
  channelCode: string
  gameCode: string
  profileId: string
  ruleId: string
  playerSegment: string
  currency: string
  deviceType?: string
  countryCode?: string
  vipLevel?: string
  campaignId?: string
  trafficSource?: string
  statsWindow: RtpStatsWindow
  statsPeriod: string
  bucketKey: string
  rounds: number
  totalBetCents: number
  totalWinCents: number
  actualRtpPermille: number
  createdAt: string
  updatedAt: string
}

export interface RtpControlOverview {
  profiles: RtpProfile[]
  rules: RtpRule[]
  boardConfigs: GameBoardConfig[]
  runtimeStats: RtpRuntimeStats[]
}

export interface OpsChannelCatalogItem {
  code: string
  name: string
  walletMode: 'internal' | 'seamless'
  enabled: boolean
  status: 'enabled' | 'disabled' | 'maintenance' | 'testing'
  operator: string
  region: string
  currency: string
  settlementCycle: string
  sharePercent: number
  apiMode: 'direct' | 'aggregator' | 'sandbox'
  minBetCents: number
  maxBetCents: number
  dailyLimitCents: number
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsGameCatalogItem {
  code: string
  name: string
  protocol: string
  enabled: boolean
  status: 'enabled' | 'disabled' | 'maintenance' | 'testing'
  provider: string
  category: string
  defaultRtp: number
  volatility: 'low' | 'medium' | 'high'
  lines: number
  minBetCents: number
  maxBetCents: number
  releaseVersion: string
  tags: string[]
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OpsChannelGameConfig {
  id: string
  channelCode: string
  gameCode: string
  enabled: boolean
  status: 'enabled' | 'disabled' | 'maintenance' | 'testing'
  sharePercent: number
  rtp: number
  minBetCents: number
  maxBetCents: number
  jackpotEnabled: boolean
  featureFlags: string[]
  launchPath: string
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateGameSessionParams {
  channelCode: string
  gameCode: string
  playerId: string
  currency: string
}

export interface ScenarioScope {
  token: string
  gameCode: string
}

export interface SpinParams extends ScenarioScope {
  coin: string
  lines: number
  roundId: string
}

export type ProtocolPayload = Record<string, string>

function toProtocolPayload(raw: string): ProtocolPayload {
  return Object.fromEntries(new URLSearchParams(raw).entries())
}

function toFormBody(fields: Record<string, string | number>): URLSearchParams {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, String(value))
  }
  return body
}

async function postProtocol(path: string, fields: Record<string, string | number>): Promise<ProtocolPayload> {
  const { data } = await gameServiceClient.post<string>(path, toFormBody(fields), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
  })
  return toProtocolPayload(data)
}

export async function getHealth(): Promise<GameHealth> {
  const { data } = await gameServiceClient.get<GameHealth>('/health')
  return data
}

export async function getReady(): Promise<GameReady> {
  const { data } = await gameServiceClient.get<GameReady>('/ready')
  return data
}

export async function createSession(params: CreateGameSessionParams): Promise<GameSession> {
  const { data } = await gameServiceClient.post<GameSession>('/sessions', params)
  return data
}

export async function getScenario(scope: ScenarioScope): Promise<GmScenarioState> {
  const { data } = await gameServiceClient.get<GmScenarioState>('/gm/scenario', {
    params: {
      token: scope.token,
      symbol: scope.gameCode,
    },
  })
  return data
}

export async function setScenario(scope: ScenarioScope, scenario: string): Promise<GmScenarioState> {
  const { data } = await gameServiceClient.post<GmScenarioState>(
    '/gm/scenario',
    toFormBody({
      token: scope.token,
      symbol: scope.gameCode,
      scenario,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  return data
}

export async function initGame(scope: ScenarioScope): Promise<ProtocolPayload> {
  return postProtocol('/gs2c/ge/v3/gameService', {
    action: 'doInit',
    token: scope.token,
    symbol: scope.gameCode,
  })
}

export async function spinGame(params: SpinParams): Promise<ProtocolPayload> {
  return postProtocol('/gs2c/ge/v3/gameService', {
    action: 'doSpin',
    token: params.token,
    symbol: params.gameCode,
    c: params.coin,
    l: params.lines,
    roundId: params.roundId,
  })
}

export async function collectGame(scope: ScenarioScope): Promise<ProtocolPayload> {
  return postProtocol('/gs2c/ge/v3/gameService', {
    action: 'doCollect',
    token: scope.token,
    symbol: scope.gameCode,
  })
}

export async function getOpsSummary(): Promise<GameOpsSummary> {
  const { data } = await gameServiceClient.get<GameOpsSummary>('/admin/ops/summary')
  return data
}

export async function getPlayers(): Promise<PlayerSummary[]> {
  const { data } = await gameServiceClient.get<PlayerSummary[]>('/admin/ops/players')
  return data
}

export async function getChannels(): Promise<OpsChannelCatalogItem[]> {
  const { data } = await gameServiceClient.get<OpsChannelCatalogItem[]>('/admin/ops/channels')
  return data
}

export async function getGames(): Promise<OpsGameCatalogItem[]> {
  const { data } = await gameServiceClient.get<OpsGameCatalogItem[]>('/admin/ops/games')
  return data
}

export async function getChannelGameConfigs(): Promise<OpsChannelGameConfig[]> {
  const { data } = await gameServiceClient.get<OpsChannelGameConfig[]>('/admin/ops/channel-games')
  return data
}

export async function saveChannelGameConfig(payload: Partial<OpsChannelGameConfig>): Promise<OpsChannelGameConfig> {
  const { data } = await gameServiceClient.post<OpsChannelGameConfig>('/admin/ops/channel-games', payload)
  return data
}

export async function getScenarioConfigs(gameCode: string): Promise<GameScenarioDefinition[]> {
  const { data } = await gameServiceClient.get<GameScenarioDefinition[]>(`/admin/ops/games/${gameCode}/scenario-configs`)
  return data
}

export async function saveScenarioConfig(gameCode: string, payload: Partial<GameScenarioDefinition>): Promise<GameScenarioDefinition> {
  const { data } = await gameServiceClient.post<GameScenarioDefinition>(`/admin/ops/games/${gameCode}/scenario-configs`, payload)
  return data
}

export async function getRtpControlOverview(): Promise<RtpControlOverview> {
  const { data } = await gameServiceClient.get<RtpControlOverview>('/admin/ops/rtp-control')
  return data
}

export async function getBoardConfigs(gameCode?: string): Promise<GameBoardConfig[]> {
  const path = gameCode ? `/admin/ops/games/${gameCode}/board-configs` : '/admin/ops/board-configs'
  const { data } = await gameServiceClient.get<GameBoardConfig[]>(path)
  return data
}

export async function saveBoardConfig(payload: Partial<GameBoardConfig>): Promise<GameBoardConfig> {
  const { data } = await gameServiceClient.post<GameBoardConfig>('/admin/ops/board-configs', payload)
  return data
}

export async function getRtpProfiles(): Promise<RtpProfile[]> {
  const { data } = await gameServiceClient.get<RtpProfile[]>('/admin/ops/rtp-profiles')
  return data
}

export async function saveRtpProfile(payload: Partial<RtpProfile>): Promise<RtpProfile> {
  const { data } = await gameServiceClient.post<RtpProfile>('/admin/ops/rtp-profiles', payload)
  return data
}

export async function getRtpRules(): Promise<RtpRule[]> {
  const { data } = await gameServiceClient.get<RtpRule[]>('/admin/ops/rtp-rules')
  return data
}

export async function saveRtpRule(payload: Partial<RtpRule>): Promise<RtpRule> {
  const { data } = await gameServiceClient.post<RtpRule>('/admin/ops/rtp-rules', payload)
  return data
}

export async function getRtpRuntimeStats(): Promise<RtpRuntimeStats[]> {
  const { data } = await gameServiceClient.get<RtpRuntimeStats[]>('/admin/ops/rtp-runtime-stats')
  return data
}

export async function getSecondStageModules(): Promise<SecondStageModule[]> {
  const { data } = await gameServiceClient.get<SecondStageModule[]>('/admin/ops/second-stage')
  return data
}

export async function getSecondStageContract(endpoint: string): Promise<SecondStageContract> {
  const normalized = endpoint.startsWith('/admin/ops/second-stage')
    ? endpoint
    : endpoint.startsWith('/admin/ops/')
      ? endpoint.replace('/admin/ops/', '/admin/ops/second-stage/')
      : endpoint.startsWith('/')
        ? endpoint
        : `/admin/ops/second-stage/${endpoint}`
  const { data } = await gameServiceClient.get<SecondStageContract>(normalized)
  return data
}

export async function getSecondStageSnapshot(): Promise<SecondStageSnapshot> {
  const [
    riskRules,
    riskEvents,
    gameBranches,
    releasePlans,
    campaigns,
    rewards,
    tenants,
    settlements,
    alertRules,
    alertEvents,
  ] = await Promise.all([
    gameServiceClient.get<OpsRiskRule[]>('/admin/ops/risk-rules'),
    gameServiceClient.get<OpsRiskEvent[]>('/admin/ops/risk-events'),
    gameServiceClient.get<OpsGameBranch[]>('/admin/ops/game-branches'),
    gameServiceClient.get<OpsReleasePlan[]>('/admin/ops/release-plans'),
    gameServiceClient.get<OpsCampaign[]>('/admin/ops/campaigns'),
    gameServiceClient.get<OpsReward[]>('/admin/ops/rewards'),
    gameServiceClient.get<OpsTenant[]>('/admin/ops/tenants'),
    gameServiceClient.get<OpsChannelSettlement[]>('/admin/ops/channel-settlement'),
    gameServiceClient.get<OpsAlertRule[]>('/admin/ops/alert-rules'),
    gameServiceClient.get<OpsAlertEvent[]>('/admin/ops/alert-events'),
  ])
  return {
    riskRules: riskRules.data,
    riskEvents: riskEvents.data,
    gameBranches: gameBranches.data,
    releasePlans: releasePlans.data,
    campaigns: campaigns.data,
    rewards: rewards.data,
    tenants: tenants.data,
    settlements: settlements.data,
    alertRules: alertRules.data,
    alertEvents: alertEvents.data,
  }
}

export async function createRiskRule(payload: Partial<OpsRiskRule>): Promise<OpsRiskRule> {
  const { data } = await gameServiceClient.post<OpsRiskRule>('/admin/ops/risk-rules', payload)
  return data
}

export async function createRiskEvent(payload: Partial<OpsRiskEvent>): Promise<OpsRiskEvent> {
  const { data } = await gameServiceClient.post<OpsRiskEvent>('/admin/ops/risk-events', payload)
  return data
}

export async function resolveRiskEvent(id: string, status = 'resolved'): Promise<OpsRiskEvent> {
  const { data } = await gameServiceClient.patch<OpsRiskEvent>(`/admin/ops/risk-events/${id}`, { status })
  return data
}

export async function createGameBranch(payload: Partial<OpsGameBranch>): Promise<OpsGameBranch> {
  const { data } = await gameServiceClient.post<OpsGameBranch>('/admin/ops/game-branches', payload)
  return data
}

export async function createReleasePlan(payload: Partial<OpsReleasePlan>): Promise<OpsReleasePlan> {
  const { data } = await gameServiceClient.post<OpsReleasePlan>('/admin/ops/release-plans', payload)
  return data
}

export async function updateReleasePlan(id: string, status = 'active'): Promise<OpsReleasePlan> {
  const { data } = await gameServiceClient.patch<OpsReleasePlan>(`/admin/ops/release-plans/${id}`, { status })
  return data
}

export async function createCampaign(payload: Partial<OpsCampaign>): Promise<OpsCampaign> {
  const { data } = await gameServiceClient.post<OpsCampaign>('/admin/ops/campaigns', payload)
  return data
}

export async function grantReward(payload: Partial<OpsReward>): Promise<OpsReward> {
  const { data } = await gameServiceClient.post<OpsReward>('/admin/ops/rewards', payload)
  return data
}

export async function createTenant(payload: Partial<OpsTenant>): Promise<OpsTenant> {
  const { data } = await gameServiceClient.post<OpsTenant>('/admin/ops/tenants', payload)
  return data
}

export async function generateSettlement(payload: Partial<OpsChannelSettlement>): Promise<OpsChannelSettlement> {
  const { data } = await gameServiceClient.post<OpsChannelSettlement>('/admin/ops/channel-settlement', payload)
  return data
}

export async function createAlertRule(payload: Partial<OpsAlertRule>): Promise<OpsAlertRule> {
  const { data } = await gameServiceClient.post<OpsAlertRule>('/admin/ops/alert-rules', payload)
  return data
}

export async function createAlertEvent(payload: Partial<OpsAlertEvent>): Promise<OpsAlertEvent> {
  const { data } = await gameServiceClient.post<OpsAlertEvent>('/admin/ops/alert-events', payload)
  return data
}

export async function resolveAlertEvent(id: string, status = 'resolved'): Promise<OpsAlertEvent> {
  const { data } = await gameServiceClient.patch<OpsAlertEvent>(`/admin/ops/alert-events/${id}`, { status })
  return data
}

export async function exportOpsCsv(): Promise<Blob> {
  const { data } = await gameServiceClient.get<Blob>('/admin/ops/export.csv', {
    responseType: 'blob',
  })
  return data
}

export const gameServiceAPI = {
  baseUrl: GAME_SERVICE_BASE_URL,
  getHealth,
  getReady,
  createSession,
  getScenario,
  setScenario,
  initGame,
  spinGame,
  collectGame,
  getOpsSummary,
  getPlayers,
  getChannels,
  getGames,
  getChannelGameConfigs,
  saveChannelGameConfig,
  getScenarioConfigs,
  saveScenarioConfig,
  getRtpControlOverview,
  getBoardConfigs,
  saveBoardConfig,
  getRtpProfiles,
  saveRtpProfile,
  getRtpRules,
  saveRtpRule,
  getRtpRuntimeStats,
  getSecondStageModules,
  getSecondStageContract,
  getSecondStageSnapshot,
  createRiskRule,
  createRiskEvent,
  resolveRiskEvent,
  createGameBranch,
  createReleasePlan,
  updateReleasePlan,
  createCampaign,
  grantReward,
  createTenant,
  generateSettlement,
  createAlertRule,
  createAlertEvent,
  resolveAlertEvent,
  exportOpsCsv,
}

export default gameServiceAPI
