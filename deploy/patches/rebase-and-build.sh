#!/usr/bin/env bash
# =============================================================================
# Fork 定制分支：跟官方 tag/分支 rebase + 自建 Docker 镜像
# =============================================================================
# 固化上次手搓流程（backup → fetch → rebase → build），保留 images_sync_via_async
# 等定制 commit，避免点管理后台「立即更新」冲掉 fork 补丁。
#
# 用法：
#   ./deploy/patches/rebase-and-build.sh                  # rebase 到 upstream 最新 tag
#   ./deploy/patches/rebase-and-build.sh v0.1.161         # 钉官方 tag
#   ./deploy/patches/rebase-and-build.sh upstream/main    # 跟 main
#   ./deploy/patches/rebase-and-build.sh v0.1.161 --push  # rebase 成功后 force-with-lease 推 fork
#   ./deploy/patches/rebase-and-build.sh v0.1.161 --no-build
#   ./deploy/patches/rebase-and-build.sh --build-only     # 不 rebase，只按当前 HEAD 构建
#
# 环境变量（可选）：
#   UPSTREAM_REMOTE=upstream
#   ORIGIN_REMOTE=origin
#   FEATURE_BRANCH=feat/images-sync-via-async
#   VERSION_SUFFIX=sync-via-async
#   IMAGE_NAME=sub2api
#   GOPROXY / GOSUMDB  传给 docker build
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
ORIGIN_REMOTE="${ORIGIN_REMOTE:-origin}"
FEATURE_BRANCH="${FEATURE_BRANCH:-feat/images-sync-via-async}"
VERSION_SUFFIX="${VERSION_SUFFIX:-sync-via-async}"
IMAGE_NAME="${IMAGE_NAME:-sub2api}"
# 韩国中转机 evoxt-kr 为 x86_64；开发机若是 arm64 Mac，必须交叉构建 amd64
PLATFORM="${PLATFORM:-linux/amd64}"
GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
GOSUMDB="${GOSUMDB:-sum.golang.google.cn}"
UPSTREAM_URL_DEFAULT="https://github.com/Wei-Shaw/sub2api.git"

DO_BUILD=1
DO_PUSH=0
BUILD_ONLY=0
ALLOW_DIRTY=0
TARGET_REF=""

usage() {
  # 只打印文件头注释块（到第一个非 # 行之前）
  awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
  exit "${1:-0}"
}

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --push) DO_PUSH=1; shift ;;
    --no-build) DO_BUILD=0; shift ;;
    --build-only) BUILD_ONLY=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --target=*) TARGET_REF="${1#*=}"; shift ;;
    --) shift; break ;;
    -*)
      die "未知参数: $1（用 --help 看用法）"
      ;;
    *)
      if [[ -z "${TARGET_REF}" ]]; then
        TARGET_REF="$1"
      else
        die "多余参数: $1"
      fi
      shift
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令: $1"
}

require_cmd git
if [[ "${DO_BUILD}" -eq 1 ]]; then
  require_cmd docker
fi

[[ -d "${REPO_ROOT}/.git" ]] || die "不是 git 仓库: ${REPO_ROOT}"

# --- dirty check ---
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "${ALLOW_DIRTY}" -eq 1 ]]; then
    warn "工作区不干净，已 --allow-dirty，继续（风险自负）"
  else
    die "工作区有未提交改动。请先 commit/stash，或加 --allow-dirty"
  fi
fi

ensure_upstream() {
  if ! git remote get-url "${UPSTREAM_REMOTE}" >/dev/null 2>&1; then
    log "添加 remote ${UPSTREAM_REMOTE} -> ${UPSTREAM_URL_DEFAULT}"
    git remote add "${UPSTREAM_REMOTE}" "${UPSTREAM_URL_DEFAULT}"
  fi
}

resolve_latest_upstream_tag() {
  # Prefer sorted version tags from upstream
  local tag
  tag="$(
    git tag -l 'v[0-9]*' --sort=-v:refname \
      | while read -r t; do
          # only tags that exist on upstream (reachable from upstream/main tip history or listed after fetch)
          if git rev-parse -q --verify "refs/tags/${t}" >/dev/null; then
            echo "${t}"
            break
          fi
        done
  )"
  if [[ -z "${tag}" ]]; then
    die "找不到 v* tag；请先 git fetch ${UPSTREAM_REMOTE} --tags"
  fi
  printf '%s\n' "${tag}"
}

