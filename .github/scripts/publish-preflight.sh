#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

HEAD_SHA="$(git rev-parse HEAD)"
SUMMARY_SHA="${GITHUB_SHA:-$HEAD_SHA}"
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-$TEMP_DIR/step-summary.md}"

escape_workflow_command() {
  local value="$1"
  value="${value//'%'/'%25'}"
  value="${value//$'\r'/'%0D'}"
  value="${value//$'\n'/'%0A'}"
  printf '%s' "$value"
}

report_error() {
  printf '::error::%s\n' "$(escape_workflow_command "$1")"
}

notice_value() {
  local label="$1"
  local log_file="$2"
  sed -n "s/^npm notice ${label}:[[:space:]]*//p" "$log_file" | tail -n 1
}

if [[ -n "${GITHUB_SHA:-}" && "$GITHUB_SHA" != "$HEAD_SHA" ]]; then
  report_error "체크아웃 SHA($HEAD_SHA)가 워크플로 SHA($GITHUB_SHA)와 다릅니다."
  exit 1
fi

failed=0
summary_rows=()

for workspace in tokens ui mcp; do
  package_name="$(node -p "require('./packages/${workspace}/package.json').name")"
  package_version="$(node -p "require('./packages/${workspace}/package.json').version")"
  log_file="$TEMP_DIR/${workspace}.log"

  echo "::group::${package_name} 게시 전 점검"
  if npm publish --workspace "packages/$workspace" --provenance --dry-run 2>&1 | tee "$log_file"; then
    pipeline_status=("${PIPESTATUS[@]}")
  else
    # 조건식 안의 파이프라인은 set -e의 즉시 종료 대상이 아니다. 두 종료 코드를
    # 곧바로 보존해 tee가 npm 실패를 0으로 덮지 못하게 한다.
    pipeline_status=("${PIPESTATUS[@]}")
  fi
  echo "::endgroup::"

  npm_status="${pipeline_status[0]}"
  tee_status="${pipeline_status[1]}"

  if (( npm_status != 0 )); then
    report_error "${package_name}: npm publish --dry-run 실패 (exit ${npm_status})"
    failed=1
  fi
  if (( tee_status != 0 )); then
    report_error "${package_name}: 점검 로그 저장 실패 (tee exit ${tee_status})"
    failed=1
  fi

  while IFS= read -r warning_line; do
    report_error "${package_name}: ${warning_line}"
    failed=1
  done < <(
    grep -F \
      -e 'auto-corrected some errors' \
      -e 'errors corrected' \
      -e 'was invalid and removed' \
      "$log_file" || true
  )

  if (( npm_status == 0 && tee_status == 0 )); then
    file_count="$(notice_value 'total files' "$log_file")"
    package_size="$(notice_value 'package size' "$log_file")"

    if [[ -z "$file_count" || -z "$package_size" ]]; then
      report_error "${package_name}: npm 출력에서 파일 수 또는 패키지 크기를 읽지 못했습니다."
      failed=1
    else
      summary_rows+=("| \`${package_name}\` | \`${package_version}\` | ${file_count} | ${package_size} |")
    fi
  fi
done

if (( failed != 0 )); then
  exit 1
fi

{
  echo '## 게시 전 점검'
  echo
  echo "커밋 SHA: \`${SUMMARY_SHA}\`"
  echo
  echo '| 패키지 | 버전 | 파일 수 | 패키지 크기 |'
  echo '| --- | ---: | ---: | ---: |'
  printf '%s\n' "${summary_rows[@]}"
} >> "$SUMMARY_FILE"

echo "::notice::세 패키지의 게시 전 점검을 통과했습니다."
