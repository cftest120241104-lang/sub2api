# 游戏运营后台功能范围

本文档定义 `admin` 基于 sub2api 底座改造后的游戏运营后台范围。后台入口为 `/admin/game-service`，直连 `pragmaticplay_games/server`。

## MVP

1. 服务健康与就绪检查
   - 展示 `/health`、`/ready` 的状态。
   - 展示 Postgres、Redis 检查结果。

2. 游戏与会话管理
   - 展示已注册游戏数量与当前活跃会话。
   - 可创建测试会话，用于联调客户端、服务端和 GM。

3. 玩家概览
   - 按 `channelCode + playerId + currency` 汇总玩家。
   - 展示余额、局数、总下注、总派彩、平台净额和最近活跃时间。

4. 注单回合
   - 展示最近局记录、状态、下注、派彩、场景和玩家。
   - 用于核对 spin/collect 流程是否落库。

5. 钱包流水
   - 展示 DEBIT、CREDIT、REFUND 流水。
   - 展示交易金额和交易后余额。

6. GM 调试
   - 可读取当前玩家场景。
   - 可切换游戏场景。
   - 切换行为写入审计日志。

7. 协议联调
   - 支持 `doInit`、`doSpin`、`doCollect`。
   - 展示 Pragmatic 表单协议返回字段。

8. 审计日志
   - 展示最近审计事件。
   - 覆盖会话创建、GM 切换等后台/服务端关键行为。

9. 报表导出
   - 支持导出玩家汇总与最近注单 CSV。
   - 接口为 `/admin/ops/export.csv`。

10. 基础配置可视化
   - 展示服务地址、注册游戏、场景数量和运行状态。
   - 后续渠道、游戏启停配置在第二阶段细化。

## 第二阶段

第二阶段先落入口和接口契约，避免后台页面只有口头规划。每个模块需继续补真实表结构、权限、操作审计和验证。

1. 风控策略
   - 契约接口：`/admin/ops/risk-rules`、`/admin/ops/risk-events`
   - 验收：可配置玩家/渠道限额；异常局进入事件列表；命中策略写审计。

2. 多游戏分支与灰度
   - 契约接口：`/admin/ops/game-branches`、`/admin/ops/release-plans`
   - 验收：每个 `gameCode` 有版本清单；渠道可绑定灰度版本；回滚可审计。

3. 活动与任务
   - 契约接口：`/admin/ops/campaigns`、`/admin/ops/rewards`
   - 验收：活动有时间窗和预算；奖励发放进入钱包流水；活动效果可报表化。

4. 代理与多租户
   - 契约接口：`/admin/ops/tenants`、`/admin/ops/channel-settlement`
   - 验收：数据按租户隔离；代理只能看自己的玩家和报表；结算报表可导出。

5. 告警与值班
   - 契约接口：`/admin/ops/alert-rules`、`/admin/ops/alert-events`
   - 验收：告警规则可启停；事件包含等级和处置状态；支持 webhook/邮件扩展。

## 当前实现证据

- `server/src/modules/admin/admin-ops.controller.ts`
  - `/admin/ops/summary`
  - `/admin/ops/players`
  - `/admin/ops/second-stage`
  - `/admin/ops/risk-rules`、`/admin/ops/risk-events`
  - `/admin/ops/game-branches`、`/admin/ops/release-plans`
  - `/admin/ops/campaigns`、`/admin/ops/rewards`
  - `/admin/ops/tenants`、`/admin/ops/channel-settlement`
  - `/admin/ops/alert-rules`、`/admin/ops/alert-events`
  - `/admin/ops/export.csv`
- `admin/frontend/src/api/gameService.ts`
  - 游戏运营接口客户端和 TypeScript 类型。
- `admin/frontend/src/views/admin/GameServiceView.vue`
  - 游戏运营中心页面。
  - 第二阶段模块 endpoint 可点击查看当前契约响应。
