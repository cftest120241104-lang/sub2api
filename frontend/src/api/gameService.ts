/**
 * 游戏服务 API 客户端。
 *
 * 该客户端直连 pragmaticplay_games/server，不复用 Sub2API 的 /api/v1
 * 鉴权拦截器，因为游戏服务返回普通 JSON 或 Pragmatic 表单协议文本。
 */
import axios, { type AxiosInstance } from 'axios'

const DEFAULT_GAME_SERVICE_BASE_URL = 'http://127.0.0.1:3100'
const GAME_SERVICE_BASE_URL = (
  import.meta.env.VITE_GAME_SERVICE_BASE_URL || DEFAULT_GAME_SERVICE_BASE_URL
).replace(/\/+$/, '')

const gameServiceClient: AxiosInstance = axios.create({
  baseURL: GAME_SERVICE_BASE_URL,
  timeout: 15000,
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

export async function getSecondStageModules(): Promise<SecondStageModule[]> {
  const { data } = await gameServiceClient.get<SecondStageModule[]>('/admin/ops/second-stage')
  return data
}

export async function getSecondStageContract(endpoint: string): Promise<SecondStageContract> {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const { data } = await gameServiceClient.get<SecondStageContract>(normalized)
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
  getSecondStageModules,
  getSecondStageContract,
  exportOpsCsv,
}

export default gameServiceAPI
