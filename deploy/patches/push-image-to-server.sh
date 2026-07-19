#!/usr/bin/env bash
# =============================================================================
# 开发机 → 韩国中转机：推送自建 sub2api 镜像并（可选）切换 compose
# =============================================================================
# 前置：开发机已用 rebase-and-build.sh 打好镜像，例如：
#   sub2api:0.1.161-sync-via-async
#   sub2api:sync-via-async
#
# 用法：
#   # 只传镜像（load 到服务器，不改运行中的容器）
#   ./deploy/patches/push-image-to-server.sh sub2api:0.1.161-sync-via-async
#
#   # 传镜像 + 在服务器 compose 目录 up -d（会重启中转，需确认路径）
#   ./deploy/patches/push-image-to-server.sh sub2api:0.1.161-sync-via-async \
#     --compose-dir /opt/sub2api-deploy --up
#
#   # 指定 SSH（默认 evoxt-kr，见 ~/.ssh/config）
#   SSH_HOST=evoxt-kr ./deploy/patches/push-image-to-server.sh sub2api:sync-via-async
#
# 环境变量：
#   SSH_HOST=evoxt-kr
#   SSH_OPTS=          额外 ssh 参数
#   REMOTE_TMP=/tmp    远程临时目录（流式 load 时不用落盘也可）
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SSH_HOST="${SSH_HOST:-evoxt-kr}"
SSH_OPTS="${SSH_OPTS:-}"
COMPOSE_DIR="${COMPOSE_DIR:-}"
DO_UP=0
DRY_RUN=0
ALSO_ALIAS=1
IMAGE_REF=""

usage() {
  awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
  exit "${1:-0}"
}

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --up) DO_UP=1; shift ;;
    --no-alias) ALSO_ALIAS=0; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --compose-dir=*) COMPOSE_DIR="${1#*=}"; shift ;;
    --compose-dir)
      [[ $# -ge 2 ]] || die "--compose-dir 需要路径"
      COMPOSE_DIR="$2"
      shift 2
      ;;
    --host=*) SSH_HOST="${1#*=}"; shift ;;
    --host)
      [[ $# -ge 2 ]] || die "--host 需要值"
      SSH_HOST="$2"
      shift 2
      ;;
    -*)
      die "未知参数: $1"
      ;;
    *)
      if [[ -z "${IMAGE_REF}" ]]; then
        IMAGE_REF="$1"
      else
        die "多余参数: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "${IMAGE_REF}" ]] || die "请传入镜像，例如: sub2api:0.1.161-sync-via-async"
command -v docker >/dev/null || die "开发机需要 docker"
command -v ssh >/dev/null || die "需要 ssh"
command -v gzip >/dev/null || die "需要 gzip"

if ! docker image inspect "${IMAGE_REF}" >/dev/null 2>&1; then
  die "本地没有镜像: ${IMAGE_REF}（先跑 ./deploy/patches/rebase-and-build.sh）"
fi

# 若传的是版本 tag，顺带带上 sync-via-async 别名（本地存在才推）
IMAGES=("${IMAGE_REF}")
if [[ "${ALSO_ALIAS}" -eq 1 ]]; then
  repo="${IMAGE_REF%%:*}"
  alias_tag="${repo}:sync-via-async"
  if [[ "${IMAGE_REF}" != "${alias_tag}" ]] && docker image inspect "${alias_tag}" >/dev/null 2>&1; then
    # 仅当 alias 与 primary 是同一镜像 ID 时才一起 save，避免误推旧 alias
    id_primary="$(docker image inspect -f '{{.Id}}' "${IMAGE_REF}")"
    id_alias="$(docker image inspect -f '{{.Id}}' "${alias_tag}")"
    if [[ "${id_primary}" == "${id_alias}" ]]; then
      IMAGES+=("${alias_tag}")
    else
      warn "本地 ${alias_tag} 与 ${IMAGE_REF} 不是同一镜像，跳过别名（避免覆盖服务器上的旧别名指向）"
    fi
  fi
fi

ssh_cmd() {
  # shellcheck disable=SC2086
  ssh ${SSH_OPTS} "${SSH_HOST}" "$@"
}

log "目标主机: ${SSH_HOST}"
log "推送镜像: ${IMAGES[*]}"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "[dry-run] docker save ${IMAGES[*]} | gzip | ssh ${SSH_HOST} docker load"
  if [[ "${DO_UP}" -eq 1 ]]; then
    log "[dry-run] 远程 compose up -d 于: ${COMPOSE_DIR:-<未指定>}"
  fi
  exit 0
fi

# 连通性
log "检测 SSH..."
ssh_cmd "docker version >/dev/null" || die "无法在 ${SSH_HOST} 上执行 docker（查 SSH/权限）"

log "流式传输: docker save | gzip | ssh docker load（不落本地大 tar，尽量省磁盘）"
# 远程 docker load 直接吃 gzip 流（Docker 支持 compressed tar）
docker save "${IMAGES[@]}" | gzip -1 | ssh_cmd "gzip -dc | docker load"

log "服务器镜像已加载:"
ssh_cmd "docker image ls --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}' | head -30" || true

if [[ "${DO_UP}" -eq 1 ]]; then
  [[ -n "${COMPOSE_DIR}" ]] || die "--up 需要 --compose-dir /path/on/server"
  log "远程 compose 目录: ${COMPOSE_DIR}"
  # 尽量兼容 docker compose / docker-compose
  ssh_cmd "set -e; cd '${COMPOSE_DIR}'; \
    if [ -f docker-compose.yml ] || [ -f compose.yml ] || [ -f docker-compose.yaml ]; then \
      if docker compose version >/dev/null 2>&1; then docker compose up -d; \
      elif command -v docker-compose >/dev/null 2>&1; then docker-compose up -d; \
      else echo 'no docker compose' >&2; exit 1; fi; \
    else echo 'compose file not found in ${COMPOSE_DIR}' >&2; exit 1; fi"
  log "已执行远程 up -d"
else
  cat <<EOF

镜像已在 ${SSH_HOST} 上就绪，但尚未切换运行中的中转。

请在服务器确认 compose 的 image 为:
  ${IMAGE_REF}
  或别名 sub2api:sync-via-async（若 compose 写的是别名）

然后任选：
  A) 本机一条命令切换（路径按现网改）:
     $0 ${IMAGE_REF} --compose-dir /你的/部署目录 --up

  B) SSH 上手动:
     ssh ${SSH_HOST}
     cd <compose目录>
     # 必要时改 .env / compose 的 image=
     docker compose up -d

验收:
  curl -sS https://token.happyai.icu/api/v1/settings/public | python3 -c \\
    'import sys,json; print(json.load(sys.stdin)["data"].get("version"))'

禁止: 管理后台「立即更新」（会丢异步生图定制）

EOF
fi

log "完成"
