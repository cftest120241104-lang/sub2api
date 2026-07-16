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

### Rebase workflow

```bash
git remote add upstream https://github.com/Wei-Shaw/sub2api.git   # once
git fetch upstream
git checkout feat/images-sync-via-async   # or main with patch commits
git rebase upstream/main
# fix conflicts (usually only around gateway routes / NewAsyncImageHandler)
git push --force-with-lease origin HEAD
```

Then rebuild/deploy the Docker image from this fork.

### Deploy (example)

```bash
docker build -t sub2api:sync-via-async .
# point compose image to the custom tag, set images_sync_via_async: true
docker compose up -d app
```

## Headers (debug)

Successful sync-via-async responses may include:

- `X-Sub2API-Image-Mode: sync-via-async`
- `X-Sub2API-Image-Task-Id: imgtask_...`
