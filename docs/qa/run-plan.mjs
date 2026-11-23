// run-all 의 실행 계획 — 하네스 목록, 인자 해석, 샤드 배분.
//
// 부작용이 없는 함수만 둔다(서버·브라우저·파일 쓰기 없음). run-all.mjs 는 import 하는 순간
// 서버를 띄우므로 단위 테스트(run-plan.test.mjs)는 이 파일만 부른다.
//
//   --only a,b       하네스 파일 이름(.mjs 있어도 없어도)으로 일부만. 모르는 이름이면 실패
//   --shard i/N      기준선 시간으로 N 등분한 것 중 i 번째(1부터). --only 와 같이 못 쓴다
//   --timings <json> 실행한 하네스마다 초·결과를 남긴다
//   --port <n>       정적 서버 포트. 기본 0 = OS 가 빈 포트를 준다. 차 있으면 즉시 실패
//   --jobs N         서버 하나에 브라우저 N개로 병렬 실행(기본 1)
//   --group g        storybook(정적 서버가 필요한 하네스) | node(필요 없는 것). --shard 는 그룹 안에서 나눈다
//   --build          스토리북을 다시 빌드한다
import { readFileSync } from 'node:fs';

// 순서가 곧 기본 실행 순서다. 샤드 안에서도 이 순서를 지킨다.
// 새 하네스는 여기에 넣는다. 기준선(timings/)에 없으면 중간값으로 배분된다.
export const HARNESSES = [
  ['steps-render-verify.mjs', '단계 표시·완료 이동·요약·폼 포커스'],
  ['pack-verify.mjs', 'tarball 배포 리허설'],
  ['render-verify.mjs', '기본 컴포넌트·테이블'],
  ['charts-render-verify.mjs', '차트 로딩·오류'],
  ['segmented-control-render-verify.mjs', '세그먼트·키보드·좁은 폭·대비'],
  ['stat-tile-render-verify.mjs', 'KPI 값·증감·접근성·좁은 폭'],
  ['description-list-render-verify.mjs', '설명 목록·두 열·세로형·합계·주문 상세'],
  ['dogfood3-render-verify.mjs', '필터 선택·기간 입력·중립 계열'],
  ['loading-render-verify.mjs', '스켈레톤·진행률'],
  ['state-render-verify.mjs', '상태·아바타·썸네일'],
  ['guide-render-verify.mjs', 'Tooltip·Hint·Tour'],
  ['form-render-verify.mjs', '폼·한글 IME'],
  ['date-time-render-verify.mjs', '날짜+시각·직접 입력·분 칸·키보드'],
  ['file-upload-render-verify.mjs', '파일 선택·검증·진행·미리보기·수명'],
  ['combobox-render-verify.mjs', '검색 선택·한글 IME'],
  ['multi-select-render-verify.mjs', '다중 선택·태그·키보드·IME'],
  ['collapse-render-verify.mjs', '접고 펴기·글 넘침·내용 변화'],
  ['media-viewer-render-verify.mjs', '미디어 팝업·플로팅·화면 속 화면'],
  ['carousel-render-verify.mjs', '캐러셀·네이티브 스냅·자동 넘김 정지'],
  ['pagination-render-verify.mjs', '페이지 이동·크기·포커스·표 조립'],
  ['sheet-render-verify.mjs', '옆 패널·닫기 보호·서랍'],
  ['app-shell-render-verify.mjs', '앱 셸·사이드 메뉴·페이지 머리'],
  ['input-consistency-render-verify.mjs', '검색 아이콘·카드·선택 트리거·공개 유틸리티'],
  ['input-render-verify.mjs', '입력 타입·Textarea·Radio·Switch'],
  ['input-unit-render-verify.mjs', '입력 단위 접미사·자리·낭독·복사·폭·같은 줄'],
  ['peek-render-verify.mjs', 'Peek·다녀온 행'],
  ['mcp-client-verify.mjs', 'MCP 서버'],
  ['list-screen-render-verify.mjs', '목록 필터·행 액션·알림'],
  ['layer-detail-render-verify.mjs', '레이어 디테일·O1–O6 라이트·다크'],
  ['design-detail-render-verify.mjs', '디자인 디테일·D1–D6'],
  ['detail-render-verify.mjs', '상세 탭·경로·편집·삭제 확인'],
  ['screens-render-verify.mjs', '대표 화면 목록·상세 D2·대시보드'],
  ['list-toolbar-render-verify.mjs', '목록 툴바 필터 바·일괄 작업 바 매트릭스'],
  ['form-row-render-verify.mjs', '같은 줄 정렬·등록 화면 F98·(b)'],
  ['form-summary-render-verify.mjs', '폼 하단 고정 줄·표 합계 행 매트릭스'],
  ['create-render-verify.mjs', '등록·Enter 계약·목록 왕복'],
  ['docs-render-verify.mjs', '사용 문서·매니페스트 일치'],
];

