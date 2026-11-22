#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFLIGHT="$SCRIPT_DIR/publish-preflight.sh"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

# 자식 bash가 실제 레지스트리에 접근하지 않도록 npm을 가짜 함수로 내보낸다.
npm() {
  local workspace=''
  local argument
  for argument in "$@"; do
    if [[ "$argument" == packages/* ]]; then
      workspace="${argument#packages/}"
      break
    fi
  done

  local package_name="@s2life/${workspace}"
  printf 'npm notice name: %s\n' "$package_name" >&2
  printf 'npm notice version: 0.4.0\n' >&2
  printf 'npm notice package size: 12.3 kB\n' >&2
  printf 'npm notice total files: 7\n' >&2

  if [[ "$FAKE_NPM_CASE" == warning && "$workspace" == mcp ]]; then
    printf 'npm warn publish npm auto-corrected some errors in your package.json when publishing.\n' >&2
    printf 'npm warn publish errors corrected:\n' >&2
    printf 'npm warn publish "bin[s2life-mcp]" script name server.mjs was invalid and removed\n' >&2
  fi

  if [[ "$FAKE_NPM_CASE" == npm-failure && "$workspace" == mcp ]]; then
    printf 'npm error 가짜 게시 실패\n' >&2
    return 42
  fi
}
export -f npm

run_case() {
  local case_name="$1"
  local expected_status="$2"
  local output_file="$TEMP_DIR/${case_name}.out"
  local summary_file="$TEMP_DIR/${case_name}.md"
  local actual_status

  if FAKE_NPM_CASE="$case_name" \
    GITHUB_SHA="$(git -C "$SCRIPT_DIR" rev-parse HEAD)" \
    GITHUB_STEP_SUMMARY="$summary_file" \
    "$PREFLIGHT" > "$output_file" 2>&1; then
    actual_status=0
  else
    actual_status=$?
  fi

  if (( actual_status != expected_status )); then
    printf 'FAIL %s: 예상 exit %s, 실제 exit %s\n' "$case_name" "$expected_status" "$actual_status" >&2
    sed -n '1,200p' "$output_file" >&2
    exit 1
  fi

  case "$case_name" in
    clean)
      grep -Fq '커밋 SHA:' "$summary_file"
      grep -Fq "| \`@s2life/tokens\` | \`0.4.0\` | 7 | 12.3 kB |" "$summary_file"
      grep -Fq "| \`@s2life/ui\` | \`0.4.0\` | 7 | 12.3 kB |" "$summary_file"
      grep -Fq "| \`@s2life/mcp\` | \`0.4.0\` | 7 | 12.3 kB |" "$summary_file"
      ;;
    warning)
      grep -Fq '::error::@s2life/mcp: npm warn publish npm auto-corrected some errors' "$output_file"
      grep -Fq '::error::@s2life/mcp: npm warn publish errors corrected:' "$output_file"
      grep -Fq '::error::@s2life/mcp: npm warn publish "bin[s2life-mcp]" script name server.mjs was invalid and removed' "$output_file"
      ;;
    npm-failure)
      grep -Fq '::error::@s2life/mcp: npm publish --dry-run 실패 (exit 42)' "$output_file"
      ;;
  esac

  printf 'PASS %-11s exit %s\n' "$case_name" "$actual_status"
}

run_case clean 0
run_case warning 1
run_case npm-failure 1
