# Images Sync-via-Async (方案 B)

## What it does

When `gateway.images_sync_via_async` is **true** and `image_storage` is enabled:

1. Client still calls **sync** APIs used by Codex imagegen:
   - `POST /v1/images/generations`
   - `POST /v1/images/edits`
2. Sub2API internally:
   - creates an `imgtask_*` record
   - runs the same worker path as `/images/generations/async`
   - offloads the result to S3/R2 when configured
   - **blocks** the original HTTP request until completion
3. Response is still a normal Images JSON body (`data[].url` after R2 rewrite), so Codex keeps placeholder UI.

Optional JSON whitespace keepalive (`gateway.image_nonstream_keepalive_interval`) keeps long waits from being cut by proxies.

## Config

```yaml
image_storage:
  enabled: true
  # ... S3/R2 credentials ...

gateway:
  images_sync_via_async: true
  image_nonstream_keepalive_interval: 15   # 5-60, or 0 to disable
  image_stream_data_interval_timeout: 900
  image_stream_keepalive_interval: 10
  response_header_timeout: 600
```

## Keeping up with upstream

This change lives as a **small, isolated patch** on top of [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api):

| File | Change |
|------|--------|
| `config.go` | `ImagesSyncViaAsync` flag + default |
| `image_task_handler.go` | `ShouldSyncViaAsync`, `SubmitAndWait` |
| `routes/gateway.go` | route images through SubmitAndWait when enabled |
| `wire_gen.go` | pass `cfg` into `NewAsyncImageHandler` |

### 推荐部署模式：开发机构建 → 推韩国中转机

中转**一直跑在服务器**（如 `evoxt-kr` / `token.happyai.icu`）。  
开发机只做：跟官方 rebase + 打带定制的镜像，再推到服务器。

```text
官方 tag  →  开发机 rebase-and-build  →  push-image-to-server  →  韩国机 docker load / compose up
```

#### 1) 开发机：跟官方 + 打镜像

```bash
# 跟官方最新 v* tag：备份分支 → fetch → rebase → 打镜像
./deploy/patches/rebase-and-build.sh

# 钉某个官方版本
./deploy/patches/rebase-and-build.sh v0.1.161

# rebase 成功后 force-with-lease 推 fork（可选）
./deploy/patches/rebase-and-build.sh v0.1.161 --push

# 已 rebase 好，只构建
./deploy/patches/rebase-and-build.sh --build-only
```

产物镜像示例：

- `sub2api:0.1.161-sync-via-async`（带版本）
- `sub2api:sync-via-async`（稳定别名，方便 compose）

#### 2) 开发机：推到韩国中转机

默认 SSH Host：`evoxt-kr`（见本机 `~/.ssh/config`）。

```bash
# 只 load 镜像，不重启（先安全传包）
./deploy/patches/push-image-to-server.sh sub2api:0.1.161-sync-via-async

# 确认 compose 的 image= 后，再切换运行中的中转
./deploy/patches/push-image-to-server.sh sub2api:0.1.161-sync-via-async \
  --compose-dir /服务器上的/compose目录 --up
```

#### 3) 验收（以服务器中转为准）

```bash
curl -sS https://token.happyai.icu/api/v1/settings/public \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"].get("version"))'
# 期望: 0.1.161-sync-via-async
```

服务器配置保持：

```yaml
gateway:
  images_sync_via_async: true
```

**不要**用管理后台「立即更新」：那会下官方 release 二进制，冲掉 fork 定制。

`rebase-and-build.sh` 失败时会 `rebase --abort` 并保留 `backup/pre-rebase-...` 分支。

### Rebase workflow（手工，与脚本等价）

```bash
git remote add upstream https://github.com/Wei-Shaw/sub2api.git   # once
git fetch upstream --tags
git checkout feat/images-sync-via-async
git branch "backup/pre-rebase-$(date +%Y%m%d-%H%M%S)"
git rebase v0.1.161   # 或 upstream/main
# fix conflicts (usually only around gateway routes / NewAsyncImageHandler)
git push --force-with-lease origin HEAD
```

Then rebuild/deploy the Docker image from this fork.

### Deploy (example)

```bash
# 脚本已构建时直接用 tag；否则：
docker build -t sub2api:sync-via-async --build-arg VERSION=0.1.161-sync-via-async .
# point compose image to the custom tag, set images_sync_via_async: true
docker compose up -d app
```

## Headers (debug)

Successful sync-via-async responses may include:

- `X-Sub2API-Image-Mode: sync-via-async`
- `X-Sub2API-Image-Task-Id: imgtask_...`