// 스토리북 정적 서버를 쓰지 않는 하네스. 이것만 고르면 빌드·서버를 건너뛴다.
// pack-verify 는 tarball 로 만든 자기 앱을 렌더하고, mcp-client-verify 는 브라우저가 없다.
export const NO_STORYBOOK = new Set(['pack-verify.mjs', 'mcp-client-verify.mjs']);

// --jobs 에서도 혼자 도는 하네스. pack-verify 는 pnpm build 로 packages/mcp/manifest.json·토큰 파일을
// 조건 없이 다시 써서, 같은 때 그것을 읽는 mcp-client·docs 하네스가 반쯤 쓴 파일을 볼 수 있다.
export const EXCLUSIVE = new Set(['pack-verify.mjs']);

// --group 의 분류. 따로 목록을 두지 않고 NO_STORYBOOK 하나로 정한다 — 두 곳을 맞추다 어긋나지 않게.
export const GROUPS = {
  storybook: ([file]) => !NO_STORYBOOK.has(file),
  node: ([file]) => NO_STORYBOOK.has(file),
};

// 샤드 배분 기준. 리눅스 CI 실측이어야 한다 — macOS 로컬은 하네스별 비율이 다르다.
// 갱신할 때는 CI 에서 --timings 로 받은 JSON(같은 모양)으로 바꾸고 이 경로를 고친다.
// 45초 타이머 수정(83ceeab) 뒤 DevOps 2샤드 run 의 --timings 두 개를 합친 것이다. ci-f172d30.json 은 수정 전 기록.
export const BASELINE_FILE = new URL('./timings/ci-734862c.json', import.meta.url);

export const harnessName = (file) => file.replace(/\.mjs$/, '');

export class UsageError extends Error {}

export const USAGE = `사용법: node docs/qa/run-all.mjs [--build] [--only a,b | --group g] [--shard i/N] [--port n] [--jobs N] [--timings <out.json>]
  --only a,b        이 하네스만 (파일 이름, .mjs 생략 가능)
  --shard i/N       기준선 시간으로 N 등분한 것 중 i 번째 (1 ≤ i ≤ N)
  --group g         storybook(정적 서버가 필요한 하네스) | node(pack·mcp 처럼 필요 없는 것). --shard 와 같이 쓰면 그룹 안에서 나눈다
  --timings <파일>   하네스마다 소요 시간(초)·결과를 JSON 으로 남긴다
  --port <n>        정적 서버 포트 (기본 0 = 빈 포트). 차 있으면 즉시 실패한다
  --jobs N          서버 하나에 브라우저 N개로 병렬 실행 (기본 1, 최대 16)
  --build           스토리북을 다시 빌드한다`;

const VALUE_FLAGS = new Set(['--only', '--shard', '--timings', '--port', '--jobs', '--group']);

/**
 * argv(process.argv.slice(2)) 를 해석한다. 틀리면 UsageError 를 던진다.
 * 오타(--shards)를 무시하면 샤드 4개가 전부를 4번 돌리므로 모르는 인자도 실패시킨다.
 */