normalize_target() {
  local ref="$1"
  if git rev-parse -q --verify "${ref}" >/dev/null 2>&1; then
    printf '%s\n' "${ref}"
    return 0
  fi
  # bare version -> vX.Y.Z
  if [[ "${ref}" =~ ^[0-9]+\.[0-9]+ ]]; then
    if git rev-parse -q --verify "v${ref}" >/dev/null 2>&1; then
      printf 'v%s\n' "${ref}"
      return 0
    fi
  fi
  if git rev-parse -q --verify "${UPSTREAM_REMOTE}/${ref}" >/dev/null 2>&1; then
    printf '%s/%s\n' "${UPSTREAM_REMOTE}" "${ref}"
    return 0
  fi
  die "无法解析目标 ref: ${ref}（试过 ${ref} / v${ref} / ${UPSTREAM_REMOTE}/${ref}）"
}

version_from_target() {
  local ref="$1"
  local ver=""
  # tag v0.1.161 -> 0.1.161
  if [[ "${ref}" =~ ^v?([0-9]+\.[0-9]+(\.[0-9]+)?([.-][0-9A-Za-z.+]+)*) ]]; then
    ver="${BASH_REMATCH[1]}"
    ver="${ver#v}"
  fi
  if [[ -z "${ver}" ]]; then
    # fallback: VERSION file after checkout/rebase
    if [[ -f backend/cmd/server/VERSION ]]; then
      ver="$(tr -d '[:space:]' < backend/cmd/server/VERSION)"
    fi
  fi
  if [[ -z "${ver}" ]]; then
    ver="dev"
  fi
  # strip accidental suffix duplication
  ver="${ver%-${VERSION_SUFFIX}}"
  printf '%s\n' "${ver}"
}

image_tags_for() {
  local full_ver="$1"
  # primary: sub2api:0.1.161-sync-via-async
  # also:    sub2api:sync-via-async (stable alias for compose)
  printf '%s\n' "${IMAGE_NAME}:${full_ver}" "${IMAGE_NAME}:${VERSION_SUFFIX}"
}

do_rebase() {
  ensure_upstream
  log "fetch ${UPSTREAM_REMOTE} --tags"
  git fetch "${UPSTREAM_REMOTE}" --tags --prune

  local current
  current="$(git branch --show-current || true)"
  if [[ "${current}" != "${FEATURE_BRANCH}" ]]; then
    log "checkout ${FEATURE_BRANCH}"
    git checkout "${FEATURE_BRANCH}"
  fi

  if [[ -z "${TARGET_REF}" ]]; then
    TARGET_REF="$(resolve_latest_upstream_tag)"
    log "未指定目标，使用最新 tag: ${TARGET_REF}"
  fi
  TARGET_REF="$(normalize_target "${TARGET_REF}")"
  log "rebase 目标: ${TARGET_REF}"

  local stamp backup
  stamp="$(date +%Y%m%d-%H%M%S)"
  backup="backup/pre-rebase-${TARGET_REF//\//-}-${stamp}"
  # sanitize backup name
  backup="$(printf '%s' "${backup}" | tr -c 'A-Za-z0-9._/-' '-')"
  log "创建备份分支: ${backup}"
  git branch "${backup}" HEAD

  local head_before
  head_before="$(git rev-parse HEAD)"

  log "git rebase ${TARGET_REF}"
  if ! git rebase "${TARGET_REF}"; then
    warn "rebase 冲突或失败。已中止 rebase，工作区回到 rebase 前。"
    git rebase --abort 2>/dev/null || true
    # HEAD should already be pre-rebase if abort worked; force restore if needed
    if [[ "$(git rev-parse HEAD)" != "${head_before}" ]]; then
      warn "强制复位到备份: ${backup}"
      git reset --hard "${backup}"
    fi
    cat >&2 <<EOF

如何手工解决（与上次相同）：
  git rebase ${TARGET_REF}
  # 冲突常见：gateway 路由 / image_task_handler / wire_gen.go
  # 解决后：
  git add -A
  git rebase --continue
  # 然后只构建：
  $0 --build-only

备份分支: ${backup}
EOF
    exit 2
  fi

  log "rebase 成功: $(git rev-parse --short HEAD)（备份 ${backup}）"
  export REBASE_BACKUP_BRANCH="${backup}"
  export REBASE_TARGET="${TARGET_REF}"
}

