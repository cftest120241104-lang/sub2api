# 游戏后台适配说明

`admin` 以 `Wei-Shaw/sub2api` 为底层保留原有 Go + Vue + PostgreSQL + Redis 管理能力，并在前端增加“游戏服务”入口，用来对接当前仓库的 `server`。

## 当前适配范围

- 新增管理员菜单：`游戏服务`
- 直连 `pragmaticplay_games/server` 的健康检查：`/health`、`/ready`
- 创建测试游戏会话：`POST /sessions`
- 查看和切换 GM 场景：`GET/POST /gm/scenario`
- 执行 Pragmatic 协议测试：`doInit`、`doSpin`、`doCollect`

## 配置

前端通过 `VITE_GAME_SERVICE_BASE_URL` 指向游戏服务，默认值为：

```bash
VITE_GAME_SERVICE_BASE_URL=http://127.0.0.1:3100
```

开发环境如果 `server` 已通过 Docker Desktop 映射到宿主机 `3100` 端口，可以直接使用默认值。

生产环境如果后台域名和游戏服务域名不同，需要在 `server` 的 `CORS_ORIGINS` 中同时加入游戏客户端域名和后台域名，例如：

```bash
CORS_ORIGINS=https://game.example.com,https://admin.example.com
```

## 后续改造方向

- 将游戏服务配置持久化到 sub2api 后端，由管理员在系统设置中维护。
- 增加 `server` 侧的后台专用只读/操作 API，避免长期依赖浏览器直连。
- 把玩家会话、局记录、审计事件做成后台列表页。
- 多游戏分支接入后，增加游戏目录、版本和发布状态管理。