export function parseArgs(argv, harnesses = HARNESSES) {
  const names = harnesses.map(([f]) => harnessName(f));
  const opts = { build: false, only: null, shard: null, timings: null, port: 0, jobs: 1, group: null };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue; // pnpm qa -- --only x 처럼 넘어오는 구분자
    if (arg === '--build') { opts.build = true; continue; }
    const eq = arg.indexOf('=');
    const flag = eq > 0 ? arg.slice(0, eq) : arg;
    if (!VALUE_FLAGS.has(flag)) throw new UsageError(`모르는 인자: ${arg}`);
    if (seen.has(flag)) throw new UsageError(`${flag} 를 두 번 줬습니다.`);
    seen.add(flag);
    let value;
    if (eq > 0) value = arg.slice(eq + 1);
    else {
      value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`${flag} 에 값이 없습니다.`);
      i++;
    }
    if (flag === '--only') opts.only = parseOnly(value, names);
    else if (flag === '--shard') opts.shard = parseShard(value);
    else if (flag === '--port') opts.port = parseInteger('--port', value, 0, 65535);
    else if (flag === '--jobs') opts.jobs = parseInteger('--jobs', value, 1, 16);
    else if (flag === '--group') {
      if (!Object.hasOwn(GROUPS, value)) throw new UsageError(`--group 은 ${Object.keys(GROUPS).join(' | ')} 중 하나입니다: "${value}"`);
      opts.group = value;
    }
    else {
      if (!value) throw new UsageError('--timings 에 파일 경로가 없습니다.');
      opts.timings = value;
    }
  }
  if (opts.only && opts.shard) throw new UsageError('--only 와 --shard 는 같이 쓸 수 없습니다.');
  if (opts.only && opts.group) throw new UsageError('--only 와 --group 은 같이 쓸 수 없습니다.');
  // 빈 샤드를 만들면 그 잡은 아무것도 안 돌리고 녹색이 된다. 그룹이 있으면 그룹 크기로 본다.
  if (opts.shard) {
    const count = opts.group ? harnesses.filter(GROUPS[opts.group]).length : names.length;
    if (opts.shard.total > count) {
      throw new UsageError(`--shard: 샤드 ${opts.shard.total}개가 하네스 ${count}개${opts.group ? `(--group ${opts.group})` : ''}보다 많습니다.`);
    }
  }
  return opts;
}

function parseInteger(flag, value, min, max) {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new UsageError(`${flag} 는 ${min}~${max} 정수여야 합니다: "${value}"`);
  }
  return Number(value);
}

function parseOnly(value, names) {
  const known = new Set(names);
  const picked = [];
  for (const raw of value.split(',')) {
    const name = harnessName(raw.trim());
    if (!name) throw new UsageError(`--only 에 빈 이름이 있습니다: "${value}"`);
    if (!known.has(name)) {
      throw new UsageError(`--only: 모르는 하네스 "${raw.trim()}"\n  알려진 이름: ${names.join(', ')}`);
    }
    if (!picked.includes(name)) picked.push(name);
  }
  return picked;
}

function parseShard(value) {
  const m = /^(\d+)\/(\d+)$/.exec(value);
  if (!m) throw new UsageError(`--shard 형식은 i/N 입니다(예: 1/4): "${value}"`);
  const index = Number(m[1]), total = Number(m[2]);
  if (total < 1) throw new UsageError(`--shard: N 은 1 이상이어야 합니다: "${value}"`);
  if (index < 1 || index > total) throw new UsageError(`--shard: i 는 1~${total} 이어야 합니다: "${value}"`);
  return { index, total };
}

/** 기준선 JSON → Map(이름 → 초). harnesses 값은 숫자이거나 { seconds } (run-all --timings 출력). */
export function readBaseline(json) {
  const out = new Map();
  for (const [key, v] of Object.entries(json?.harnesses ?? {})) {
    const s = typeof v === 'number' ? v : v?.seconds;
    if (Number.isFinite(s) && s >= 0) out.set(harnessName(key), s);
  }
  return out;
}