do_build() {
  local base_ver full_ver exact_tag file_ver

  # 版本优先级：显式 tag 目标 > 当前 exact tag > VERSION 文件 > describe
  base_ver=""
  if [[ "${TARGET_REF:-}" =~ ^v?([0-9]+\.[0-9]+(\.[0-9]+)?) ]]; then
    base_ver="${BASH_REMATCH[1]}"
  fi
  exact_tag="$(git describe --tags --exact-match --match 'v[0-9]*' 2>/dev/null || true)"
  if [[ -z "${base_ver}" && -n "${exact_tag}" ]]; then
    base_ver="${exact_tag#v}"
  fi
  if [[ -z "${base_ver}" && -f backend/cmd/server/VERSION ]]; then
    file_ver="$(tr -d '[:space:]' < backend/cmd/server/VERSION)"
    base_ver="${file_ver%-${VERSION_SUFFIX}}"
  fi
  if [[ -z "${base_ver}" ]]; then
    base_ver="$(version_from_target "${TARGET_REF:-}")"
  fi
  base_ver="${base_ver#v}"
  base_ver="${base_ver%-${VERSION_SUFFIX}}"

  full_ver="${base_ver}-${VERSION_SUFFIX}"
  local primary_tag="${IMAGE_NAME}:${full_ver}"
  local alias_tag="${IMAGE_NAME}:${VERSION_SUFFIX}"

  log "docker build VERSION=${full_ver}"
  log "镜像: ${primary_tag}  以及  ${alias_tag}"

  docker build \
    --platform "${PLATFORM}" \
    -t "${primary_tag}" \
    -t "${alias_tag}" \
    --build-arg "VERSION=${full_ver}" \
    --build-arg "COMMIT=$(git rev-parse --short HEAD)" \
    --build-arg "DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --build-arg "GOPROXY=${GOPROXY}" \
    --build-arg "GOSUMDB=${GOSUMDB}" \
    -f "${REPO_ROOT}/Dockerfile" \
    "${REPO_ROOT}"

  log "构建完成"
  docker image ls "${IMAGE_NAME}" --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}' | head -20 || true

  cat <<EOF

下一步（开发机构建 → 推韩国中转机）：
  # 只传镜像到 evoxt-kr（默认不重启中转）
  ./deploy/patches/push-image-to-server.sh ${primary_tag}

  # 传镜像并在服务器 compose 目录切换（路径按现网）
  ./deploy/patches/push-image-to-server.sh ${primary_tag} \\
    --compose-dir /path/on/server --up

  验收: curl -sS https://token.happyai.icu/api/v1/settings/public
  期望 version == ${full_ver}
  禁止点管理后台「立即更新」

EOF
  export BUILT_VERSION="${full_ver}"
  export BUILT_IMAGE="${primary_tag}"
}

do_push() {
  if ! git remote get-url "${ORIGIN_REMOTE}" >/dev/null 2>&1; then
    die "没有 remote ${ORIGIN_REMOTE}，无法 --push"
  fi
  log "git push --force-with-lease ${ORIGIN_REMOTE} ${FEATURE_BRANCH}"
  git push --force-with-lease "${ORIGIN_REMOTE}" "HEAD:refs/heads/${FEATURE_BRANCH}"
}

# --- main ---
log "仓库: ${REPO_ROOT}"
log "分支: ${FEATURE_BRANCH}（当前 $(git branch --show-current 2>/dev/null || echo detached)）"

if [[ "${BUILD_ONLY}" -eq 1 ]]; then
  log "模式: --build-only（跳过 rebase）"
  if [[ -z "${TARGET_REF}" ]]; then
    # best-effort version from VERSION file / describe
    TARGET_REF="$(git describe --tags --match 'v[0-9]*' 2>/dev/null || true)"
  fi
else
  do_rebase
fi

if [[ "${DO_PUSH}" -eq 1 ]]; then
  if [[ "${BUILD_ONLY}" -eq 1 ]]; then
    warn "--build-only 与 --push 同用：仍会推送当前分支"
  fi
  do_push
fi

if [[ "${DO_BUILD}" -eq 1 ]]; then
  do_build
else
  log "已 --no-build，跳过 docker build"
  log "仅构建: $0 --build-only"
fi

log "全部完成"
if [[ -n "${REBASE_BACKUP_BRANCH:-}" ]]; then
  log "备份分支保留: ${REBASE_BACKUP_BRANCH}"
fi
if [[ -n "${BUILT_IMAGE:-}" ]]; then
  log "镜像: ${BUILT_IMAGE}（version ${BUILT_VERSION}）"
fi