export const loadBaseline = (file = BASELINE_FILE) => readBaseline(JSON.parse(readFileSync(file, 'utf8')));

export function median(values) {
  if (!values.length) return 1;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * 하네스를 N 개 샤드로 나눈다. 가장 긴 것부터 지금 가장 가벼운 샤드에 넣는다(LPT).
 *  - 기준선에 없는 하네스는 기준선 중간값으로 친다.
 *  - 같은 입력이면 같은 배분: 시간이 같으면 이름순, 샤드 무게가 같으면 개수가 적은 쪽,
 *    그것도 같으면 번호가 작은 쪽. 개수를 보는 이유는 0초짜리가 한 샤드에 몰려
 *    다른 샤드가 비는 것을 막기 위해서다.
 *  - 샤드 안의 실행 순서는 names 순서(=HARNESSES 순서)를 따른다.
 * 반환: [{ names: [...], seconds, unknown: [...] }] — 길이 total.
 */
export function assignShards(names, baseline, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error(`샤드 수가 잘못됐습니다: ${total}`);
  if (total > names.length) throw new Error(`샤드 ${total}개가 하네스 ${names.length}개보다 많습니다.`);
  const fallback = median([...baseline.values()]);
  const order = new Map(names.map((n, i) => [n, i]));
  const items = names.map((name) => ({
    name, known: baseline.has(name), seconds: baseline.has(name) ? baseline.get(name) : fallback,
  }));
  items.sort((a, b) => b.seconds - a.seconds || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const shards = Array.from({ length: total }, () => ({ names: [], seconds: 0, unknown: [] }));
  for (const item of items) {
    let best = 0;
    for (let i = 1; i < total; i++) {
      const a = shards[i], b = shards[best];
      if (a.seconds < b.seconds || (a.seconds === b.seconds && a.names.length < b.names.length)) best = i;
    }
    shards[best].names.push(item.name);
    shards[best].seconds += item.seconds;
    if (!item.known) shards[best].unknown.push(item.name);
  }
  for (const s of shards) {
    s.names.sort((a, b) => order.get(a) - order.get(b));
    s.seconds = Math.round(s.seconds * 10) / 10;
  }
  return shards;
}

/**
 * 인자에 따라 돌릴 하네스를 고른다.
 * 반환: { harnesses: [[file, label]...], shard: {index,total,seconds,unknown,fallback} | null }
 */
export function selectHarnesses(opts, { harnesses: all = HARNESSES, baseline = null } = {}) {
  const harnesses = opts.group ? all.filter(GROUPS[opts.group]) : all;
  if (opts.only) {
    const want = new Set(opts.only);
    return { harnesses: harnesses.filter(([f]) => want.has(harnessName(f))), shard: null };
  }
  if (opts.shard) {
    const base = baseline ?? loadBaseline();
    const shards = assignShards(harnesses.map(([f]) => harnessName(f)), base, opts.shard.total);
    const mine = shards[opts.shard.index - 1];
    const want = new Set(mine.names);
    return {
      harnesses: harnesses.filter(([f]) => want.has(harnessName(f))),
      shard: { ...opts.shard, seconds: mine.seconds, unknown: mine.unknown, fallback: median([...base.values()]) },
    };
  }
  return { harnesses, shard: null };
}

/**
 * pre-push 에서 브라우저 하네스를 건너뛸 수 있는가. 바뀐 파일이 전부 .github/** 이면 true.
 * 워크플로만 고친 푸시는 하네스 결과를 바꾸지 않는다 — CI 가 그 워크플로로 어차피 돈다.
 * 빈 목록은 false(판단할 근거가 없으면 돈다).
 */
export const githubOnly = (files) => files.length > 0 && files.every((f) => f.startsWith('.github/'));
